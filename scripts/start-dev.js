import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load .env variables
function loadEnv() {
  dotenv.config({ path: path.resolve(rootDir, '.env') });
}

// Kill process using a specific port
function killProcessOnPort(port) {
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = result.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); } catch {}
        }
      }
    } else {
      const result = execSync(`lsof -ti :${port}`, { encoding: 'utf8' });
      const pids = result.trim().split('\n').filter(Boolean);
      for (const pid of pids) {
        try { process.kill(parseInt(pid), 'SIGTERM'); } catch {}
      }
    }
  } catch {}
}

async function start() {
  loadEnv();
  const pbPort = 8090;
  const vitePort = 5173;

  // Kill any processes holding onto the ports
  killProcessOnPort(pbPort);
  killProcessOnPort(vitePort);

  console.log(`\x1b[35m[Dahoot]\x1b[0m Starting PocketBase server...`);
  
  // Check parent directory first, then fallback to local project pocketbase
  let pbDir = path.resolve(rootDir, '..', 'pocketbase');
  let pbExecutable = path.join(pbDir, 'pocketbase');
  let pbCwd = pbDir;

  if (!fs.existsSync(pbExecutable)) {
    pbDir = path.join(rootDir, 'pocketbase');
    pbExecutable = path.join(pbDir, 'pocketbase');
    pbCwd = rootDir;
  }
  
  const pbProcess = spawn(pbExecutable, ['serve'], {
    cwd: pbCwd,
    stdio: 'inherit',
    env: process.env
  });

  pbProcess.on('error', (err) => {
    console.error('\x1b[31m[Dahoot] Failed to start PocketBase:\x1b[0m', err);
  });

  // Wait half a second for PocketBase to bind to the port
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(`\x1b[35m[Dahoot]\x1b[0m Starting Vite development server...`);
  
  const isWindows = process.platform === 'win32';
  const viteCmd = isWindows ? 'npx.cmd' : 'npx';
  const viteProcess = spawn(viteCmd, ['vite'], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  const cleanup = () => {
    console.log('\n\x1b[35m[Dahoot]\x1b[0m Stopping servers...');
    pbProcess.kill();
    viteProcess.kill();
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  viteProcess.on('exit', (code) => {
    console.log(`\x1b[35m[Dahoot]\x1b[0m Vite dev server exited with code ${code}`);
    cleanup();
  });
}

start().catch((err) => {
  console.error('\x1b[31m[Dahoot] Startup error:\x1b[0m', err);
  process.exit(1);
});
