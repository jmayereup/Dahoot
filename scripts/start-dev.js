import { spawn, execSync, execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

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
        try { process.kill(parseInt(pid, 10), 'SIGTERM'); } catch {}
      }
    }
  } catch {}
}

function getPortFromUrl(url, fallback) {
  try {
    const parsed = new URL(url);
    if (parsed.port) return parseInt(parsed.port, 10);
    return parsed.protocol === 'https:' ? 443 : 80;
  } catch {
    return fallback;
  }
}

async function askTarget(localUrl, liveUrl) {
  const args = process.argv.slice(2);
  if (args.includes('--live') || args.includes('--prod')) {
    return 'live';
  }
  if (args.includes('--local') || args.includes('--dev')) {
    return 'local';
  }

  if (!process.stdin.isTTY) {
    return 'local';
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const liveLabel = liveUrl || 'not configured in .env';
  const answer = await new Promise((resolve) => {
    rl.question(
      `\nSelect PocketBase server for dev:\n  [1] Local (${localUrl})\n  [2] Live  (${liveLabel})\nChoice [1]: `,
      (input) => {
        rl.close();
        resolve(input.trim().toLowerCase());
      }
    );
  });

  if (answer === '2' || answer === 'live' || answer === 'prod') {
    return 'live';
  }
  return 'local';
}

async function waitForPocketBase(pbUrl, timeoutMs = 10000) {
  const healthUrl = `${pbUrl.replace(/\/$/, '')}/api/health`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

function upsertSuperuser(pbExecutable, pbDataDir, pbCwd, adminEmail, adminPassword) {
  if (!adminEmail || !adminPassword) {
    console.warn('\x1b[33m[Dahoot] Skipping superuser upsert: POCKETBASE_ADMIN_EMAIL or POCKETBASE_ADMIN_PASSWORD not set in .env\x1b[0m');
    return;
  }

  try {
    execFileSync(
      pbExecutable,
      ['superuser', 'upsert', adminEmail, adminPassword, '--automigrate=false', `--dir=${pbDataDir}`],
      { cwd: pbCwd, stdio: 'pipe' }
    );
    console.log(`\x1b[32m[Dahoot]\x1b[0m Upserted local superuser account: ${adminEmail}`);
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    console.error(`\x1b[31m[Dahoot] Failed to upsert superuser (${adminEmail}):\x1b[0m ${stderr}`);
  }
}

async function upsertDevUser(pbUrl, adminEmail, adminPassword, userEmail, userPassword) {
  if (!userEmail || !userPassword) {
    console.warn('\x1b[33m[Dahoot] Skipping user upsert: POCKETBASE_EMAIL or POCKETBASE_PASSWORD not set in .env\x1b[0m');
    return;
  }
  if (!adminEmail || !adminPassword) {
    console.warn('\x1b[33m[Dahoot] Skipping user upsert: superuser credentials not set in .env\x1b[0m');
    return;
  }

  const pb = new PocketBase(pbUrl);
  pb.autoCancellation(false);

  try {
    try {
      await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    } catch {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
    }

    let hasUserInfoCollection = false;
    try {
      await pb.collections.getOne('dahoot_user_info');
      hasUserInfoCollection = true;
    } catch {}

    let existingUser = null;
    try {
      existingUser = await pb.collection('users').getFirstListItem(
        pb.filter('email = {:email}', { email: userEmail })
      );
    } catch (err) {
      if (err?.status !== 404) {
        throw err;
      }
    }

    if (existingUser) {
      const updatePayload = {
        password: userPassword,
        passwordConfirm: userPassword,
        verified: true,
      };

      if (hasUserInfoCollection && !existingUser.dahoot_info) {
        const userInfoRecord = await pb.collection('dahoot_user_info').create({ role: 'ADMIN' });
        updatePayload.dahoot_info = userInfoRecord.id;
      }

      await pb.collection('users').update(existingUser.id, updatePayload);
      console.log(`\x1b[32m[Dahoot]\x1b[0m Updated local user account password: ${userEmail}`);
    } else {
      const createPayload = {
        email: userEmail,
        password: userPassword,
        passwordConfirm: userPassword,
        emailVisibility: true,
        verified: true,
      };

      if (hasUserInfoCollection) {
        const userInfoRecord = await pb.collection('dahoot_user_info').create({ role: 'ADMIN' });
        createPayload.dahoot_info = userInfoRecord.id;
      }

      await pb.collection('users').create(createPayload);
      console.log(`\x1b[32m[Dahoot]\x1b[0m Created local user account: ${userEmail}`);
    }
  } catch (err) {
    console.error(`\x1b[31m[Dahoot] Failed to upsert dev user (${userEmail}):\x1b[0m`, err?.response || err.message);
  }
}

async function start() {
  loadEnv();

  const localUrl = process.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
  const liveUrl = process.env.VITE_POCKETBASE_LIVE_URL;
  const target = await askTarget(localUrl, liveUrl);
  const useLocal = target === 'local';

  if (!useLocal && !liveUrl) {
    console.error('\x1b[31m[Dahoot] Error: VITE_POCKETBASE_LIVE_URL is not set in .env\x1b[0m');
    process.exit(1);
  }

  const selectedPbUrl = useLocal ? localUrl : liveUrl;
  const vitePort = 5173;

  // Kill any process holding onto the Vite port
  killProcessOnPort(vitePort);

  let pbProcess = null;

  if (useLocal) {
    const pbPort = getPortFromUrl(localUrl, 8090);
    killProcessOnPort(pbPort);

    const pbBinName = process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase';
    // Check parent directory first, then fallback to local project pocketbase
    let pbDir = path.resolve(rootDir, '..', 'pocketbase');
    let pbExecutable = path.join(pbDir, pbBinName);
    let pbCwd = pbDir;

    if (!fs.existsSync(pbExecutable)) {
      pbDir = path.join(rootDir, 'pocketbase');
      pbExecutable = path.join(pbDir, pbBinName);
      pbCwd = rootDir;
    }

    if (!fs.existsSync(pbExecutable)) {
      console.error(`\x1b[31m[Dahoot] PocketBase binary not found at ${pbExecutable}. Run "npm run db:install" first.\x1b[0m`);
      process.exit(1);
    }

    const pbDataDir = path.join(pbDir, 'pb_data');
    const adminEmail = process.env.POCKETBASE_DEV_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_DEV_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
    const userEmail = process.env.POCKETBASE_EMAIL;
    const userPassword = process.env.POCKETBASE_PASSWORD;

    upsertSuperuser(pbExecutable, pbDataDir, pbCwd, adminEmail, adminPassword);

    console.log(`\x1b[35m[Dahoot]\x1b[0m Starting local PocketBase server (${localUrl})...`);
    pbProcess = spawn(pbExecutable, ['serve', '--automigrate=false', `--dir=${pbDataDir}`], {
      cwd: pbCwd,
      stdio: 'inherit',
      env: process.env,
    });

    pbProcess.on('error', (err) => {
      console.error('\x1b[31m[Dahoot] Failed to start PocketBase:\x1b[0m', err);
    });

    const isReady = await waitForPocketBase(localUrl);
    if (isReady) {
      await upsertDevUser(localUrl, adminEmail, adminPassword, userEmail, userPassword);
    } else {
      console.warn('\x1b[33m[Dahoot] Timed out waiting for PocketBase health check; skipping user upsert.\x1b[0m');
    }
  } else {
    console.log(`\x1b[35m[Dahoot]\x1b[0m Using LIVE PocketBase server: ${liveUrl}`);
  }

  console.log(`\x1b[35m[Dahoot]\x1b[0m Starting Vite development server...`);

  const extraViteArgs = process.argv
    .slice(2)
    .filter((arg) => !['--live', '--prod', '--local', '--dev'].includes(arg));

  const isWindows = process.platform === 'win32';
  const viteCmd = isWindows ? 'npx.cmd' : 'npx';
  const viteProcess = spawn(viteCmd, ['vite', ...extraViteArgs], {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_POCKETBASE_URL: selectedPbUrl,
    },
  });

  let cleaningUp = false;
  const cleanup = () => {
    if (cleaningUp) return;
    cleaningUp = true;
    console.log('\n\x1b[35m[Dahoot]\x1b[0m Stopping servers...');
    if (pbProcess && !pbProcess.killed) pbProcess.kill();
    if (viteProcess && !viteProcess.killed) viteProcess.kill();
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
