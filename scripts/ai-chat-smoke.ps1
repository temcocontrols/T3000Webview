<#
.SYNOPSIS
    Live end-to-end check of the T3000 AI chat with a real LLM endpoint.

.DESCRIPTION
    Drives the exact call the webview makes:

        POST /api/ai/chat   (SSE)   provider=local, model=<auto-detected>

    and asserts the full tool loop really works against live device data:

        status events  ->  tool_call t3000_device_list
                       ->  tool_result carrying real device records
                       ->  text_delta answer  ->  done

    Because the endpoint is a LAN address, a pass also proves the system proxy
    is bypassed for private LLM endpoints (the 502 Bad Gateway fix).

.PARAMETER Endpoint
    OpenAI-compatible base URL of the local model. Default http://192.168.1.22:1027/v1

.PARAMETER Model
    Model name. Default: auto-detected from <Endpoint>/models.

.PARAMETER Prompt
    Question sent to the model. Default asks for the device list.

.PARAMETER TimeoutSec
    Overall wait. A 30B model with 74 tools can take a few minutes.

.EXAMPLE
    .\scripts\ai-chat-smoke.ps1

.EXAMPLE
    .\scripts\ai-chat-smoke.ps1 -Endpoint http://127.0.0.1:1200/v1 -Prompt "How many devices are online?"
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://127.0.0.1:9103',
    [string]$Endpoint = 'http://192.168.1.22:1027/v1',
    [string]$Model = '',
    [string]$Prompt = 'List my T3000 devices. Use the t3000_device_list tool and tell me how many there are.',
    [int]$TimeoutSec = 1200
)

$ErrorActionPreference = 'Stop'
$script:Failures = 0

function Write-Result {
    param([string]$Name, [bool]$Ok, [string]$Detail = '')
    if ($Ok) {
        Write-Host ("  PASS  {0,-40} {1}" -f $Name, $Detail) -ForegroundColor Green
    } else {
        Write-Host ("  FAIL  {0,-40} {1}" -f $Name, $Detail) -ForegroundColor Red
        $script:Failures++
    }
}

Write-Host ""
Write-Host "T3000 AI chat smoke test" -ForegroundColor Cyan
Write-Host "  API      : $BaseUrl"
Write-Host "  LLM      : $Endpoint"
Write-Host ("-" * 78)

# ── 1. API reachable ─────────────────────────────────────────────────────────
$healthUrl = $null
foreach ($candidate in @("$BaseUrl/api/health", "$BaseUrl/health")) {
    try {
        $null = Invoke-WebRequest -Uri $candidate -TimeoutSec 5 -UseBasicParsing
        $healthUrl = $candidate
        break
    } catch {
        $lastHealthError = $_.Exception.Message
    }
}
if ($healthUrl) {
    Write-Result 'GET health' $true $healthUrl
} else {
    Write-Result 'GET health' $false $lastHealthError
    Write-Host "Start T3000 first." -ForegroundColor Yellow
    exit 1
}

# ── 2. LLM endpoint reachable and model name ────────────────────────────────
try {
    $models = Invoke-WebRequest -Uri "$Endpoint/models" -TimeoutSec 10 -UseBasicParsing
    $modelList = ($models.Content | ConvertFrom-Json).models
    if (-not $Model) {
        $first = @($modelList)[0]
        $Model = if ($first.id) { $first.id } elseif ($first.name) { $first.name } else { $first.model }
    }
    Write-Result 'GET <llm>/models' ([bool]$Model) ("model=" + $Model)
} catch {
    Write-Result 'GET <llm>/models' $false $_.Exception.Message
    Write-Host "The local model endpoint must be up before this test can pass." -ForegroundColor Yellow
    exit 1
}

