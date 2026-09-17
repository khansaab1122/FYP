$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$faceService = Join-Path $root 'start-face-service.ps1'

function Test-PortListening([int]$port) {
  return $null -ne (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

if (-not (Test-PortListening 8001)) {
  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-File', $faceService
  ) -WorkingDirectory (Join-Path $root 'python_face_service') -WindowStyle Hidden
}

if (-not (Test-PortListening 3000)) {
  Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command', "Set-Location -LiteralPath '$root'; npm run dev"
  ) -WorkingDirectory $root -WindowStyle Hidden
}

Write-Host 'Web app: http://localhost:3000'
Write-Host 'Face service: http://127.0.0.1:8001'
Write-Host 'Both services are starting. Open the web address manually when ready.'
