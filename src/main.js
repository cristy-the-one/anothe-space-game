import * as THREE from 'three';
import { state, PHASE, resetForNewGame } from './state.js';
import { createRenderer } from './renderer.js';
import { setupScene, createStarfield } from './scene.js';
import { createPlayer } from './player.js';
import { createBulletPool } from './bullets.js';
import { createEnemyManager } from './enemies.js';

const FIRE_RATE = 0.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 8);
camera.lookAt(0, 0, 0);

const { composer, crtPass } = createRenderer(scene, camera);

setupScene(scene);
const starfield = createStarfield(scene);
const player = createPlayer(scene);
const bullets = createBulletPool(scene);
const enemies = createEnemyManager(scene);

// Temporary: spawn a few enemies to test
setTimeout(() => {
  if (state.phase === PHASE.PLAYING || state.phase === PHASE.BOSS_FIGHT) {
    enemies.spawn('grunt',  -3, 1);
    enemies.spawn('weaver',  0, 0);
    enemies.spawn('shooter', 3, -1);
    enemies.spawn('kamikaze', 1, 2);
  }
}, 2000);

let lastTime = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  crtPass.uniforms.time.value = now * 0.001;

  starfield.update(dt, 20);

  if (state.phase === PHASE.PLAYING || state.phase === PHASE.BOSS_FIGHT) {
    player.update(dt);
    bullets.update(dt);

    // Player shooting
    if (player.shooting.active && player.shootCooldown <= 0) {
      const fireRate = FIRE_RATE / (state.activePowerUps.rapidFire ? 2 : 1);
      player.shootCooldown = fireRate;
      const px = player.mesh.position.x, py = player.mesh.position.y;
      if (state.activePowerUps.spreadShot) {
        bullets.spawnPlayerBullet(px, py, -0.3);
        bullets.spawnPlayerBullet(px, py, 0);
        bullets.spawnPlayerBullet(px, py, 0.3);
      } else {
        bullets.spawnPlayerBullet(px, py);
      }
    }

    enemies.update(dt, player.mesh.position.x, player.mesh.position.y,
      (ex, ey, px, py) => bullets.spawnEnemyBullet(ex, ey, px, py));
  }

  composer.render();
}
requestAnimationFrame(loop);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && state.phase === PHASE.MENU) {
    document.getElementById('screen-overlay').classList.add('hidden');
    resetForNewGame();
  }
});
