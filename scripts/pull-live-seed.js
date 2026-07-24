import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(rootDir, '.env') });

const liveUrl = process.env.VITE_POCKETBASE_LIVE_URL;
const liveEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const livePassword = process.env.POCKETBASE_ADMIN_PASSWORD;

console.log(`Connecting to Live PB at ${liveUrl}...`);
const pb = new PocketBase(liveUrl);

async function main() {
  try {
    try {
      await pb.collection('_superusers').authWithPassword(liveEmail, livePassword);
    } catch {
      await pb.admins.authWithPassword(liveEmail, livePassword);
    }
    console.log('Authenticated successfully on Live server!');

    const games = await pb.collection('dahoot_games').getFullList({ sort: '-created' });
    console.log(`Fetched ${games.length} games.`);

    const questions = await pb.collection('dahoot_questions').getFullList({ sort: 'created' });
    console.log(`Fetched ${questions.length} questions.`);

    const structuredSeed = games.map(game => {
      const gameQuestions = questions
        .filter(q => q.game_id === game.id)
        .map(q => {
          const { id, created, updated, collectionId, collectionName, game_id, ...cleanQ } = q;
          return cleanQ;
        });

      const { id, created, updated, collectionId, collectionName, creator, ...cleanGame } = game;
      return {
        ...cleanGame,
        creator: 'System',
        questions: gameQuestions
      };
    });

    const outputPath = path.resolve(rootDir, 'src', 'data', 'seed-games.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(structuredSeed, null, 2));

    console.log(`🎉 Successfully saved ${structuredSeed.length} games and ${questions.length} questions to ${outputPath}`);
  } catch (err) {
    console.error('Error fetching live seed data:', err);
    process.exit(1);
  }
}

main();
