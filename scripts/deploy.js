import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFileSync, spawn } from 'child_process';
import PocketBase from 'pocketbase';
import net from 'net';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load .env variables
function loadEnv() {
  dotenv.config({ path: path.resolve(rootDir, '.env') });
  return process.env;
}

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

function getPortFromUrl(urlStr, defaultPort = 8090) {
  try {
    const parsed = new URL(urlStr);
    return parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
  } catch (err) {
    const match = urlStr.match(/:(\d+)/);
    return match ? parseInt(match[1], 10) : defaultPort;
  }
}

async function ensureDevDbRunning(devUrl) {
  const isLocal = devUrl.includes('localhost') || devUrl.includes('127.0.0.1');
  if (!isLocal) return;

  const port = getPortFromUrl(devUrl);
  const running = await isPortInUse(port);
  if (running) {
    console.log(`\x1b[35m[Dahoot Deploy]\x1b[0m Dev PocketBase is already running on port ${port}.`);
    return;
  }

  console.log(`\x1b[35m[Dahoot Deploy]\x1b[0m Dev PocketBase is not running. Starting in the background...`);
  const pbExecutable = path.join(rootDir, 'pocketbase', 'pocketbase');

  const logFile = path.join(rootDir, 'pocketbase_dev.log');
  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  const child = spawn(pbExecutable, ['serve', `--http=127.0.0.1:${port}`], {
    cwd: rootDir,
    detached: true,
    stdio: ['ignore', out, err]
  });

  child.unref();

  console.log(`\x1b[35m[Dahoot Deploy]\x1b[0m Waiting for Dev PocketBase to bind to port ${port}...`);
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (await isPortInUse(port)) {
      console.log(`\x1b[32m[Dahoot Deploy] Dev PocketBase started successfully in the background.\x1b[0m`);
      return;
    }
  }
  console.warn(`\x1b[33m[Dahoot Deploy] Warning: Dev PocketBase took too long to start. Attempting to proceed anyway...\x1b[0m`);
}

