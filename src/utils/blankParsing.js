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
  const m = part.match(/\[blank(\d+)\]/i);
  return m ? parseInt(m[1], 10) : null;
}

export function splitCurlyTokens(sentence) {
  if (!sentence) return [];
  // Split on {{...}} or {...}
  return sentence.split(/(\{\{[^}]+\}\}|\{[^}]+\})/g);
}

export function getCurlyInner(part) {
  if (!part) return null;
  const m = part.match(/\{\{([^}]+)\}\}|\{([^}]+)\}/);
  return m ? (m[1] || m[2]) : null;
}

export function getCurlyIndex(part) {
  if (!part) return null;
  const m = part.match(/\{\{(\d+)\}\}|\{(\d+)\}/);
  return m ? parseInt(m[1] || m[2], 10) : null;
}

export function isCurlyIndex(part) {
  return getCurlyIndex(part) !== null;
}
