import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export function checkUsageReport() {
  if (!__ENV.K6_NO_USAGE_REPORT) {
    throw new Error('Usage reporting must be disabled. Set K6_NO_USAGE_REPORT=true');
  }
}

export function randomK6Name(prefix) {
  return `k6-${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function jsonHeaders() {
  return { 'Content-Type': 'application/json' };
}

export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}
