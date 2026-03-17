import * as THREE from 'three';
import { state, PHASE, resetForNewGame } from './state.js';
import { createRenderer } from './renderer.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 8);
camera.lookAt(0, 0, 0);

const { composer, crtPass } = createRenderer(scene, camera);

let lastTime = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  crtPass.uniforms.time.value = now * 0.001;
  composer.render();
}
requestAnimationFrame(loop);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && state.phase === PHASE.MENU) {
    document.getElementById('screen-overlay').classList.add('hidden');
    resetForNewGame();
  }
});
