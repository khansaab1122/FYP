import { spawn, spawnSync, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const FACE_SERVICE_PORT = 8001;
const FACE_SERVICE_URL = `http://127.0.0.1:${FACE_SERVICE_PORT}`;

let faceProcess: ChildProcess | null = null;
let startupPromise: Promise<boolean> | null = null;

/**
 * Searches for a usable Python executable in virtual environments or system PATH.
 */
export function findPythonExecutable(): string {
  const cwd = process.cwd();
  const candidates = [
    // Virtual environment at workspace root
    path.resolve(cwd, '..', '.venv', 'Scripts', 'python.exe'),
    path.resolve(cwd, '.venv', 'Scripts', 'python.exe'),
    // Virtual environment inside python_face_service
    path.resolve(cwd, 'python_face_service', '.venv', 'Scripts', 'python.exe'),
    path.resolve(cwd, '..', 'Smart-Khata-AI', 'python_face_service', '.venv', 'Scripts', 'python.exe'),
    // Directory relative to this module
    path.resolve(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe'),
    path.resolve(__dirname, '..', 'python_face_service', '.venv', 'Scripts', 'python.exe'),
    // Linux/macOS venv candidates
    path.resolve(cwd, '..', '.venv', 'bin', 'python3'),
    path.resolve(cwd, '.venv', 'bin', 'python3'),
    path.resolve(cwd, 'python_face_service', '.venv', 'bin', 'python3'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to system Python
  return process.platform === 'win32' ? 'python.exe' : 'python3';
}

/**
 * Finds the directory containing python_face_service/app.py.
 */
export function findFaceServiceDir(): string {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, 'python_face_service'),
    path.resolve(cwd, '..', 'Smart-Khata-AI', 'python_face_service'),
    path.resolve(__dirname, '..', 'python_face_service'),
    path.resolve(__dirname, 'python_face_service'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'app.py'))) {
      return candidate;
    }
  }

  return path.resolve(cwd, 'python_face_service');
}

/**
 * Checks if the face recognition service is healthy and models are ready.
 */
export async function checkFaceServiceHealth(timeoutMs = 1500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${FACE_SERVICE_URL}/health`, { signal: controller.signal });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null) as { ok?: boolean; modelsReady?: boolean } | null;
    return !!(data && data.ok === true && data.modelsReady === true);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks if a port has a stale unresponsive process and clears it on Windows.
 */
function clearStalePort(port: number): void {
  if (process.platform !== 'win32') return;
  try {
    const output = spawnSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf-8' });
    if (!output.stdout) return;

    const lines = output.stdout.split('\n');
    for (const line of lines) {
      if (line.includes(`:${port}`) && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== `${process.pid}`) {
          console.log(`[Face Service] Stopping stale process (PID ${pid}) on port ${port}...`);
          spawnSync('taskkill', ['/pid', pid, '/T', '/F'], { stdio: 'ignore' });
        }
      }
    }
  } catch (err) {
    // Ignore port check failures
  }
}

/**
 * Ensures the Python face recognition service is running and ready.
 * If already healthy, returns true immediately.
 * Otherwise, launches uvicorn in the background and waits for it to report ready.
 */
export async function ensureFaceServiceRunning(): Promise<boolean> {
  // Already healthy?
  const alreadyHealthy = await checkFaceServiceHealth(1000);
  if (alreadyHealthy) {
    return true;
  }

  // If a startup attempt is already in progress, await it
  if (startupPromise) {
    return startupPromise;
  }

  startupPromise = (async () => {
    try {
      const pythonExe = findPythonExecutable();
      const serviceDir = findFaceServiceDir();

      console.log(`[Face Service] Auto-starting face recognition service...`);
      console.log(`[Face Service] Python executable: ${pythonExe}`);
      console.log(`[Face Service] Service directory:  ${serviceDir}`);

      // If port 8001 is held by an unresponsive process, clean it up
      clearStalePort(FACE_SERVICE_PORT);

      // Spawn uvicorn process
      faceProcess = spawn(
        pythonExe,
        ['-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', `${FACE_SERVICE_PORT}`],
        {
          cwd: serviceDir,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
          },
        }
      );

      faceProcess.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString().trim();
        if (text) {
          console.log(`[Face Service] ${text}`);
        }
      });

      faceProcess.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString().trim();
        if (text) {
          console.log(`[Face Service] ${text}`);
        }
      });

      faceProcess.on('error', (err) => {
        console.error(`[Face Service] Failed to spawn process:`, err);
        faceProcess = null;
      });

      faceProcess.on('exit', (code, signal) => {
        console.log(`[Face Service] Process exited (code=${code}, signal=${signal})`);
        faceProcess = null;
      });

      // Poll until /health reports ready (up to 20 attempts x 500ms = 10s)
      for (let attempt = 1; attempt <= 20; attempt++) {
        await new Promise((r) => setTimeout(r, 500));
        const ready = await checkFaceServiceHealth(800);
        if (ready) {
          console.log(`✅ [Face Service] Face recognition is active and ready on ${FACE_SERVICE_URL}`);
          return true;
        }
      }

      console.warn(`[Face Service] Health check timed out after 10 seconds.`);
      return false;
    } catch (error) {
      console.error(`[Face Service] Error starting face service:`, error);
      return false;
    } finally {
      startupPromise = null;
    }
  })();

  return startupPromise;
}

/**
 * Cleanly terminates the Python process when the Node server shuts down.
 */
export function stopFaceService(): void {
  if (faceProcess && faceProcess.pid) {
    const pid = faceProcess.pid;
    console.log(`[Face Service] Stopping face recognition process (PID ${pid})...`);
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', `${pid}`, '/T', '/F'], { stdio: 'ignore' });
      } else {
        faceProcess.kill('SIGTERM');
      }
    } catch {
      // Ignore cleanup error
    }
    faceProcess = null;
  }
}

// Register process exit listeners for automatic cleanup
process.on('SIGINT', () => {
  stopFaceService();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopFaceService();
  process.exit(0);
});

process.on('exit', () => {
  stopFaceService();
});
