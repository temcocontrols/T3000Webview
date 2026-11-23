<#
.SYNOPSIS
    End-to-end smoke test for the T3000 MCP server (the endpoint an external
    client such as Claude Desktop, Cursor or VS Code Copilot connects to).

.DESCRIPTION
    Walks the exact call sequence an MCP client performs over Streamable HTTP:

        1. POST   /api/mcp                    initialize            -> protocolVersion + Mcp-Session-Id
        2. POST   /api/mcp                    notifications/initialized -> 202 Accepted, empty body
        3. POST   /api/mcp                    tools/list            -> tool count, unique names, object schemas
        4. POST   /api/mcp                    tools/call t3000_ping  -> {"status":"ok"}
        5. POST   /api/mcp                    tools/call t3000_get_version -> toolCount matches tools/list
        6. POST   /api/mcp                    ping (protocol)       -> empty result
        7. POST   /api/mcp                    unknown method        -> error -32601
        8. GET    /api/mcp                    SSE handshake         -> event: endpoint
        9. GET    /api/mcp/current-device     device context        -> JSON
       10. DELETE /api/mcp                    session termination   -> 204

    Prints one PASS/FAIL line per step and exits non-zero if anything failed.

.PARAMETER BaseUrl
    API root. Default http://127.0.0.1:9103 (the port T3000's webview API listens on).

.PARAMETER SkipSessionDelete
    Leave the session open (useful while debugging a client).

.EXAMPLE
    .\scripts\mcp-smoke.ps1

.EXAMPLE
    .\scripts\mcp-smoke.ps1 -BaseUrl http://192.168.1.50:9103

.EXAMPLE
    .\scripts\mcp-smoke.ps1 -RealData
    Also calls the read-only tools (device_list, device_get_points, point_read,
    building_summary) and prints the real device/point values they return.
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://127.0.0.1:9103',
    [switch]$SkipSessionDelete,
    # Real-data checks: call the read-only tools and show what they return.
    [switch]$RealData,
    # Device used by the real-data checks (default: first device from t3000_device_list).
    [int]$SerialNumber = 0
)

$ErrorActionPreference = 'Stop'
$script:Failures = 0
$script:SessionId = $null
$script:ToolCount = 0
$script:RpcId = 0

function Write-Result {
    param([string]$Name, [bool]$Ok, [string]$Detail = '')
    if ($Ok) {
        Write-Host ("  PASS  {0,-42} {1}" -f $Name, $Detail) -ForegroundColor Green
    } else {
        Write-Host ("  FAIL  {0,-42} {1}" -f $Name, $Detail) -ForegroundColor Red
        $script:Failures++
    }
}

function Invoke-McpPost {
    param([string]$Body, [switch]$AllowError)

    $headers = @{ 'Accept' = 'application/json, text/event-stream' }
    if ($script:SessionId) { $headers['Mcp-Session-Id'] = $script:SessionId }

    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/mcp" -Method Post `
            -ContentType 'application/json' -Headers $headers -Body $Body -UseBasicParsing
        return [pscustomobject]@{ Status = [int]$response.StatusCode; Headers = $response.Headers; Body = $response.Content }
    } catch {
        if (-not $AllowError) { throw }
        $status = 0
        $content = ''
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $content = $reader.ReadToEnd()
        }
        return [pscustomobject]@{ Status = $status; Headers = @{}; Body = $content }
    }
}

function New-RpcRequest {
    param([string]$Method, $Params)
    $script:RpcId++
    $message = @{ jsonrpc = '2.0'; id = $script:RpcId; method = $Method }
    if ($null -ne $Params) { $message['params'] = $Params }
    return ($message | ConvertTo-Json -Depth 12 -Compress)
}

function Get-SessionHeader {
    param($Headers)
    foreach ($key in $Headers.Keys) {
        if ($key -eq 'mcp-session-id' -or $key -eq 'Mcp-Session-Id') { return [string]$Headers[$key] }
    }
    return $null
}

Write-Host ""
Write-Host "T3000 MCP smoke test -> $BaseUrl" -ForegroundColor Cyan
Write-Host ("-" * 78)

# ── 0. Server reachable ────────────────────────────────────────────────────────
$healthUrl = $null
foreach ($candidate in @("$BaseUrl/api/health", "$BaseUrl/health")) {
    try {
        $health = Invoke-WebRequest -Uri $candidate -TimeoutSec 5 -UseBasicParsing
        $healthUrl = $candidate
        Write-Result 'GET health' $true ("$candidate -> HTTP " + [int]$health.StatusCode)
        break
    } catch {
        $lastHealthError = $_.Exception.Message
    }
}
if (-not $healthUrl) {
    Write-Result 'GET health' $false $lastHealthError
    Write-Host ""
    Write-Host "T3000's webview API is not answering. Start T3000 first, then re-run." -ForegroundColor Yellow
    exit 1
}

