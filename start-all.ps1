$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$faceService = Join-Path $root 'start-face-service.ps1'

function Test-PortListening([int]$port) {
  return $null -ne (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Stop-PortProcess([int]$port) {
  $pids = @(Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique)

  if (-not $pids -or $pids.Count -eq 0) {
    return $false
  }

  foreach ($processId in $pids) {
    if (-not $processId) { continue }

    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "Stopped stale process $processId using port $port."
    } catch {
      Write-Warning "Could not stop process $processId on port $port."
    }
  }

  return $true
}

if (Test-PortListening 8001) { Stop-PortProcess 8001 }
if (Test-PortListening 3000) { Stop-PortProcess 3000 }
Start-Sleep -Seconds 1
if (Test-PortListening 8001) {
  $pids = @(Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
  throw "Port 8001 is still in use by PID(s): $($pids -join ', '). Close the conflicting process before starting the face service."
}

if (-not (Test-PortListening 8001)) {
  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-File', $faceService
  ) -WorkingDirectory (Join-Path $root 'python_face_service') -WindowStyle Hidden
}

$faceReady = $false
for ($attempt = 1; $attempt -le 60; $attempt++) {
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/health' -TimeoutSec 2
    if ($health.ok -eq $true -and $health.modelsReady -eq $true) {
      $faceReady = $true
      break
    }
  } catch {
    # The service may still be installing dependencies or loading models.
  }
  Start-Sleep -Seconds 1
}

if (-not $faceReady) {
  throw 'Face recognition service did not become ready on http://127.0.0.1:8001. Run .\start-face-service.ps1 directly to view the startup error.'
}

if (-not (Test-PortListening 3000)) {
  Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command', "Set-Location -LiteralPath '$root'; npm run dev:web"
  ) -WorkingDirectory $root -WindowStyle Normal
}

Write-Host 'Web app: http://localhost:3000'
Write-Host 'Face service: http://127.0.0.1:8001'
Write-Host 'Both services are starting. Open the web address manually when ready.'
