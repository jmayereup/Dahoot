import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load .env variables
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
        if (key && !key.startsWith('#')) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Check if port is already in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port, '127.0.0.1');
  });
}

async function start() {
  loadEnv();
  const pbPort = 8090;
  const pbRunning = await isPortInUse(pbPort);
  
  let pbProcess = null;

  if (pbRunning) {
    console.log(`\x1b[35m[Dahoot]\x1b[0m PocketBase is already running on port ${pbPort}.`);
  } else {
    console.log(`\x1b[35m[Dahoot]\x1b[0m PocketBase is not running. Starting PocketBase server...`);
    
    const pbExecutable = path.join(rootDir, 'pocketbase', 'pocketbase');
    pbProcess = spawn(pbExecutable, ['serve'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env
    });

    pbProcess.on('error', (err) => {
      console.error('\x1b[31m[Dahoot] Failed to start PocketBase:\x1b[0m', err);
    });

    // Wait half a second for PocketBase to bind to the port
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\x1b[35m[Dahoot]\x1b[0m Starting Vite development server...`);
  
  const isWindows = process.platform === 'win32';
  const viteCmd = isWindows ? 'npx.cmd' : 'npx';
  const viteProcess = spawn(viteCmd, ['vite'], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  const cleanup = () => {
    if (pbProcess) {
      console.log('\n\x1b[35m[Dahoot]\x1b[0m Stopping PocketBase server...');
      pbProcess.kill();
    }
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