async function compareSchemas(env) {
  const devUrl = env.VITE_POCKETBASE_DEV_URL || env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
  
  // Ensure the dev database is running if it is local
  await ensureDevDbRunning(devUrl);

  const devEmail = env.POCKETBASE_DEV_ADMIN_EMAIL || env.POCKETBASE_ADMIN_EMAIL;
  const devPassword = env.POCKETBASE_DEV_ADMIN_PASSWORD || env.POCKETBASE_ADMIN_PASSWORD;

  const liveUrl = env.VITE_POCKETBASE_LIVE_URL;
  const liveEmail = env.POCKETBASE_ADMIN_EMAIL;
  const livePassword = env.POCKETBASE_ADMIN_PASSWORD;

  if (!liveUrl) {
    console.error('\x1b[31m[Dahoot Deploy] Error: VITE_POCKETBASE_LIVE_URL is not set in .env.\x1b[0m');
    process.exit(1);
  }

  if (!devEmail || !devPassword) {
    console.error('\x1b[31m[Dahoot Deploy] Error: Dev PocketBase credentials must be defined in .env.\x1b[0m');
    process.exit(1);
  }

  if (!liveEmail || !livePassword) {
    console.error('\x1b[31m[Dahoot Deploy] Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be defined in .env.\x1b[0m');
    process.exit(1);
  }

  console.log('\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mChecking database schemas consistency...\x1b[0m');
  console.log(`  Dev DB:  ${devUrl}`);
  console.log(`  Live DB: ${liveUrl}`);

  const pbDev = new PocketBase(devUrl);
  const pbLive = new PocketBase(liveUrl);

  // Authenticate Dev
  try {
    try {
      await pbDev.collection('_superusers').authWithPassword(devEmail, devPassword);
    } catch {
      await pbDev.admins.authWithPassword(devEmail, devPassword);
    }
  } catch (err) {
    console.error(`\x1b[31m[Dahoot Deploy] Failed to authenticate on Dev DB (${devUrl}):\x1b[0m ${err.message}`);
    process.exit(1);
  }

  // Authenticate Live
  try {
    try {
      await pbLive.collection('_superusers').authWithPassword(liveEmail, livePassword);
    } catch {
      await pbLive.admins.authWithPassword(liveEmail, livePassword);
    }
  } catch (err) {
    console.error(`\x1b[31m[Dahoot Deploy] Failed to authenticate on Live DB (${liveUrl}):\x1b[0m ${err.message}`);
    process.exit(1);
  }

  // Get collections
  let devCollections, liveCollections;
  try {
    devCollections = await pbDev.collections.getFullList();
  } catch (err) {
    console.error(`\x1b[31m[Dahoot Deploy] Failed to fetch collections from Dev DB:\x1b[0m ${err.message}`);
    process.exit(1);
  }

  try {
    liveCollections = await pbLive.collections.getFullList();
  } catch (err) {
    console.error(`\x1b[31m[Dahoot Deploy] Failed to fetch collections from Live DB:\x1b[0m ${err.message}`);
    process.exit(1);
  }

  const devDahootCols = devCollections.filter(c => c.name.startsWith('dahoot_'));
  const liveDahootCols = liveCollections.filter(c => c.name.startsWith('dahoot_'));

  const differences = [];

  // Helper to normalize/clean up field for comparison
  const getFieldFingerprint = (f) => {
    // Only compare essential attributes like name, type, required, and values (for select)
    const print = {
      name: f.name,
      type: f.type,
      required: !!f.required
    };
    if (f.type === 'select') {
      print.values = (f.values || []).slice().sort();
    }
    return JSON.stringify(print);
  };

  // Compare Dev collections to Live collections
  for (const devCol of devDahootCols) {
    const liveCol = liveDahootCols.find(c => c.name === devCol.name);
    if (!liveCol) {
      differences.push(`Collection '${devCol.name}' exists in Dev DB but is missing in Live DB.`);
      continue;
    }

    const devFields = devCol.fields || [];
    const liveFields = liveCol.fields || [];

    // Check for missing/mismatched fields in Live
    for (const devF of devFields) {
      const liveF = liveFields.find(f => f.name === devF.name);
      if (!liveF) {
        differences.push(`Collection '${devCol.name}': field '${devF.name}' exists in Dev DB but is missing in Live DB.`);
        continue;
      }

      if (getFieldFingerprint(devF) !== getFieldFingerprint(liveF)) {
        differences.push(
          `Collection '${devCol.name}', field '${devF.name}' configuration mismatch.\n` +
          `    Dev:  ${JSON.stringify(devF)}\n` +
          `    Live: ${JSON.stringify(liveF)}`
        );
      }
    }

    // Check if Live has fields that are missing in Dev
    for (const liveF of liveFields) {
      const devF = devFields.find(f => f.name === liveF.name);
      if (!devF) {
        differences.push(`Collection '${devCol.name}': field '${liveF.name}' exists in Live DB but is missing in Dev DB.`);
      }
    }
  }

  // Check for collections in Live DB that are missing in Dev DB
  for (const liveCol of liveDahootCols) {
    const devCol = devDahootCols.find(c => c.name === liveCol.name);
    if (!devCol) {
      differences.push(`Collection '${liveCol.name}' exists in Live DB but is missing in Dev DB.`);
    }
  }

  if (differences.length > 0) {
    console.error('\n\x1b[31m[Dahoot Deploy] Schema mismatch detected between Dev and Live database! Aborting deployment.\x1b[0m');
    console.error('The following differences must be resolved:');
    differences.forEach(diff => console.error(`  - ${diff}`));
    console.error('\nPlease synchronize the schemas by running:');
    console.error('  \x1b[33mnpm run db:setup -- --live\x1b[0m');
    console.error('or by making manual schema updates in the PocketBase Admin UI before deploying.\n');
    process.exit(1);
  }

  console.log('\x1b[32m[Dahoot Deploy] Schema check passed! Dev and Live database schemas are identical.\x1b[0m\n');
}

