import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import PocketBase from 'pocketbase';
import readline from 'readline';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(rootDir, '.env') });

const isLive = process.argv.includes('--live') || process.argv.includes('--prod');
const isErase = process.argv.includes('--erase');
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

const seedGamesPath = path.resolve(rootDir, 'src', 'data', 'seed-games.json');
let SEED_GAMES = [];
if (fs.existsSync(seedGamesPath)) {
  try {
    SEED_GAMES = JSON.parse(fs.readFileSync(seedGamesPath, 'utf8'));
  } catch (err) {
    console.warn('[Dahoot DB] Warning: Could not parse seed-games.json:', err.message);
  }
}

if (!adminEmail || !adminPassword) {
  console.error('\x1b[31m[Dahoot DB] Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be defined in .env\x1b[0m');
  process.exit(1);
}

const pb = new PocketBase(pbUrl);

// Helper to ask for user confirmation in terminal
function askConfirmation(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Helper to check URL local status
function isLocalUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch (err) {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }
}

// Helper to get or create a collection, only adding missing fields
async function getOrCreateCollection(name, config) {
  try {
    const col = await pb.collections.getOne(name);
    console.log(`[Dahoot DB] Collection '${name}' already exists.`);
    
    // Non-destructive update: check for any new fields and append them.
    // Also update existing fields if properties mismatch. We never delete fields.
    let updated = false;

    // Sync collection rules
    const ruleKeys = ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule'];
    for (const key of ruleKeys) {
      if (col[key] !== config[key]) {
        console.log(`[Dahoot DB] Collection '${name}': Syncing rule '${key}' ('${col[key]}' -> '${config[key]}')`);
        col[key] = config[key];
        updated = true;
      }
    }

    // Sync collection indexes
    if (config.indexes) {
      const indexesEqual = Array.isArray(col.indexes) && Array.isArray(config.indexes) &&
        col.indexes.length === config.indexes.length &&
        col.indexes.every((v, i) => v === config.indexes[i]);
      if (!indexesEqual) {
        console.log(`[Dahoot DB] Collection '${name}': Syncing indexes...`);
        col.indexes = config.indexes;
        updated = true;
      }
    }

    if (config.fields) {
      for (const field of config.fields) {
        const existingFieldIdx = col.fields.findIndex(f => f.name === field.name);
        if (existingFieldIdx === -1) {
          console.log(`[Dahoot DB] Collection '${name}': Adding missing field '${field.name}'...`);
          col.fields.push(field);
          updated = true;
        } else {
          const existingField = col.fields[existingFieldIdx];
          let fieldChanged = false;
          
          // Sync required status
          if (existingField.required !== field.required) {
            console.log(`[Dahoot DB] Collection '${name}': Syncing required status for field '${field.name}' (${existingField.required} -> ${field.required})`);
            existingField.required = field.required;
            fieldChanged = true;
          }
          
          // Sync select values
          if (field.type === 'select' && existingField.type === 'select') {
            const valuesEqual = Array.isArray(existingField.values) && Array.isArray(field.values) &&
              existingField.values.length === field.values.length &&
              existingField.values.every((v, i) => v === field.values[i]);
            if (!valuesEqual) {
              console.log(`[Dahoot DB] Collection '${name}': Syncing select values for field '${field.name}'`);
              existingField.values = field.values;
              fieldChanged = true;
            }
          }
          
          if (fieldChanged) {
            col.fields[existingFieldIdx] = existingField;
            updated = true;
          }
        }
      }
    }
    
    if (updated) {
      await pb.collections.update(col.id, col);
      console.log(`\x1b[32m[Dahoot DB] Collection '${name}' updated with new fields or configurations.\x1b[0m`);
    }
    
    return col;
  } catch (err) {
    console.log(`[Dahoot DB] Collection '${name}' not found. Creating...`);
    const col = await pb.collections.create(config);
    console.log(`\x1b[32m[Dahoot DB] Collection '${name}' created successfully.\x1b[0m`);
    return col;
  }
}

