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

const isDev = (process.env.VITE_ENV || 'development') === 'development';
const pbUrl = isDev
  ? (process.env.VITE_POCKETBASE_DEV_URL || 'http://127.0.0.1:8090')
  : (process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');
const adminEmail = isDev
  ? (process.env.POCKETBASE_DEV_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL)
  : process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = isDev
  ? (process.env.POCKETBASE_DEV_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD)
  : process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function run() {
  try {
    try {
      await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
      console.log('Authenticated as Superuser (v0.30+ style).');
    } catch {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log('Authenticated as Legacy Admin (v0.22 style).');
    }

    console.log("Fetching dahoot_rooms collection...");
    const collection = await pb.collections.getOne('dahoot_rooms');
    
    // Check if question_ids already exists
    const hasField = collection.fields.some(f => f.name === 'question_ids');
    if (hasField) {
      console.log("Field 'question_ids' already exists in dahoot_rooms collection.");
      return;
    }

    console.log("Adding 'question_ids' field...");
    collection.fields.push({
      name: 'question_ids',
      type: 'json',
      required: false
    });

    await pb.collections.update(collection.id, collection);
    console.log("Successfully updated dahoot_rooms collection with 'question_ids' field!");
  } catch (err) {
    console.error("Error updating schema:", err);
  }
}

run();
