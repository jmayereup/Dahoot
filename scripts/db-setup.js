import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('[Dahoot DB] .env file not found, falling back to system environment.');
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const pbUrl = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const DEFAULT_QUESTIONS = [
  {
    text: "Which programming language was created by Brendan Eich in 1995 in just 10 days?",
    options: ["Java", "JavaScript", "Python", "C++"],
    correct_option_index: 1,
    type: "MULTIPLE_CHOICE"
  },
  {
    text: "What does CSS stand for?",
    options: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"],
    correct_option_index: 1,
    type: "MULTIPLE_CHOICE"
  },
  {
    text: "Sort these tech stack layers from front-end to back-end (client-side at the top, database at the bottom).",
    options: ["UI CSS / HTML", "React Client Logic", "Express API Router", "PostgreSQL Database"],
    correct_option_index: 0,
    type: "SORTING"
  },
  {
    text: "Drag the correct hook names to complete the sentence.",
    options: {
      sentence: "In React, we use the [blank0] hook to manage local component state, and [blank1] to perform side effects.",
      choices: ["useState", "useEffect", "useContext", "useRef"],
      correct: ["useState", "useEffect"]
    },
    correct_option_index: 0,
    type: "DRAG_DROP"
  },
  {
    text: "Select the correct technologies from the dropdowns to complete the statement.",
    options: {
      sentence: "PocketBase is written in {{0}} and uses {{1}} as its default embedded database engine.",
      dropdowns: [
        { choices: ["Go", "Rust", "JavaScript"], correct: "Go" },
        { choices: ["SQLite", "PostgreSQL", "MongoDB"], correct: "SQLite" }
      ]
    },
    correct_option_index: 0,
    type: "DROP_DOWN"
  },
  {
    text: "Classify these technologies into their correct category.",
    options: {
      categories: ["Languages", "Frameworks"],
      items: [
        { name: "JavaScript", category: "Languages" },
        { name: "React", category: "Frameworks" },
        { name: "Python", category: "Languages" },
        { name: "Next.js", category: "Frameworks" },
        { name: "SQL", category: "Languages" },
        { name: "Express", category: "Frameworks" }
      ]
    },
    correct_option_index: 0,
    type: "CATEGORIZE"
  }
];

