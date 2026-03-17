import { state } from './state.js';

/**
 * Returns multiplier (1, 2, or 4) for a given consecutive kill count.
 */
export function calcMultiplier(streak) {
  if (streak >= 10) return 4;
  if (streak >= 5)  return 2;
  return 1;
}

const KILL_POINTS = { grunt: 10, weaver: 25, shooter: 25, kamikaze: 50, boss: 500 };
const STREAK_RESET_MS = 3000;

export function addKill(enemyType, now) {
  // Reset streak if too long since last kill
  if (now - state.lastKillTime > STREAK_RESET_MS) {
    state.killStreak = 0;
  }
  state.killStreak++;
  state.lastKillTime = now;
  state.multiplier = calcMultiplier(state.killStreak);
  const pts = (KILL_POINTS[enemyType] ?? 10) * state.multiplier;
  state.score += pts;
  if (state.score > state.hiScore) {
    state.hiScore = state.score;
    localStorage.setItem('hiScore', state.hiScore);
  }
  return pts;
}

export function resetStreak() {
  state.killStreak = 0;
  state.multiplier = 1;
}
