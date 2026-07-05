// Utility helpers for parsing blank and dropdown tokens in question sentences
export function splitBracketTokens(sentence) {
  if (!sentence) return [];
  return sentence.split(/(\[[^\]]+\])/g);
}

export function getBracketInner(part) {
  if (!part) return null;
  const m = part.match(/\[([^\]]+)\]/);
  return m ? m[1] : null;
}

export function getBlankIndex(part) {
  if (!part) return null;
  const m = part.match(/\[(blank|answer)?(\d+)\]/i);
  if (m) {
    const prefix = (m[1] || '').toLowerCase();
    const num = parseInt(m[2], 10);
    if (prefix === 'answer') {
      return num - 1; // 1-based to 0-based
    }
    return num; // blank0, blank1 -> 0, 1
  }
  return null;
}

export function splitCurlyTokens(sentence) {
  if (!sentence) return [];
  // Split on {{...}}, {...}, or [dropdown...]
  return sentence.split(/(\{\{[^}]+\}\}|\{[^}]+\}|\[dropdown\d+\])/ig);
}

export function getCurlyInner(part) {
  if (!part) return null;
  const m = part.match(/\{\{([^}]+)\}\}|\{([^}]+)\}|\[dropdown(\d+)\]/i);
  if (m) {
    if (m[3] !== undefined) {
      return `dropdown${m[3]}`;
    }
    return m[1] || m[2];
  }
  return null;
}

export function getCurlyIndex(part) {
  if (!part) return null;
  const m = part.match(/\{\{(\d+)\}\}|\{(\d+)\}|\[dropdown(\d+)\]/i);
  if (m) {
    if (m[3] !== undefined) {
      return parseInt(m[3], 10) - 1; // 1-based to 0-based
    }
    return parseInt(m[1] || m[2], 10);
  }
  return null;
}

export function isCurlyIndex(part) {
  return getCurlyIndex(part) !== null;
}

