import { pb } from '../pb';

/**
 * Generates a unique 4-digit room PIN against all existing dahoot_rooms
 * (idx_rooms_code is unique across all statuses, including FINISHED).
 */
export async function generateUniquePin(maxAttempts = 25) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      await pb.collection('dahoot_rooms').getFirstListItem(
        pb.filter('code = {:code}', { code: pin })
      );
      // Code is already in use; retry
    } catch (err) {
      if (err?.status === 404) {
        return pin;
      }
      throw err;
    }
  }
  throw new Error('Could not generate a unique 4-digit room PIN. Please try again.');
}