async function compareVersions(connectionString, targetPath, env) {
  console.log('\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mChecking database versions consistency...\x1b[0m');

  let localVersion = null;
  try {
    const pbExecutable = path.join(rootDir, 'pocketbase', 'pocketbase');
    const out = execSync(`"${pbExecutable}" --version`, { encoding: 'utf8' }).trim();
    const match = out.match(/version\s+([0-9.]+)/i);
    localVersion = match ? match[1] : out;
  } catch (err) {
    console.error(`\x1b[31m[Dahoot Deploy] Error: Failed to determine local PocketBase version:\x1b[0m ${err.message}`);
    process.exit(1);
  }

  // Resolve the remote PocketBase binary path from env settings or fallbacks
  let remotePbPath;
  if (env.DEPLOY_POCKETBASE_PATH) {
    remotePbPath = env.DEPLOY_POCKETBASE_PATH;
  } else if (env.POCKETBASE_HOOKS_PATH) {
    // If hooks path is e.g. /opt/pocketbase/pb_hooks, the executable is at /opt/pocketbase/pocketbase
    remotePbPath = path.posix.join(path.posix.dirname(env.POCKETBASE_HOOKS_PATH), 'pocketbase');
  } else {
    remotePbPath = path.posix.join(targetPath, 'pocketbase', 'pocketbase');
  }

  let remoteVersion = null;
  try {
    const out = execSync(`ssh -o ConnectTimeout=5 "${connectionString}" "${remotePbPath} --version"`, { encoding: 'utf8' }).trim();
    const match = out.match(/version\s+([0-9.]+)/i);
    remoteVersion = match ? match[1] : out;
  } catch (err) {
    console.error(`\x1b[31m[Dahoot Deploy] Error: Failed to determine remote PocketBase version at ${remotePbPath}:\x1b[0m ${err.message}`);
    console.error('Please verify that the PocketBase binary exists on the remote server and SSH connection is working.');
    process.exit(1);
  }

  console.log(`  Local Version:  v${localVersion}`);
  console.log(`  Remote Version: v${remoteVersion} (at ${remotePbPath})`);

  if (localVersion !== remoteVersion) {
    console.error(`\n\x1b[31m[Dahoot Deploy] Version mismatch detected! Local version (v${localVersion}) does not match remote version (v${remoteVersion}).\x1b[0m`);
    console.error('Please upgrade your local or remote PocketBase binary to match before deploying.');
    process.exit(1);
  }

  console.log('\x1b[32m[Dahoot Deploy] Version check passed! Local and Remote PocketBase versions match.\x1b[0m\n');
}

