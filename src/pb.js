import PocketBase from 'pocketbase';

// Determine if we are in development mode based on Vite's DEV flag or VITE_ENV environment variable.
const isDev = import.meta.env.DEV || import.meta.env.VITE_ENV === 'development';

// Use the appropriate PocketBase URL with fallbacks.
const pbUrl = isDev
  ? (import.meta.env.VITE_POCKETBASE_DEV_URL || 'http://127.0.0.1:8090')
  : (import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

export const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);
