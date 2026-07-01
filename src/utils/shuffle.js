/**
 * Deterministically shuffles an array based on a string seed.
 * Returns an array of objects: { item: T, originalIdx: number }
 *
 * @template T
 * @param {T[]} array
 * @param {string} seed
 * @returns {{ item: T, originalIdx: number }[]}
 */
export function deterministicShuffle(array, seed) {
  if (!Array.isArray(array)) return [];
  const shuffled = array.map((item, index) => ({ item, originalIdx: index }));
  if (!seed) return shuffled;

  // Simple string hash (djb2-like or similar)
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }

  // Fisher-Yates shuffle using deterministic random sequence generated from hash
  let state = hash >>> 0;
  // A simple seedable LCG to generate pseudo-random numbers
  const nextRandom = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const r = Math.floor(nextRandom() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[r];
    shuffled[r] = temp;
  }

  return shuffled;
}
