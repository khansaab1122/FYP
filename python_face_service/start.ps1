$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

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
Start-Sleep -Seconds 1
if (Test-PortListening 8001) {
  $pids = @(Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique)
  throw "Port 8001 is still in use by PID(s): $($pids -join ', '). Close the conflicting process before starting the face service."
}

$workspacePython = Join-Path $PSScriptRoot '..\.venv\Scripts\python.exe'
if (Test-Path $workspacePython) {
  $python = (Resolve-Path $workspacePython).Path
} else {
  if (-not (Test-Path '.venv\Scripts\python.exe')) {
    python -m venv .venv
  }
  $python = (Resolve-Path '.venv\Scripts\python.exe').Path
}
& $python -m pip install --upgrade pip
& $python -m pip install -r requirements.txt
& $python download_models.py
& $python -m uvicorn app:app --host 127.0.0.1 --port 8001
