[CmdletBinding()]
param(
  [string]$Hostname = 'wiki.three-quarters.net',
  [string]$Address = '127.0.0.1'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$hostsPath = Join-Path $env:WINDIR 'System32\drivers\etc\hosts'
$entry = "$Address $Hostname"
$pattern = "^[\s]*$([regex]::Escape($Address))[\s]+$([regex]::Escape($Hostname))([\s]|$)"

$existing = Get-Content -LiteralPath $hostsPath -ErrorAction Stop

if (-not ($existing | Select-String -Pattern $pattern -Quiet)) {
  Add-Content -LiteralPath $hostsPath -Value "`r`n$entry"
}

Get-Content -LiteralPath $hostsPath | Select-String -Pattern ([regex]::Escape($Hostname))