if (!adminEmail || !adminPassword) {
  console.error('\x1b[31m[Dahoot DB] Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be defined in .env\x1b[0m');
  process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function runSetup() {
  console.log(`\x1b[35m[Dahoot DB]\x1b[0m Connecting to PocketBase at ${pbUrl}...`);
  
  // Authenticate as Admin/Superuser
  try {
    await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    console.log('\x1b[32m[Dahoot DB] Authenticated as Superuser (v0.30+ style).\x1b[0m');
  } catch (err) {
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log('\x1b[32m[Dahoot DB] Authenticated as Legacy Admin (v0.22 style).\x1b[0m');
    } catch (legacyErr) {
      console.error('\x1b[31m[Dahoot DB] Authentication failed. Ensure:\x1b[0m');
      console.error(' 1. PocketBase is running (run: npm run dev)');
      console.error(` 2. You created a superuser with email "${adminEmail}" and your configured password in the Admin UI.`);
      console.error('Legacy Admin Error:', legacyErr.message);
      console.error('Superuser Error:', err.message);
      process.exit(1);
    }
  }

  // Delete existing collections first
  console.log("[Dahoot DB] Clearing old tables (if any)...");
  try {
    await pb.collections.delete('players');
    console.log("[Dahoot DB] Deleted existing 'players' collection.");
  } catch (e) {}

  try {
    await pb.collections.delete('rooms');
    console.log("[Dahoot DB] Deleted existing 'rooms' collection.");
  } catch (e) {}

  try {
    await pb.collections.delete('questions');
    console.log("[Dahoot DB] Deleted existing 'questions' collection.");
  } catch (e) {}

  try {
    await pb.collections.delete('games');
    console.log("[Dahoot DB] Deleted existing 'games' collection.");
  } catch (e) {}

  // 1. Setup 'games' collection
  console.log("[Dahoot DB] Creating 'games' collection...");
  const gamesCol = await pb.collections.create({
    name: 'games',
    type: 'base',
    fields: [
      { name: 'title', type: 'text', required: true, min: 1, max: 100 },
      { name: 'description', type: 'text', required: false, max: 500 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: ''
  });
  console.log("\x1b[32m[Dahoot DB] Collection 'games' created successfully.\x1b[0m");

  // 2. Setup 'rooms' collection
  console.log("[Dahoot DB] Creating 'rooms' collection...");
  const roomsCol = await pb.collections.create({
    name: 'rooms',
    type: 'base',
    fields: [
      { name: 'code', type: 'text', required: true, min: 4, max: 4 },
      { name: 'game_id', type: 'relation', required: false, maxSelect: 1, collectionId: gamesCol.id, cascadeDelete: true },
      { name: 'current_question_index', type: 'number', required: false, noDecimal: true },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['LOBBY', 'QUESTION', 'LEADERBOARD', 'FINISHED'] },
      { name: 'current_question_start_time', type: 'text', required: false },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: ''
  });
  console.log("\x1b[32m[Dahoot DB] Collection 'rooms' created successfully.\x1b[0m");

  // 3. Setup 'players' collection
  console.log("[Dahoot DB] Creating 'players' collection...");
  await pb.collections.create({
    name: 'players',
    type: 'base',
    fields: [
      { name: 'room_id', type: 'relation', required: true, maxSelect: 1, collectionId: roomsCol.id, cascadeDelete: true },
      { name: 'name', type: 'text', required: true, min: 1, max: 15 },
      { name: 'score', type: 'number', required: false, noDecimal: true },
      { name: 'last_answered_index', type: 'number', required: false, noDecimal: true },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: ''
  });
  console.log("\x1b[32m[Dahoot DB] Collection 'players' created successfully.\x1b[0m");

  // 4. Setup 'questions' collection
  console.log("[Dahoot DB] Creating 'questions' collection...");
  await pb.collections.create({
    name: 'questions',
    type: 'base',
    fields: [
      { name: 'game_id', type: 'relation', required: true, maxSelect: 1, collectionId: gamesCol.id, cascadeDelete: true },
      { name: 'text', type: 'text', required: true },
      { name: 'options', type: 'json', required: true },
      { name: 'correct_option_index', type: 'number', required: false, noDecimal: true },
      { name: 'type', type: 'select', required: true, maxSelect: 1, values: ['MULTIPLE_CHOICE', 'SORTING', 'DRAG_DROP', 'DROP_DOWN', 'CATEGORIZE'] },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: ''
  });
  console.log("\x1b[32m[Dahoot DB] Collection 'questions' created successfully.\x1b[0m");

  // 5. Seed default game and questions
  try {
    console.log("[Dahoot DB] Seeding default game...");
    const defaultGame = await pb.collection('games').create({
      title: "General Tech Trivia",
      description: "A fun quiz testing your knowledge of programming history, CSS, React, and general technology stack layers."
    });

    console.log("[Dahoot DB] Seeding default questions...");
    for (const q of DEFAULT_QUESTIONS) {
      await pb.collection('questions').create({
        ...q,
        game_id: defaultGame.id
      });
    }
    console.log("\x1b[32m[Dahoot DB] Default game and questions seeded successfully!\x1b[0m");
  } catch (err) {
    console.error("[Dahoot DB] Error seeding default game/questions:", err.message);
  }

  console.log('\n\x1b[32m🎉 [Dahoot DB] Programmatic database setup complete!\x1b[0m');
}

runSetup().catch((err) => {
  console.error('[Dahoot DB] Setup execution failed:');
  if (err.response) {
    console.error(JSON.stringify(err.response, null, 2));
  } else {
    console.error(err);
  }
  process.exit(1);
});
