import PocketBase from 'pocketbase';

// Use the configured PocketBase URL with a local fallback.
const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);
