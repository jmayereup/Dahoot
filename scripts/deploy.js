import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load .env variables
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  }
  return env;
}

async function deploy() {
  console.log('\x1b[35m[Dahoot Deploy]\x1b[0m Loading configuration...');
  const env = loadEnv();

  const ip = env.DEPLOY_SERVER_IP;
  const user = env.DEPLOY_SERVER_USER;
  const targetPath = env.DEPLOY_SERVER_PATH;
  const serviceName = env.DEPLOY_SERVICE_NAME;

  if (!ip || !user || !targetPath || !serviceName) {
    console.error('\x1b[31m[Dahoot Deploy] Error: Missing deployment configuration in .env file.\x1b[0m');
    console.error('Make sure the following environment variables are set in your .env file:');
    console.error(`- DEPLOY_SERVER_IP (current: ${ip || 'undefined'})`);
    console.error(`- DEPLOY_SERVER_USER (current: ${user || 'undefined'})`);
    console.error(`- DEPLOY_SERVER_PATH (current: ${targetPath || 'undefined'})`);
    console.error(`- DEPLOY_SERVICE_NAME (current: ${serviceName || 'undefined'})`);
    process.exit(1);
  }

  const connectionString = `${user}@${ip}`;

  console.log(`\x1b[35m[Dahoot Deploy]\x1b[0m Deploying to \x1b[36m${connectionString}:${targetPath}\x1b[0m`);

  // Step 1: Build the Vite production assets
  console.log('\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mStep 1: Building frontend assets...\x1b[0m');
  try {
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    console.log('\x1b[32m[Dahoot Deploy] Frontend built successfully.\x1b[0m');
  } catch (err) {
    console.error('\x1b[31m[Dahoot Deploy] Error: Local build failed.\x1b[0m', err.message);
    process.exit(1);
  }

  // Step 2: Ensure target directory exists on VPS
  console.log('\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mStep 2: Preparing remote directories...\x1b[0m');
  try {
    execSync(`ssh -o ConnectTimeout=10 ${connectionString} "mkdir -p ${targetPath}/pocketbase"`, { stdio: 'inherit' });
    console.log('\x1b[32m[Dahoot Deploy] Remote directories are ready.\x1b[0m');
  } catch (err) {
    console.error('\x1b[31m[Dahoot Deploy] Error: Failed to connect to server via SSH.\x1b[0m');
    console.error('Please verify that your server is running, the IP/username are correct, and your SSH key is authorized.');
    process.exit(1);
  }

  // Step 3: Deploy frontend files
  console.log('\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mStep 3: Uploading frontend static assets (dist/)...\x1b[0m');
  try {
    execSync(`rsync -avz --delete -e ssh "${path.join(rootDir, 'dist')}/" "${connectionString}:${targetPath}/dist/"`, { stdio: 'inherit' });
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
      execSync(`rsync -avz --delete -e ssh "${localMigrationsDir}/" "${connectionString}:${targetPath}/pocketbase/pb_migrations/"`, { stdio: 'inherit' });
      console.log('\x1b[32m[Dahoot Deploy] PocketBase migrations uploaded successfully.\x1b[0m');
    } catch (err) {
      console.error('\x1b[31m[Dahoot Deploy] Error: Failed to sync migrations.\x1b[0m', err.message);
      process.exit(1);
    }
  }

  // Step 5: Restart the systemd service on remote server
  console.log(`\n\x1b[35m[Dahoot Deploy]\x1b[0m \x1b[1mStep 5: Restarting systemd service (${serviceName})...\x1b[0m`);
  try {
    execSync(`ssh ${connectionString} "systemctl restart ${serviceName}"`, { stdio: 'inherit' });
    console.log(`\x1b[32m[Dahoot Deploy] Service '${serviceName}' restarted successfully on remote server.\x1b[0m`);
  } catch (err) {
    console.warn(`\x1b[33m[Dahoot Deploy] Warning: Failed to restart '${serviceName}' on the server.\x1b[0m`);
    console.warn('You may need to restart the service manually or check sudo/permissions on the server.');
    console.warn(`Error details: ${err.message}`);
  }

  console.log('\n\x1b[32;1m🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!\x1b[0m\n');
  console.log('To complete the configuration, ensure your Nginx site configuration is set up properly.');
}

deploy().catch((err) => {
  console.error('\x1b[31m[Dahoot Deploy] Deployment failed:\x1b[0m', err);
  process.exit(1);
});