# ── 1. initialize ──────────────────────────────────────────────────────────────
$initBody = New-RpcRequest 'initialize' @{
    protocolVersion = '2025-03-26'
    capabilities    = @{}
    clientInfo      = @{ name = 'mcp-smoke'; version = '1.0.0' }
}
try {
    $init = Invoke-McpPost -Body $initBody
    $initJson = $init.Body | ConvertFrom-Json
    $script:SessionId = Get-SessionHeader $init.Headers
    $ok = ($init.Status -eq 200) -and $script:SessionId -and $initJson.result.serverInfo.name
    Write-Result 'POST /api/mcp initialize' $ok ("protocolVersion=" + $initJson.result.protocolVersion + " server=" + $initJson.result.serverInfo.name)
} catch {
    Write-Result 'POST /api/mcp initialize' $false $_.Exception.Message
    Write-Host ""
    Write-Host "Cannot continue without a session." -ForegroundColor Yellow
    exit 1
}

# ── 2. notifications/initialized (must be 202, empty) ──────────────────────────
$notify = Invoke-McpPost -Body (@{ jsonrpc = '2.0'; method = 'notifications/initialized' } | ConvertTo-Json -Compress)
$ok = ($notify.Status -eq 202) -and ([string]::IsNullOrWhiteSpace($notify.Body))
Write-Result 'POST notifications/initialized -> 202' $ok ("HTTP " + $notify.Status)

# ── 3. tools/list ──────────────────────────────────────────────────────────────
$list = Invoke-McpPost -Body (New-RpcRequest 'tools/list' $null)
$listJson = $list.Body | ConvertFrom-Json
$tools = @($listJson.result.tools)
$script:ToolCount = $tools.Count
$unique = ($tools | Select-Object -ExpandProperty name -Unique).Count
$badSchema = @($tools | Where-Object { $_.inputSchema.type -ne 'object' }).Count
$ok = ($list.Status -eq 200) -and ($script:ToolCount -gt 0) -and ($unique -eq $script:ToolCount) -and ($badSchema -eq 0)
Write-Result 'POST tools/list' $ok ("$($script:ToolCount) tools, $unique unique, $badSchema bad schemas")

# ── 4. tools/call t3000_ping ───────────────────────────────────────────────────
$call = Invoke-McpPost -Body (New-RpcRequest 'tools/call' @{ name = 't3000_ping'; arguments = @{} })
$callJson = $call.Body | ConvertFrom-Json
$pingPayload = $callJson.result.content[0].text | ConvertFrom-Json
$ok = ($callJson.result.isError -ne $true) -and ($pingPayload.status -eq 'ok')
Write-Result 'POST tools/call t3000_ping' $ok ($pingPayload.status)

# ── 5. tools/call t3000_get_version ───────────────────────────────────────────
$ver = Invoke-McpPost -Body (New-RpcRequest 'tools/call' @{ name = 't3000_get_version'; arguments = @{} })
$verJson = $ver.Body | ConvertFrom-Json
$verPayload = $verJson.result.content[0].text | ConvertFrom-Json
$ok = ($verPayload.toolCount -eq $script:ToolCount)
Write-Result 'POST tools/call t3000_get_version' $ok ("toolCount=" + $verPayload.toolCount + " (tools/list said " + $script:ToolCount + ")")

# ── 6. protocol ping ──────────────────────────────────────────────────────────
$p = Invoke-McpPost -Body (New-RpcRequest 'ping' $null)
$pJson = $p.Body | ConvertFrom-Json
$ok = ($p.Status -eq 200) -and ($null -eq $pJson.error)
Write-Result 'POST ping (keepalive)' $ok ("HTTP " + $p.Status)

# ── 7. unknown method ─────────────────────────────────────────────────────────
$u = Invoke-McpPost -Body (New-RpcRequest 'resources/list' $null)
$uJson = $u.Body | ConvertFrom-Json
$ok = ($uJson.error.code -eq -32601)
Write-Result 'POST unknown method -> -32601' $ok ("code=" + $uJson.error.code)

# ── 8. SSE handshake ──────────────────────────────────────────────────────────
try {
    $sseHeaders = @{}
    if ($script:SessionId) { $sseHeaders['Mcp-Session-Id'] = $script:SessionId }
    $sse = Invoke-WebRequest -Uri "$BaseUrl/api/mcp" -Method Get -Headers $sseHeaders -UseBasicParsing -TimeoutSec 10
    $ok = ($sse.Content -match 'event:\s*endpoint')
    Write-Result 'GET /api/mcp (SSE)' $ok ([string]$sse.StatusCode)
} catch {
    Write-Result 'GET /api/mcp (SSE)' $false $_.Exception.Message
}

# ── 9. current-device ─────────────────────────────────────────────────────────
try {
    $dev = Invoke-WebRequest -Uri "$BaseUrl/api/mcp/current-device" -Method Get -UseBasicParsing -TimeoutSec 10
    $devJson = $dev.Content | ConvertFrom-Json
    $ok = ($dev.StatusCode -eq 200)
    Write-Result 'GET /api/mcp/current-device' $ok ("ui_device=" + $devJson.ui_device + " chat_device=" + $devJson.chat_device)
} catch {
    Write-Result 'GET /api/mcp/current-device' $false $_.Exception.Message
}

