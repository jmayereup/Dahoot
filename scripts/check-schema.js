import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

const pbUrl = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function check() {
  try {
    try {
      await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    } catch {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
    }

    console.log("\n=== rooms Collection Schema ===");
    try {
      const col = await pb.collections.getOne('rooms');
      console.log(JSON.stringify(col, null, 2));
    } catch (e) {
      console.log("Error loading rooms collection:", e.message);
    }

    console.log("\n=== players Collection Schema ===");
    try {
      const col = await pb.collections.getOne('players');
      console.log(JSON.stringify(col, null, 2));
    } catch (e) {
      console.log("Error loading players collection:", e.message);
    }
  } catch (err) {
    console.error("Authentication failed:", err.message);
  }
}

check();