async function runSetup() {
  const isProd = process.argv.includes('--live') || process.argv.includes('--prod');
  const isDev = !isProd;

  if (!isLocalUrl(pbUrl) && isDev) {
    console.log(`\n\x1b[33m⚠️  WARNING: You are running the database setup script in DEVELOPMENT mode against a remote database: ${pbUrl}\x1b[0m`);
    const answer = await askConfirmation('Are you sure you want to proceed? (yes/no): ');
    if (answer.trim().toLowerCase() !== 'yes' && answer.trim().toLowerCase() !== 'y') {
      console.log('\x1b[31m[Dahoot DB] Setup aborted by user.\x1b[0m');
      process.exit(0);
    }
  }

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
      let bootstrapped = false;
      if (isDev) {
        let pbDir = path.resolve(rootDir, '..', 'pocketbase');
        let pbExecutable = path.join(pbDir, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
        let pbDataDir = path.join(pbDir, 'pb_data');
        if (!fs.existsSync(pbExecutable)) {
          pbDir = path.join(rootDir, 'pocketbase');
          pbExecutable = path.join(pbDir, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
          pbDataDir = path.join(pbDir, 'pb_data');
        }
        if (fs.existsSync(pbExecutable)) {
          try {
            console.log(`[Dahoot DB] Bootstrapping initial superuser (${adminEmail}) via PocketBase CLI...`);
            execSync(`"${pbExecutable}" superuser create "${adminEmail}" "${adminPassword}" --dir="${pbDataDir}"`, { stdio: 'ignore' });
            bootstrapped = true;
          } catch (cliErr) {
            try {
              execSync(`"${pbExecutable}" admin create "${adminEmail}" "${adminPassword}" --dir="${pbDataDir}"`, { stdio: 'ignore' });
              bootstrapped = true;
            } catch (cliErr2) {}
          }
        }
      }

      if (bootstrapped) {
        try {
          await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
          console.log('\x1b[32m[Dahoot DB] Bootstrapped and authenticated superuser: ' + adminEmail + '\x1b[0m');
        } catch (authErr) {
          bootstrapped = false;
        }
      }

      if (!bootstrapped) {
        console.error('\x1b[31m[Dahoot DB] Authentication failed. Ensure:\x1b[0m');
        console.error(' 1. PocketBase is running (run: npm run dev)');
        console.error(` 2. You created a superuser with email "${adminEmail}" and your configured password in the Admin UI.`);
        console.error('Legacy Admin Error:', legacyErr.message);
        console.error('Superuser Error:', err.message);
        process.exit(1);
      }
    }
  }

  // Delete existing collections only if --erase flag is provided
  if (isErase) {
    console.log("[Dahoot DB] --erase flag detected. Clearing old tables (if any)...");
    
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

    try {
      await pb.collections.delete('dahoot_settings');
      console.log("[Dahoot DB] Deleted existing 'dahoot_settings' collection.");
    } catch (e) {}
  } else {
    console.log("[Dahoot DB] No --erase flag: Updating collections non-destructively (existing data preserved).");
  }

  // 1. Setup 'dahoot_user_info' collection
  const userInfoCol = await getOrCreateCollection('dahoot_user_info', {
    name: 'dahoot_user_info',
    type: 'base',
    fields: [
      { name: 'role', type: 'select', required: true, values: ['TEACHER', 'ADMIN', 'STUDENT', 'DISABLED'], maxSelect: 1 },
      { name: 'school', type: 'text', required: false, max: 100 },
      { name: 'dahoot_username', type: 'text', required: false, max: 100 },
      { name: 'invite_code', type: 'text', required: false, max: 100 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '@request.auth.dahoot_info.role = "ADMIN"',
    viewRule: '@request.auth.id != "" && (@request.auth.dahoot_info.id = id || @request.auth.dahoot_info.role = "ADMIN" || @request.auth.dahoot_info.role = "TEACHER")',
    createRule: '',
    updateRule: '@request.auth.id != "" && (@request.auth.dahoot_info.id = id || @request.auth.dahoot_info.role = "ADMIN")',
    deleteRule: '@request.auth.dahoot_info.role = "ADMIN"'
  });

  // Update 'users' collection to link to 'dahoot_user_info'
  try {
    const usersCol = await pb.collections.getOne('users');
    const hasField = usersCol.fields.some(f => f.name === 'dahoot_info');
    if (!hasField) {
      usersCol.fields.push({
        name: 'dahoot_info',
        type: 'relation',
        collectionId: userInfoCol.id,
        maxSelect: 1,
        cascadeDelete: false
      });
      await pb.collections.update(usersCol.id, usersCol);
      console.log("[Dahoot DB] Added 'dahoot_info' relation field to the existing 'users' collection.");
    } else {
      console.log("[Dahoot DB] 'dahoot_info' relation field already exists on 'users' collection.");
    }
  } catch (err) {
    console.error("[Dahoot DB] Error updating 'users' collection:", err.message);
  }

  // 1b. Setup 'dahoot_settings' collection
  await getOrCreateCollection('dahoot_settings', {
    name: 'dahoot_settings',
    type: 'base',
    fields: [
      { name: 'key', type: 'text', required: true, min: 1, max: 100 },
      { name: 'value', type: 'text', required: true }
    ],
    listRule: '@request.auth.dahoot_info.role = "ADMIN"',
    viewRule: '@request.auth.dahoot_info.role = "ADMIN"',
    createRule: '@request.auth.dahoot_info.role = "ADMIN"',
    updateRule: '@request.auth.dahoot_info.role = "ADMIN"',
    deleteRule: '@request.auth.dahoot_info.role = "ADMIN"'
  });

  // Seed default 'invite_code' if not exists
  try {
    const inviteSetting = await pb.collection('dahoot_settings').getFirstListItem('key = "invite_code"');
    console.log("[Dahoot DB] Existing 'invite_code' found:", inviteSetting.value);
  } catch (err) {
    try {
      await pb.collection('dahoot_settings').create({
        key: 'invite_code',
        value: 'DAHOOT123'
      });
      console.log("[Dahoot DB] Created default 'invite_code' setting: DAHOOT123");
    } catch (createErr) {
      console.error("[Dahoot DB] Error creating default invite_code:", createErr.message);
    }
  }

  // 2. Setup 'dahoot_options' collection
  await getOrCreateCollection('dahoot_options', {
    name: 'dahoot_options',
    type: 'base',
    fields: [
      { name: 'type', type: 'select', required: true, values: ['subject', 'cefr_level', 'language'], maxSelect: 1 },
      { name: 'value', type: 'text', required: true, min: 1, max: 50 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != "" && @request.auth.dahoot_info.role = "ADMIN"',
    updateRule: '@request.auth.id != "" && @request.auth.dahoot_info.role = "ADMIN"',
    deleteRule: '@request.auth.id != "" && @request.auth.dahoot_info.role = "ADMIN"'
  });

  // 3. Setup 'dahoot_games' collection
  const gamesCol = await getOrCreateCollection('dahoot_games', {
    name: 'dahoot_games',
    type: 'base',
    indexes: [
      'CREATE INDEX idx_games_subject ON dahoot_games (subject)',
      'CREATE INDEX idx_games_cefr ON dahoot_games (cefr_level)',
      'CREATE INDEX idx_games_language ON dahoot_games (language)',
      'CREATE INDEX idx_games_creator ON dahoot_games (creator)'
    ],
    fields: [
      { name: 'title', type: 'text', required: true, min: 1, max: 100 },
      { name: 'description', type: 'text', required: true, max: 500 },
      { name: 'creator', type: 'text', required: true, max: 100 },
      { name: 'language', type: 'text', required: true, max: 50 },
      { name: 'cefr_level', type: 'text', required: true, max: 50 },
      { name: 'subject', type: 'text', required: true, max: 100 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != "" && (@request.auth.dahoot_info.role = "TEACHER" || @request.auth.dahoot_info.role = "ADMIN")',
    updateRule: '@request.auth.id != "" && (@request.auth.dahoot_info.role = "TEACHER" || @request.auth.dahoot_info.role = "ADMIN")',
    deleteRule: '@request.auth.id != "" && (@request.auth.dahoot_info.role = "ADMIN" || creator = @request.auth.id || creator = @request.auth.username || creator = @request.auth.email || creator = @request.auth.name || creator = @request.auth.dahoot_info.dahoot_username)'
  });

  // 4. Setup 'dahoot_rooms' collection
  const roomsCol = await getOrCreateCollection('dahoot_rooms', {
    name: 'dahoot_rooms',
    type: 'base',
    indexes: [
      'CREATE UNIQUE INDEX idx_rooms_code ON dahoot_rooms (code)'
    ],
    fields: [
      { name: 'code', type: 'text', required: true, min: 4, max: 4 },
      { name: 'game_id', type: 'relation', required: false, maxSelect: 1, collectionId: gamesCol.id, cascadeDelete: true },
      { name: 'current_question_index', type: 'number', required: false, noDecimal: true },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['LOBBY', 'QUESTION', 'LEADERBOARD', 'FINISHED', 'WRAP_UP'] },
      { name: 'current_question_start_time', type: 'text', required: false },
      { name: 'question_ids', type: 'json', required: false },
      { name: 'timer_duration', type: 'number', required: false, noDecimal: true },
      { name: 'configured_timer_duration', type: 'number', required: false, noDecimal: true },
      { name: 'pacing_mode', type: 'select', required: false, values: ['teacher', 'student'], maxSelect: 1 },
      { name: 'marathon_mode', type: 'bool', required: false },
      { name: 'wrap_up_timer', type: 'number', required: false, noDecimal: true },
      { name: 'wrap_up_start_time', type: 'text', required: false },
      { name: 'question_pool_size', type: 'number', required: false, noDecimal: true },
      { name: 'max_questions', type: 'number', required: false, noDecimal: true },
      { name: 'randomize_questions', type: 'bool', required: false },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: ''
  });

  // 5. Setup 'dahoot_players' collection
  await getOrCreateCollection('dahoot_players', {
    name: 'dahoot_players',
    type: 'base',
    fields: [
      { name: 'room_id', type: 'relation', required: true, maxSelect: 1, collectionId: roomsCol.id, cascadeDelete: true },
      { name: 'name', type: 'text', required: true, min: 1, max: 15 },
      { name: 'score', type: 'number', required: false, noDecimal: true },
      { name: 'last_answered_index', type: 'number', required: false, noDecimal: true },
      { name: 'answers', type: 'json', required: false },
      { name: 'lap_question_ids', type: 'json', required: false },
      { name: 'marathon_stats', type: 'json', required: false },
      { name: 'session_start_time', type: 'text', required: false },
      { name: 'last_answer_time', type: 'text', required: false },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: ''
  });

  // 6. Setup 'dahoot_questions' collection
  await getOrCreateCollection('dahoot_questions', {
    name: 'dahoot_questions',
    type: 'base',
    fields: [
      { name: 'game_id', type: 'relation', required: true, maxSelect: 1, collectionId: gamesCol.id, cascadeDelete: true },
      { name: 'text', type: 'text', required: true },
      { name: 'options', type: 'json', required: true },
      { name: 'correct_option_index', type: 'number', required: false, noDecimal: true },
      { name: 'type', type: 'select', required: true, maxSelect: 1, values: ['MULTIPLE_CHOICE', 'SORTING', 'DRAG_DROP', 'DROP_DOWN', 'CATEGORIZE', 'DISCUSSION'] },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != "" && (@request.auth.dahoot_info.role = "TEACHER" || @request.auth.dahoot_info.role = "ADMIN")',
    updateRule: '@request.auth.id != "" && (@request.auth.dahoot_info.role = "TEACHER" || @request.auth.dahoot_info.role = "ADMIN")',
    deleteRule: '@request.auth.id != "" && (@request.auth.dahoot_info.role = "TEACHER" || @request.auth.dahoot_info.role = "ADMIN")'
  });

  // 6b. Upsert admin user (dev-only)
  if (isDev) {
    const schoolDomain = process.env.SCHOOL_EMAIL_DOMAIN;
    if (!schoolDomain) {
      console.error('\x1b[31m[Dahoot DB] Error: SCHOOL_EMAIL_DOMAIN must be defined in .env for dev admin user creation\x1b[0m');
      process.exit(1);
    }
    const adminUserEmail = `dahoot@${schoolDomain}`;
    const adminUserPassword = process.env.DAHOOT_ADMIN_PASSWORD || 'changeme';
    if (adminUserPassword === 'changeme') {
      console.warn('\x1b[33m[Dahoot DB] WARNING: Using default admin password "changeme". Please set DAHOOT_ADMIN_PASSWORD in your environment.\x1b[0m');
    }
    
    try {
      const existingUser = await pb.collection('users').getFirstListItem(`email = "${adminUserEmail}"`);
      console.log(`[Dahoot DB] Admin user '${adminUserEmail}' already exists, skipping password reset.`);
      
      if (existingUser.dahoot_info) {
        await pb.collection('dahoot_user_info').update(existingUser.dahoot_info, { role: 'ADMIN' });
        console.log(`\x1b[32m[Dahoot DB] Admin user '${adminUserEmail}' role set to ADMIN.\x1b[0m`);
      }
    } catch (err) {
      console.log(`[Dahoot DB] Admin user '${adminUserEmail}' not found, creating...`);
      try {
        const userInfoRecord = await pb.collection('dahoot_user_info').create({ role: 'ADMIN' });
        await pb.collection('users').create({
          email: adminUserEmail,
          password: adminUserPassword,
          passwordConfirm: adminUserPassword,
          dahoot_info: userInfoRecord.id
        });
        console.log(`\x1b[32m[Dahoot DB] Admin user '${adminUserEmail}' created successfully with password 'changeme'.\x1b[0m`);
      } catch (createErr) {
        console.error(`\x1b[31m[Dahoot DB] Error creating admin user:\x1b[0m`, createErr.message);
      }
    }
  }

  // 7. Seed default games, questions, and options (if --erase or if DB is empty)
  const gamesCount = (await pb.collection('dahoot_games').getList(1, 1)).totalItems;
  if (isErase || gamesCount === 0) {
    try {
      if (isErase) {
        console.log("[Dahoot DB] --erase flag detected. Seeding default options & games...");
      } else {
        console.log("[Dahoot DB] Empty database detected. Seeding default options & games...");
      }

      const existingOptions = (await pb.collection('dahoot_options').getList(1, 1)).totalItems;
      if (existingOptions === 0) {
        console.log("[Dahoot DB] Seeding default options...");
        const defaultSubjects = ['Math', 'Science', 'English', 'History', 'Geography', 'Foreign Languages', 'Other'];
        const defaultCefr = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const defaultLanguages = ['English', 'Thai', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Other'];

        for (const sub of defaultSubjects) {
          await pb.collection('dahoot_options').create({ type: 'subject', value: sub });
        }
        for (const lvl of defaultCefr) {
          await pb.collection('dahoot_options').create({ type: 'cefr_level', value: lvl });
        }
        for (const lang of defaultLanguages) {
          await pb.collection('dahoot_options').create({ type: 'language', value: lang });
        }
      }

      console.log(`[Dahoot DB] Seeding ${SEED_GAMES.length} games and their questions...`);
      for (const gameEntry of SEED_GAMES) {
        const { questions, ...gameData } = gameEntry;
        const newGame = await pb.collection('dahoot_games').create(gameData);
        console.log(`[Dahoot DB] Created game: "${newGame.title}" (${questions?.length || 0} questions)`);
        
        if (Array.isArray(questions)) {
          for (const q of questions) {
            await pb.collection('dahoot_questions').create({
              ...q,
              game_id: newGame.id
            });
          }
        }
      }
      console.log("\x1b[32m[Dahoot DB] Seed games, questions, and options loaded successfully!\x1b[0m");
    } catch (err) {
      console.error("[Dahoot DB] Error seeding games/questions:", err.message);
    }
  } else {
    console.log("[Dahoot DB] Database already contains games: Skipping database seeding (use --erase to re-seed).");
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