# ── 3. Current AI settings (informational) ──────────────────────────────────
try {
    $settings = (Invoke-WebRequest -Uri "$BaseUrl/api/ai/settings" -TimeoutSec 10 -UseBasicParsing).Content
    Write-Host "  INFO  stored settings: $settings" -ForegroundColor DarkGray
} catch {
    Write-Host "  INFO  stored settings unavailable: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# ── 4. Chat request (SSE) ───────────────────────────────────────────────────
$body = @{
    provider = 'local'
    model    = $Model
    messages = @(@{ role = 'user'; content = $Prompt })
    settings = @{ endpoint = $Endpoint; api_key = $null }
} | ConvertTo-Json -Depth 8 -Compress

Write-Host "  ..    POST /api/ai/chat (streaming, up to ${TimeoutSec}s)" -ForegroundColor DarkGray
$started = Get-Date
try {
    $chat = Invoke-WebRequest -Uri "$BaseUrl/api/ai/chat" -Method Post -ContentType 'application/json' `
        -Body $body -UseBasicParsing -TimeoutSec $TimeoutSec
    $raw = $chat.Content
} catch {
    Write-Result 'POST /api/ai/chat' $false $_.Exception.Message
    Write-Host ""
    Write-Host "No stream returned — the model was never reached." -ForegroundColor Red
    exit 1
}
$elapsed = [int]((Get-Date) - $started).TotalSeconds

# ── 5. Parse the SSE frames ─────────────────────────────────────────────────
$events = New-Object System.Collections.ArrayList
foreach ($line in ($raw -split "`r?`n")) {
    if ($line -notmatch '^\s*data:\s*(.+)$') { continue }
    try {
        $null = $events.Add(($Matches[1] | ConvertFrom-Json))
    } catch {
        # partial / keepalive frame — ignore
    }
}

$errors = @($events | Where-Object { $_.event -eq 'error' })
$toolCalls = @($events | Where-Object { $_.event -eq 'tool_call' })
$toolResults = @($events | Where-Object { $_.event -eq 'tool_result' })
$statuses = @($events | Where-Object { $_.event -eq 'status' })
$deltas = @($events | Where-Object { $_.event -eq 'text_delta' })
$done = @($events | Where-Object { $_.event -eq 'done' })

Write-Result 'SSE stream parsed' ($events.Count -gt 0) ("$($events.Count) event(s) in ${elapsed}s")
Write-Result 'no error event' ($errors.Count -eq 0) $(if ($errors.Count) { $errors[0].data.message } else { '' })
Write-Result 'status events emitted' ($statuses.Count -gt 0) ("$($statuses.Count)")

$names = @($toolCalls | ForEach-Object { $_.data.name })
Write-Result 'model requested a tool' ($toolCalls.Count -gt 0) ($names -join ', ')
Write-Result 'used t3000_device_list' ($names -contains 't3000_device_list') ''

$deviceResult = @($toolResults | Where-Object { $_.data.result -match '"devices"' })
Write-Result 'tool_result carries device data' ($deviceResult.Count -gt 0) ($(if ($deviceResult.Count) { "$($deviceResult[0].data.result.Length) chars" } else { '' }))

$answer = ($deltas | ForEach-Object { $_.data.content }) -join ''
Write-Result 'final answer received' (-not [string]::IsNullOrWhiteSpace($answer) -and $done.Count -gt 0) ("$($answer.Length) chars")

# ── 6. Show what actually came back ─────────────────────────────────────────
Write-Host ("-" * 78)
if ($deviceResult.Count -gt 0) {
    $parsed = $deviceResult[0].data.result | ConvertFrom-Json
    Write-Host ("  Devices the model saw: " + $parsed.total) -ForegroundColor DarkCyan
    foreach ($d in @($parsed.devices)) {
        Write-Host ("    serial={0,-8} name={1,-14} online={2}" -f $d.serial, $d.name, $d.is_online) -ForegroundColor DarkGray
    }
}
if ($answer) {
    Write-Host ""
    Write-Host "  Model answer:" -ForegroundColor DarkCyan
    Write-Host ("    " + ($answer -replace "`r?`n", "`n    ")) -ForegroundColor Gray
}

Write-Host ("-" * 78)
if ($script:Failures -eq 0) {
    Write-Host "AI CHAT + TOOL LOOP OK (endpoint $Endpoint)" -ForegroundColor Green
    exit 0
}
Write-Host "$($script:Failures) check(s) failed" -ForegroundColor Red
exit 1
