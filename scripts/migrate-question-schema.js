#!/usr/bin/env node
/**
 * Migrate existing dahoot_questions rows from the old schema to the new one.
 *
 * Old → New
 *   MULTIPLE_CHOICE: { options: [4 strings], correct_option_index: N }
 *                  → { options: { correct_answer: <options[N]>, distractors: <others> } }
 *   SORTING:         { options: [...ordered] }
 *                  → { options: { correct_sequence: [...ordered] } }
 *   DRAG_DROP:       { options: { sentence, choices, correct } }
 *                  → { options: { sentence, answers_in_order: correct, distractors: choices \ correct } }
 *   DROP_DOWN:       { options: { sentence, dropdowns: [{choices, correct}] } }
 *                  → { options: { sentence, dropdowns: [{correct_answer: correct, distractors: choices \ correct}] } }
 *   CATEGORIZE:      unchanged
 *
 * Usage:
 *   node scripts/migrate-question-schema.js           (dev)
 *   node scripts/migrate-question-schema.js --live    (production)
 *   node scripts/migrate-question-schema.js --dry-run (preview changes only)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(rootDir, '.env') });

const isLive = process.argv.includes('--live') || process.argv.includes('--prod');
const isDryRun = process.argv.includes('--dry-run');
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

if (!adminEmail || !adminPassword) {
  console.error('\x1b[31m[Dahoot Migrate] POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be defined in .env\x1b[0m');
  process.exit(1);
}

function isOldMultipleChoice(q) {
  return q.type === 'MULTIPLE_CHOICE' && Array.isArray(q.options);
}
function isOldSorting(q) {
  return q.type === 'SORTING' && Array.isArray(q.options);
}
function isOldDragDrop(q) {
  return q.type === 'DRAG_DROP' && q.options && !Array.isArray(q.options) &&
    Array.isArray(q.options.choices) && Array.isArray(q.options.correct);
}
function isOldDropDown(q) {
  return q.type === 'DROP_DOWN' && q.options && !Array.isArray(q.options) &&
    Array.isArray(q.options.dropdowns) && q.options.dropdowns.some(d => typeof d.correct === 'string');
}
function isNewShape(q) {
  if (!q.options) return false;
  if (Array.isArray(q.options)) return false;
  const t = q.type;
  if (t === 'MULTIPLE_CHOICE') return typeof q.options.correct_answer === 'string';
  if (t === 'SORTING') return Array.isArray(q.options.correct_sequence);
  if (t === 'DRAG_DROP') return Array.isArray(q.options.answers_in_order);
  if (t === 'DROP_DOWN') return Array.isArray(q.options.dropdowns) && q.options.dropdowns.every(d => typeof d.correct_answer === 'string');
  if (t === 'CATEGORIZE') return true;
  return false;
}

function migrateQuestion(q) {
  if (isNewShape(q)) return null;

  const out = { ...q };

  if (isOldMultipleChoice(q)) {
    const opts = q.options;
    const idx = q.correct_option_index || 0;
    out.options = {
      correct_answer: opts[idx] || '',
      distractors: opts.filter((_, i) => i !== idx)
    };
  } else if (isOldSorting(q)) {
    out.options = { correct_sequence: [...q.options] };
  } else if (isOldDragDrop(q)) {
    const correctArr = q.options.correct || [];
    const choices = q.options.choices || [];
    const used = new Set(correctArr);
    out.options = {
      sentence: q.options.sentence || '',
      answers_in_order: [...correctArr],
      distractors: choices.filter(c => !used.has(c))
    };
  } else if (isOldDropDown(q)) {
    out.options = {
      sentence: q.options.sentence || '',
      dropdowns: q.options.dropdowns.map(d => {
        const choices = Array.isArray(d.choices) ? d.choices : [];
        const correct = d.correct || '';
        return {
          correct_answer: correct,
          distractors: choices.filter(c => c !== correct)
        };
      })
    };
  } else {
    return null;
  }

  delete out.correct_option_index;
  return out;
}

async function main() {
  console.log(`\x1b[35m[Dahoot Migrate]\x1b[0m Connecting to PocketBase at ${pbUrl}...`);
  const pb = new PocketBase(pbUrl);

  await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword).catch(async () => {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
  });
  console.log('\x1b[32m[Dahoot Migrate] Authenticated.\x1b[0m');

  const all = await pb.collection('dahoot_questions').getFullList({ sort: 'created' });
  console.log(`[Dahoot Migrate] Found ${all.length} question rows.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const q of all) {
    const migrated = migrateQuestion(q);
    if (!migrated) {
      skipped++;
      continue;
    }
    if (isDryRun) {
      console.log(`\x1b[33m[DRY RUN]\x1b[0m Would update ${q.id} (${q.type})`);
      console.log('  before:', JSON.stringify(q.options).slice(0, 120));
      console.log('  after: ', JSON.stringify(migrated.options).slice(0, 120));
      updated++;
      continue;
    }
    try {
      await pb.collection('dahoot_questions').update(q.id, {
        options: migrated.options
      });
      updated++;
    } catch (err) {
      console.error(`\x1b[31m[Dahoot Migrate]\x1b[0m Failed to update ${q.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n\x1b[32m[Dahoot Migrate] Done.\x1b[0m`);
  console.log(`  updated: ${updated}`);
  console.log(`  skipped (already in new shape): ${skipped}`);
  console.log(`  failed: ${failed}`);

  if (isDryRun) {
    console.log('\n\x1b[33m[Dahoot Migrate] DRY RUN — no changes were written.\x1b[0m');
  }
}

main().catch((err) => {
  console.error('[Dahoot Migrate] Migration failed:', err);
  if (err.response) console.error(JSON.stringify(err.response, null, 2));
  process.exit(1);
});
