import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const POCKETBASE_VERSION = '0.39.5'; // Modern superuser version matching db-setup.js

// Determine PocketBase binary release name based on OS & Architecture
function getDownloadUrl() {
  const platform = process.platform;
  const arch = process.arch;

  let osName = '';
  let archName = '';

  if (platform === 'win32') {
    osName = 'windows';
  } else if (platform === 'darwin') {
    osName = 'darwin';
  } else if (platform === 'linux') {
    osName = 'linux';
  } else {
    throw new Error(`Unsupported OS platform: ${platform}`);
  }

  if (arch === 'x64') {
    archName = 'amd64';
  } else if (arch === 'arm64') {
    archName = 'arm64';
  } else {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  const zipName = `pocketbase_${POCKETBASE_VERSION}_${osName}_${archName}.zip`;
  return {
    url: `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/${zipName}`,
    zipName
  };
}

// Download file helper supporting redirects
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let redirectCount = 0;
    const maxRedirects = 5;
    
    const request = (targetUrl) => {
      https.get(targetUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          if (redirectCount >= maxRedirects) {
            reject(new Error(`Too many redirects (max: ${maxRedirects})`));
            return;
          }
          redirectCount++;
          // Follow redirect
          request(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download PocketBase. Server status code: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {}); // delete partial file
        reject(err);
      });
    };

    request(url);
  });
}

async function install() {
  const targetDir = path.join(rootDir, 'pocketbase');
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const { url, zipName } = getDownloadUrl();
  const zipPath = path.join(targetDir, zipName);

  console.log(`\x1b[35m[Dahoot DB Install]\x1b[0m Downloading PocketBase v${POCKETBASE_VERSION} for ${process.platform}-${process.arch}...`);
  console.log(`Source: ${url}`);

  try {
    await downloadFile(url, zipPath);
    console.log(`\x1b[32m[Dahoot DB Install] Download completed successfully.\x1b[0m`);

    console.log(`\x1b[35m[Dahoot DB Install]\x1b[0m Extracting binary...`);
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // Use Powershell to extract
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`, { stdio: 'inherit' });
    } else {
      // Use system unzip
      try {
        execSync(`unzip -o "${zipPath}" -d "${targetDir}"`, { stdio: 'inherit' });
      } catch (err) {
        console.warn(`\x1b[33m[Dahoot DB Install] 'unzip' command failed. Trying fallback extraction...\x1b[0m`);
        throw new Error("System 'unzip' utility is required on Linux/macOS to extract the download zip.");
      }

      // Make executable
      const binaryPath = path.join(targetDir, 'pocketbase');
      if (fs.existsSync(binaryPath)) {
        execSync(`chmod +x "${binaryPath}"`);
      }
    }

    // Clean up zip
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    console.log(`\x1b[32m🎉 [Dahoot DB Install] PocketBase successfully installed in ${targetDir}!\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m[Dahoot DB Install] Error during installation:\x1b[0m`, err.message);
    process.exit(1);
  }
}

install();
