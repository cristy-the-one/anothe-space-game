import { state } from './state.js';

const $ = id => document.getElementById(id);

export function createUI() {
  const overlay      = $('screen-overlay');
  const scoreVal     = $('score-value');
  const hiScoreVal   = $('hiscore-value');
  const livesVal     = $('lives-value');
  const levelVal     = $('level-value');
  const multVal      = $('multiplier-value');
  const hiDisplay    = $('hiscore-display');

  hiDisplay.textContent = `HI-SCORE: ${state.hiScore}`;
  hiScoreVal.textContent = state.hiScore;

  return {
    update() {
      scoreVal.textContent   = state.score;
      hiScoreVal.textContent = state.hiScore;
      livesVal.textContent   = '♦ '.repeat(state.lives).trim() || '---';
      levelVal.textContent   = `LEVEL ${state.level}`;
      multVal.textContent    = state.multiplier > 1 ? `×${state.multiplier}` : '';
    },

    showMenu() {
      overlay.classList.remove('hidden');
      overlay.innerHTML = `
        <h1>SPACE RAILS</h1>
        <p>WASD / ARROWS — MOVE<br>SPACE / CLICK — SHOOT<br>B / RIGHT CLICK — BOMB</p>
        <p>HI-SCORE: ${state.hiScore}</p>
        <p style="animation:blink 1s step-end infinite">PRESS ENTER TO START</p>`;
    },

    showLevelClear(levelNum) {
      overlay.classList.remove('hidden');
      overlay.innerHTML = `
        <h1 style="font-size:20px">LEVEL ${levelNum} CLEAR!</h1>
        <p>SCORE: ${state.score}</p>
        <p style="animation:blink 1s step-end infinite">PRESS ENTER TO CONTINUE</p>`;
    },

    showGameOver(victory = false) {
      overlay.classList.remove('hidden');
      const newHi = state.score >= state.hiScore;
      overlay.innerHTML = `
        <h1 style="font-size:${victory?'20px':'24px'};color:${victory?'#ffff00':'#ff4444'}">${victory ? 'YOU WIN!' : 'GAME OVER'}</h1>
        ${newHi ? '<p style="color:#ffff00">NEW HI-SCORE!</p>' : ''}
        <p>SCORE: ${state.score}</p>
        <p>HI-SCORE: ${state.hiScore}</p>
        <p style="animation:blink 1s step-end infinite">PRESS ENTER TO CONTINUE</p>`;
    },

    hideLevelScreen() {
      overlay.classList.add('hidden');
    },
  };
}
