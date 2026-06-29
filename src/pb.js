import PocketBase from 'pocketbase';

// Fallback to local default PocketBase port, or use the environmental variable if set.
const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
export const pb = new PocketBase(pbUrl);
