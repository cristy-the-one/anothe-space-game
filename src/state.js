export const PHASE = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  BOSS_FIGHT: 'BOSS_FIGHT',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
  GAME_OVER: 'GAME_OVER',
};

export const state = {
  phase: PHASE.MENU,
  score: 0,
  hiScore: parseInt(localStorage.getItem('hiScore') || '0'),
  lives: 20,
  level: 1,       // 1-3
  wave: 0,        // 0-4 within a level
  multiplier: 1,  // 1, 2, or 4
  killStreak: 0,  // consecutive kills toward next multiplier step
  lastKillTime: 0,
  invincible: false,
  invincibleUntil: 0,
  activePowerUps: {}, // { spreadShot: expiry_ms, rapidFire: expiry_ms, shield: true, speedBoost: expiry_ms }
  hasBomb: false,
  shakeIntensity: 0,
};

export function resetForNewGame() {
  state.phase = PHASE.PLAYING;
  state.score = 0;
  state.lives = 20;
  state.level = 1;
  state.wave = 0;
  state.multiplier = 1;
  state.killStreak = 0;
  state.lastKillTime = 0;
  state.invincible = false;
  state.invincibleUntil = 0;
  state.activePowerUps = {};
  state.hasBomb = false;
  state.shakeIntensity = 0;
}
