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
  lives: 3,
  level: 1,
  wave: 0,
  multiplier: 1,
  killStreak: 0,
  lastKillTime: 0,
  invincible: false,
  invincibleUntil: 0,
  activePowerUps: {},
  hasBomb: false,
};

export function resetForNewGame() {
  state.phase = PHASE.PLAYING;
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.wave = 0;
  state.multiplier = 1;
  state.killStreak = 0;
  state.lastKillTime = 0;
  state.invincible = false;
  state.invincibleUntil = 0;
  state.activePowerUps = {};
  state.hasBomb = false;
}
