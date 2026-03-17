import * as THREE from 'three';
import { state, PHASE, resetForNewGame } from './state.js';

console.log('Three.js loaded:', THREE.REVISION);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && state.phase === PHASE.MENU) {
    document.getElementById('screen-overlay').classList.add('hidden');
    resetForNewGame();
  }
});