# ── 9b. Real data (optional, -RealData) ──────────────────────────────────────
if ($RealData) {
    Write-Host "  ----  real data through the tools  ----" -ForegroundColor DarkCyan

    # Device list — must return the devices T3000 knows about
    $devices = $null
    $devCall = Invoke-McpPost -Body (New-RpcRequest 'tools/call' @{ name = 't3000_device_list'; arguments = @{} })
    $devJson = $devCall.Body | ConvertFrom-Json
    $devPayload = $devJson.result.content[0].text | ConvertFrom-Json
    $devices = @($devPayload.devices)
    $ok = ($devJson.result.isError -ne $true) -and ($devices.Count -gt 0)
    Write-Result 'tools/call t3000_device_list' $ok ("$($devices.Count) device(s)")
    if ($ok) {
        foreach ($d in $devices) {
            Write-Host ("        serial={0,-8} name={1,-14} io={2}/{3} online={4}" -f $d.serial, $d.name, $d.input_count, $d.output_count, $d.is_online) -ForegroundColor DarkGray
        }
    }

    $serial = if ($SerialNumber) { [int]$SerialNumber } elseif ($devices.Count -gt 0) { [int]$devices[0].serial } else { $null }

    # Prefer an online device that actually has inputs — otherwise the point read
    # cannot return a value and the check is meaningless.
    $target = $devices | Where-Object { $_.is_online -and $_.input_count -gt 0 } | Select-Object -First 1
    if (-not $target) { $target = $devices | Where-Object { $_.input_count -gt 0 } | Select-Object -First 1 }
    if (-not $target -and $devices.Count -gt 0) { $target = $devices[0] }
    if (-not $SerialNumber -and $target) { $serial = [int]$target.serial }

    # Points for that device
    if ($serial) {
        $ptCall = Invoke-McpPost -Body (New-RpcRequest 'tools/call' @{ name = 't3000_device_get_points'; arguments = @{ serial_number = $serial } })
        $ptJson = $ptCall.Body | ConvertFrom-Json
        $ptPayload = $ptJson.result.content[0].text | ConvertFrom-Json
        $ok = ($ptJson.result.isError -ne $true) -and ($null -ne $ptPayload.total)
        Write-Result ('tools/call t3000_device_get_points ' + $serial) $ok ("total=" + $ptPayload.total)

        # Read the first input point that has a value (read-only)
        if (-not $target.is_online) {
            Write-Host ("  SKIP  {0,-42} {1}" -f "tools/call t3000_point_read $serial", "device $serial is offline — no live value to read") -ForegroundColor Yellow
        } else {
            $readOk = $false
            for ($i = 1; $i -le 8 -and -not $readOk; $i++) {
                $rdCall = Invoke-McpPost -Body (New-RpcRequest 'tools/call' @{
                    name = 't3000_point_read'
                    arguments = @{ serial_number = $serial; point_type = 'INPUT'; point_index = $i }
                })
                $rdJson = $rdCall.Body | ConvertFrom-Json
                $rdPayload = $rdJson.result.content[0].text | ConvertFrom-Json
                if ($null -ne $rdPayload.value -or $rdPayload.label) {
                    $readOk = $true
                    Write-Result ('tools/call t3000_point_read INPUT ' + $i) $true ("label='" + $rdPayload.label + "' value=" + $rdPayload.value + " " + $rdPayload.engineering_units)
                }
            }
            if (-not $readOk) {
                Write-Result ('tools/call t3000_point_read ' + $serial + ' INPUT 1..8') $false 'no input point returned a value'
            }
        }
    }

    # Building summary
    $sumCall = Invoke-McpPost -Body (New-RpcRequest 'tools/call' @{ name = 't3000_building_summary'; arguments = @{} })
    $sumJson = $sumCall.Body | ConvertFrom-Json
    $sumText = [string]$sumJson.result.content[0].text
    $ok = ($sumJson.result.isError -ne $true)
    Write-Result 'tools/call t3000_building_summary' $ok ($sumText.Substring(0, [Math]::Min(80, $sumText.Length)) -replace "`r?`n", ' ')
}

# ── 10. DELETE session ────────────────────────────────────────────────────────
if (-not $SkipSessionDelete -and $script:SessionId) {
    try {
        $del = Invoke-WebRequest -Uri "$BaseUrl/api/mcp" -Method Delete -Headers @{ 'Mcp-Session-Id' = $script:SessionId } -UseBasicParsing -TimeoutSec 10
        $ok = ([int]$del.StatusCode -eq 204)
        Write-Result 'DELETE /api/mcp (end session)' $ok ("HTTP " + [int]$del.StatusCode)
    } catch {
        Write-Result 'DELETE /api/mcp (end session)' $false $_.Exception.Message
    }
}

Write-Host ("-" * 78)
if ($script:Failures -eq 0) {
    Write-Host "ALL MCP ENDPOINTS OK ($($script:ToolCount) tools advertised)" -ForegroundColor Green
    exit 0
}
Write-Host "$($script:Failures) check(s) failed" -ForegroundColor Red
exit 1
