<#
.SYNOPSIS
    Call ONE T3000 MCP API at a time and print exactly what comes back.

.DESCRIPTION
    Wraps the MCP endpoints so each verification is a single command:

      JSON-RPC   POST   /api/mcp                  -Method <name>   [-Tool <tool>] [-Arguments '<json>']
      REST       GET    /api/mcp/current-device   -Url /api/mcp/current-device
      REST       POST   /api/mcp/current-device   -Url ... -Http POST -Arguments '<json>'
      REST       DELETE /api/mcp                  -Url /api/mcp -Http DELETE [-SessionId <id>]

    Prints HTTP status, session id, response headers and a pretty-printed body.

.EXAMPLE
    .\scripts\mcp-call.ps1 -Method initialize

.EXAMPLE
    .\scripts\mcp-call.ps1 -Method tools/list

.EXAMPLE
    .\scripts\mcp-call.ps1 -Tool t3000_device_list

.EXAMPLE
    .\scripts\mcp-call.ps1 -Tool t3000_point_read -Arguments '{"serial_number":240488,"point_type":"INPUT","point_index":1}'

.EXAMPLE
    .\scripts\mcp-call.ps1 -Url /api/mcp/current-device -Http GET
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://127.0.0.1:9103',
    [string]$Method = 'initialize',
    [string]$Tool = '',
    [string]$Arguments = '{}',
    [string]$Url = '',
    [string]$Http = 'POST',
    [string]$SessionId = '',
    [switch]$Raw
)

$ErrorActionPreference = 'Stop'

function Show-Body {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) {
        Write-Host '  <empty body>' -ForegroundColor DarkGray
        return
    }
    if ($Raw) {
        Write-Host $Text
        return
    }
    try {
        ($Text | ConvertFrom-Json) | ConvertTo-Json -Depth 20
    } catch {
        Write-Host $Text
    }
}

$headers = @{ 'Accept' = 'application/json, text/event-stream' }
if ($SessionId) { $headers['Mcp-Session-Id'] = $SessionId }

# ── Plain HTTP endpoint (current-device / DELETE) ───────────────────────────
if ($Url) {
    Write-Host ""
    Write-Host "== $Http $BaseUrl$Url ==" -ForegroundColor Cyan
    $params = @{ Uri = "$BaseUrl$Url"; Method = $Http; Headers = @{ 'Accept' = 'application/json' }; UseBasicParsing = $true; TimeoutSec = 60 }
    if ($Http -eq 'POST' -or $Http -eq 'PUT') {
        $params['ContentType'] = 'application/json'
        $params['Body'] = $Arguments
    }
    if ($SessionId) { $params['Headers']['Mcp-Session-Id'] = $SessionId }
    try {
        $r = Invoke-WebRequest @params
        Write-Host ("HTTP {0}" -f [int]$r.StatusCode) -ForegroundColor Green
        Show-Body $r.Content
    } catch {
        if ($_.Exception.Response) { Write-Host ("HTTP {0}" -f [int]$_.Exception.Response.StatusCode) -ForegroundColor Red }
        else { Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red }
        exit 1
    }
    exit 0
}

# ── JSON-RPC over POST /api/mcp ─────────────────────────────────────────────
$message = @{ jsonrpc = '2.0'; id = 1; method = $Method }
if ($Tool) {
    $parsed = $Arguments | ConvertFrom-Json
    $message['method'] = 'tools/call'
    $message['params'] = @{ name = $Tool; arguments = $parsed }
} elseif ($Method -eq 'tools/call') {
    Write-Host 'Use -Tool <name> (and optionally -Arguments <json>) for tools/call.' -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host ("== POST $BaseUrl/api/mcp   method=" + $message['method'] + $(if ($Tool) { "  tool=$Tool" } else { '' })) -ForegroundColor Cyan

$body = $message | ConvertTo-Json -Depth 12 -Compress
try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/mcp" -Method Post -ContentType 'application/json' `
        -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 120
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host ("HTTP {0}: {1}" -f [int]$_.Exception.Response.StatusCode, $reader.ReadToEnd()) -ForegroundColor Red
    }
    exit 1
}

$sid = $null
foreach ($k in $r.Headers.Keys) { if ($k -like '*session-id*') { $sid = [string]$r.Headers[$k] } }
Write-Host ("HTTP {0}   session={1}   bytes={2}" -f [int]$r.StatusCode, $(if ($sid) { $sid } else { '<none>' }), $r.Content.Length) -ForegroundColor Green

$json = $null
try { $json = $r.Content | ConvertFrom-Json } catch { }

if ($json -and $json.PSObject.Properties.Name -contains 'error') {
    Write-Host ("JSON-RPC ERROR {0}: {1}" -f $json.error.code, $json.error.message) -ForegroundColor Red
    exit 1
}
if ($json -and $json.result -and $json.result.PSObject.Properties.Name -contains 'isError' -and $json.result.isError) {
    Write-Host 'TOOL ERROR:' -ForegroundColor Red
    Write-Host $json.result.content[0].text
    exit 1
}
if ($json -and $json.result -and $json.result.PSObject.Properties.Name -contains 'content') {
    # tools/call — the payload is text content (usually JSON)
    Write-Host 'TOOL RESULT:' -ForegroundColor DarkCyan
    Show-Body $json.result.content[0].text
    exit 0
}

Show-Body $r.Content
exit 0
