$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot\python_face_service"
$workspacePython = Join-Path $PSScriptRoot '..\.venv\Scripts\python.exe'
if (Test-Path $workspacePython) {
  $python = (Resolve-Path $workspacePython).Path
} else {
  if (-not (Test-Path '.venv\Scripts\python.exe')) {
    python -m venv .venv
  }
  $python = (Resolve-Path '.venv\Scripts\python.exe').Path
}
& $python -m pip install -r requirements.txt
& $python download_models.py
& $python -m uvicorn app:app --host 127.0.0.1 --port 8001
