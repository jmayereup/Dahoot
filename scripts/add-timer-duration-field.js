import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(rootDir, '.env') });

const isLive = process.argv.includes('--live') || process.argv.includes('--prod');
const isDev = !isLive;
const pbUrl = isDev
  ? (process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090')
  : (process.env.VITE_POCKETBASE_LIVE_URL || 'http://127.0.0.1:8090');
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
    
    // Check if timer_duration already exists
    const hasField = collection.fields.some(f => f.name === 'timer_duration');
    if (hasField) {
      console.log("Field 'timer_duration' already exists in dahoot_rooms collection.");
      return;
    }

    console.log("Adding 'timer_duration' field...");
    collection.fields.push({
      name: 'timer_duration',
      type: 'number',
      required: false,
      onlyInt: true // or noDecimal depending on pb version
    });

    await pb.collections.update(collection.id, collection);
    console.log("Successfully updated dahoot_rooms collection with 'timer_duration' field!");
  } catch (err) {
    console.error("Error updating schema:", err);
  }
}

run();
