import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load .env variables
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

const DEFAULT_QUESTIONS = [
  {
    text: "Which programming language is predominantly used to add interactivity to web pages?",
    type: "MULTIPLE_CHOICE",
    options: ["Python", "HTML", "JavaScript", "SQL"],
    correct_option_index: 2
  },
  {
    text: "Sort these language layers of the web stack from front-end layout to back-end logic.",
    type: "SORTING",
    options: ["HTML Structured Markup", "CSS Cascading Styles", "JavaScript Client Behavior", "Python Database Logic"],
    correct_option_index: 0
  },
  {
    text: "Complete the sentence regarding styling languages.",
    type: "DRAG_DROP",
    options: {
      sentence: "In web development, we use [blank0] for layout structure, [blank1] for visual styles, and [blank2] for client scripting.",
      choices: ["HTML", "CSS", "JavaScript", "Python"],
      correct: ["HTML", "CSS", "JavaScript"]
    },
    correct_option_index: 0
  },
  {
    text: "Select the correct protocols for web communication.",
    type: "DROP_DOWN",
    options: {
      sentence: "For secure website browsing we use {{0}}, while real-time bidirectional message channels use {{1}} protocol.",
      dropdowns: [
        { choices: ["HTTPS", "HTTP", "FTP"], correct: "HTTPS" },
        { choices: ["WebSockets", "SMTP", "DNS"], correct: "WebSockets" }
      ]
    },
    correct_option_index: 0
  },
  {
    text: "Categorize these technologies into their respective layers.",
    type: "CATEGORIZE",
    options: {
      categories: ["Frontend", "Backend", "Database"],
      items: [
        { name: "React", category: "Frontend" },
        { name: "Express", category: "Backend" },
        { name: "PostgreSQL", category: "Database" },
        { name: "CSS Grid", category: "Frontend" },
        { name: "Django", category: "Backend" },
        { name: "MongoDB", category: "Database" }
      ]
    },
    correct_option_index: 0
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
  
  // Temporarily remove dahoot_info field from users to avoid constraint conflicts during reset
  try {
    const usersCol = await pb.collections.getOne('users');
    const originalLength = usersCol.fields.length;
    usersCol.fields = usersCol.fields.filter(f => f.name !== 'dahoot_info');
    if (usersCol.fields.length < originalLength) {
      await pb.collections.update(usersCol.id, usersCol);
      console.log("[Dahoot DB] Removed 'dahoot_info' relation field from 'users' collection for reset.");
    }
  } catch (e) {}

  try {
    await pb.collections.delete('dahoot_players');
    console.log("[Dahoot DB] Deleted existing 'dahoot_players' collection.");
  } catch (e) {}

  try {
    await pb.collections.delete('dahoot_rooms');
    console.log("[Dahoot DB] Deleted existing 'dahoot_rooms' collection.");
  } catch (e) {}

  try {
    await pb.collections.delete('dahoot_questions');
    console.log("[Dahoot DB] Deleted existing 'dahoot_questions' collection.");
  } catch (e) {}

  try {
    await pb.collections.delete('dahoot_games');
    console.log("[Dahoot DB] Deleted existing 'dahoot_games' collection.");
  } catch (e) {}

  try {
    await pb.collections.delete('dahoot_user_info');
    console.log("[Dahoot DB] Deleted existing 'dahoot_user_info' collection.");
  } catch (e) {}

  try {
    await pb.collections.delete('dahoot_options');
    console.log("[Dahoot DB] Deleted existing 'dahoot_options' collection.");
  } catch (e) {}

  // 1. Setup 'dahoot_user_info' collection
  console.log("[Dahoot DB] Creating 'dahoot_user_info' collection...");
  const userInfoCol = await pb.collections.create({
    name: 'dahoot_user_info',
    type: 'base',
    fields: [
      { name: 'role', type: 'select', required: true, values: ['TEACHER', 'ADMIN', 'STUDENT'], maxSelect: 1 },
      { name: 'school', type: 'text', required: false, max: 100 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: ''
  });
  console.log("\x1b[32m[Dahoot DB] Collection 'dahoot_user_info' created successfully.\x1b[0m");

  // Update 'users' collection to link to 'dahoot_user_info'
  try {
    const usersCol = await pb.collections.getOne('users');
    usersCol.fields.push({
      name: 'dahoot_info',
      type: 'relation',
      collectionId: userInfoCol.id,
      maxSelect: 1,
      cascadeDelete: false
    });
    await pb.collections.update(usersCol.id, usersCol);
    console.log("[Dahoot DB] Added 'dahoot_info' relation field to the existing 'users' collection.");
  } catch (err) {
    console.error("[Dahoot DB] Error updating 'users' collection:", err.message);
  }

  // 2. Setup 'dahoot_options' collection
  console.log("[Dahoot DB] Creating 'dahoot_options' collection...");
  await pb.collections.create({
    name: 'dahoot_options',
    type: 'base',
    fields: [
      { name: 'type', type: 'select', required: true, values: ['subject', 'cefr_level'], maxSelect: 1 },
      { name: 'value', type: 'text', required: true, min: 1, max: 50 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: ''
  });
  console.log("\x1b[32m[Dahoot DB] Collection 'dahoot_options' created successfully.\x1b[0m");

  // 3. Setup 'dahoot_games' collection
  console.log("[Dahoot DB] Creating 'dahoot_games' collection...");
  const gamesCol = await pb.collections.create({
    name: 'dahoot_games',
    type: 'base',
    fields: [
      { name: 'title', type: 'text', required: true, min: 1, max: 100 },
      { name: 'description', type: 'text', required: false, max: 500 },
      { name: 'creator', type: 'text', required: false, max: 100 },
      { name: 'language', type: 'text', required: false, max: 50 },
      { name: 'cefr_level', type: 'text', required: false, max: 50 },
      { name: 'subject', type: 'text', required: false, max: 100 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: ''
  });
  console.log("\x1b[32m[Dahoot DB] Collection 'dahoot_games' created successfully.\x1b[0m");

  // 4. Setup 'dahoot_rooms' collection
  console.log("[Dahoot DB] Creating 'dahoot_rooms' collection...");
  const roomsCol = await pb.collections.create({
    name: 'dahoot_rooms',
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
  console.log("\x1b[32m[Dahoot DB] Collection 'dahoot_rooms' created successfully.\x1b[0m");

  // 5. Setup 'dahoot_players' collection
  console.log("[Dahoot DB] Creating 'dahoot_players' collection...");
  await pb.collections.create({
    name: 'dahoot_players',
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
  console.log("\x1b[32m[Dahoot DB] Collection 'dahoot_players' created successfully.\x1b[0m");

  // 6. Setup 'dahoot_questions' collection
  console.log("[Dahoot DB] Creating 'dahoot_questions' collection...");
  await pb.collections.create({
    name: 'dahoot_questions',
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
  console.log("\x1b[32m[Dahoot DB] Collection 'dahoot_questions' created successfully.\x1b[0m");

  // 7. Seed default game, questions, and options
  try {
    console.log("[Dahoot DB] Seeding default options...");
    const defaultSubjects = ['Math', 'Science', 'English', 'History', 'Geography', 'Other'];
    const defaultCefr = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    for (const sub of defaultSubjects) {
      await pb.collection('dahoot_options').create({ type: 'subject', value: sub });
    }
    for (const lvl of defaultCefr) {
      await pb.collection('dahoot_options').create({ type: 'cefr_level', value: lvl });
    }

    console.log("[Dahoot DB] Seeding default game...");
    const defaultGame = await pb.collection('dahoot_games').create({
      title: "General Tech Trivia",
      description: "A fun quiz testing your knowledge of programming history, CSS, React, and general technology stack layers.",
      creator: "Dahoot Team",
      language: "English",
      cefr_level: "B2",
      subject: "Science"
    });

    console.log("[Dahoot DB] Seeding default questions...");
    for (const q of DEFAULT_QUESTIONS) {
      await pb.collection('dahoot_questions').create({
        ...q,
        game_id: defaultGame.id
      });
    }
    console.log("\x1b[32m[Dahoot DB] Default game, questions, and options seeded successfully!\x1b[0m");
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