async function deploy() {
  console.log('\x1b[35m[Dahoot Deploy]\x1b[0m Loading configuration...');
  const env = loadEnv();

  const ip = env.DEPLOY_SERVER_IP;
  const user = env.DEPLOY_SERVER_USER;
  const targetPath = env.DEPLOY_SERVER_PATH;
  const liveUrl = env.VITE_POCKETBASE_LIVE_URL;
  const hooksPath = env.POCKETBASE_HOOKS_PATH || `${targetPath}/pocketbase/pb_hooks`;

  if (!ip || !user || !targetPath || !liveUrl) {
    console.error('\x1b[31m[Dahoot Deploy] Error: Missing deployment configuration in .env file.\x1b[0m');
    console.error('Make sure the following environment variables are set in your .env file:');
    console.error(`- DEPLOY_SERVER_IP (current: ${ip || 'undefined'})`);
    console.error(`- DEPLOY_SERVER_USER (current: ${user || 'undefined'})`);
    console.error(`- DEPLOY_SERVER_PATH (current: ${targetPath || 'undefined'})`);
    console.error(`- VITE_POCKETBASE_LIVE_URL (current: ${liveUrl || 'undefined'})`);
    process.exit(1);
  }

  const connectionString = `${user}@${ip}`;

  console.log(`\x1b[35m[Dahoot Deploy]\x1b[0m Deploying to \x1b[36m${connectionString}:${targetPath}\x1b[0m`);

  // Step 0: Verify version and schema consistency before deploying
  await compareVersions(connectionString, targetPath, env);
  await compareSchemas(env);

  // Step 1: Build the Vite production assets
  console.log('\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mStep 1: Building frontend assets...\x1b[0m');
  try {
    execSync('npm run build', { 
      cwd: rootDir, 
      env: { ...process.env, VITE_POCKETBASE_URL: liveUrl }, 
      stdio: 'inherit' 
    });
    console.log('\x1b[32m[Dahoot Deploy] Frontend built successfully using production/live url.\x1b[0m');
  } catch (err) {
    console.error('\x1b[31m[Dahoot Deploy] Error: Local build failed.\x1b[0m', err.message);
    process.exit(1);
  }

  // Step 2: Ensure target directory exists on VPS
  console.log('\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mStep 2: Preparing remote directories...\x1b[0m');
  try {
    execFileSync('ssh', ['-o', 'ConnectTimeout=10', connectionString, `mkdir -p ${targetPath}/pocketbase`], { stdio: 'inherit' });
    console.log('\x1b[32m[Dahoot Deploy] Remote directories are ready.\x1b[0m');
  } catch (err) {
    console.error('\x1b[31m[Dahoot Deploy] Error: Failed to connect to server via SSH.\x1b[0m');
    console.error('Please verify that your server is running, the IP/username are correct, and your SSH key is authorized.');
    process.exit(1);
  }

  // Step 3: Deploy frontend files
  console.log('\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mStep 3: Uploading frontend static assets (dist/)...\x1b[0m');
  try {
    execFileSync('rsync', ['-avz', '--delete', '-e', 'ssh', `${path.join(rootDir, 'dist')}/`, `${connectionString}:${targetPath}/dist/`], { stdio: 'inherit' });
    console.log('\x1b[32m[Dahoot Deploy] Frontend assets uploaded successfully.\x1b[0m');
  } catch (err) {
    console.error('\x1b[31m[Dahoot Deploy] Error: Failed to sync frontend assets.\x1b[0m', err.message);
    process.exit(1);
  }

  // Step 4: Deploy PocketBase migrations (if exists)
  const localMigrationsDir = path.join(rootDir, 'pocketbase', 'pb_migrations');
  if (fs.existsSync(localMigrationsDir)) {
    console.log('\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mStep 4: Uploading PocketBase migrations...\x1b[0m');
    try {
      execFileSync('rsync', ['-avz', '--delete', '-e', 'ssh', `${localMigrationsDir}/`, `${connectionString}:${targetPath}/pocketbase/pb_migrations/`], { stdio: 'inherit' });
      console.log('\x1b[32m[Dahoot Deploy] PocketBase migrations uploaded successfully.\x1b[0m');
    } catch (err) {
      console.error('\x1b[31m[Dahoot Deploy] Error: Failed to sync migrations.\x1b[0m', err.message);
      process.exit(1);
    }
  }

  // Step 4b: Deploy PocketBase JS VM hooks (if exists)
  const localHooksDir = path.join(rootDir, 'pocketbase', 'pb_hooks');
  if (fs.existsSync(localHooksDir)) {
    console.log(`\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mStep 4b: Uploading PocketBase hooks to ${hooksPath}...\x1b[0m`);
    try {
      execFileSync('rsync', ['-avz', '--delete', '-e', 'ssh', `${localHooksDir}/`, `${connectionString}:${hooksPath}/`], { stdio: 'inherit' });
      console.log('\x1b[32m[Dahoot Deploy] PocketBase hooks uploaded successfully.\x1b[0m');
    } catch (err) {
      console.error('\x1b[31m[Dahoot Deploy] Error: Failed to sync hooks.\x1b[0m', err.message);
      process.exit(1);
    }
  }

  console.log('\n\x1b[32;1m🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!\x1b[0m\n');
  console.log('To complete the configuration, ensure your Nginx site configuration is set up properly.');
}

deploy().catch((err) => {
  console.error('\x1b[31m[Dahoot Deploy] Deployment failed:\x1b[0m', err);
  process.exit(1);
});
