import * as THREE from 'three';
import { state, PHASE, resetForNewGame } from './state.js';
import { createRenderer } from './renderer.js';
import { setupScene, createStarfield } from './scene.js';
import { createPlayer } from './player.js';
import { createBulletPool } from './bullets.js';
import { createEnemyManager } from './enemies.js';
import { createParticleSystem } from './particles.js';
import { createPowerUpManager } from './powerups.js';
import { aabbOverlap } from './collision.js';
import { addKill, resetStreak } from './score.js';

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
const particles = createParticleSystem(scene);
const powerups = createPowerUpManager(scene);

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

    particles.update(dt);
    powerups.update(dt);

    // Player bullets vs enemies
    for (let i = bullets.activeBullets.length - 1; i >= 0; i--) {
      const b = bullets.activeBullets[i];
      if (b.owner !== 'player') continue;
      const bb = { x: b.mesh.position.x, y: b.mesh.position.y, hw: 0.15, hh: 0.15 };
      for (let j = enemies.active.length - 1; j >= 0; j--) {
        const e = enemies.active[j];
        if (aabbOverlap(bb, enemies.getBBox(e))) {
          e.hp--;
          bullets.recycleBullet(b);
          if (e.hp <= 0) {
            addKill(e.type, Date.now());
            particles.explode(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, 8, 0xff6600);
            powerups.trySpawn(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z);
            enemies.remove(e);
          }
          break;
        }
      }
    }

    // Enemy bullets vs player
    const playerBB = player.getBBox();
    for (let i = bullets.activeBullets.length - 1; i >= 0; i--) {
      const b = bullets.activeBullets[i];
      if (b.owner !== 'enemy') continue;
      if (aabbOverlap({ x: b.mesh.position.x, y: b.mesh.position.y, hw: 0.1, hh: 0.1 }, playerBB)) {
        bullets.recycleBullet(b);
        if (player.takeDamage()) {
          resetStreak();
          particles.explode(player.mesh.position.x, player.mesh.position.y, 0, 12, 0xffffff);
        }
      }
    }

    // Enemies vs player (body collision)
    for (const e of enemies.active) {
      if (aabbOverlap(enemies.getBBox(e), playerBB)) {
        enemies.remove(e);
        if (player.takeDamage()) {
          resetStreak();
          particles.explode(player.mesh.position.x, player.mesh.position.y, 0, 12, 0xffffff);
        }
      }
    }

    // Player collects power-up
    for (let i = powerups.active.length - 1; i >= 0; i--) {
      if (aabbOverlap(powerups.getBBox(powerups.active[i]), playerBB)) {
        powerups.collect(powerups.active[i]);
        // TODO: play power-up sound (Task 14)
      }
    }
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

document.addEventListener('keydown', e => {
  if (e.code === 'KeyB' && state.hasBomb) {
    state.hasBomb = false;
    enemies.clear();
  }
});

document.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (state.hasBomb) { state.hasBomb = false; enemies.clear(); }
});
