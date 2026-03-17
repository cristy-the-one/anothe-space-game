import * as THREE from 'three';
import { state, PHASE, resetForNewGame } from './state.js';
import { createRenderer } from './renderer.js';
import { setupScene, createStarfield } from './scene.js';
import { createPlayer } from './player.js';
import { createBulletPool } from './bullets.js';
import { createEnemyManager } from './enemies.js';
import { createParticleSystem } from './particles.js';
import { createPowerUpManager } from './powerups.js';
import { createWaveSequencer } from './levels.js';
import { aabbOverlap } from './collision.js';
import { addKill, resetStreak } from './score.js';
import { createBoss } from './boss.js';
import { createUI } from './ui.js';
import { audio } from './audio.js';

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
const sequencer = createWaveSequencer((type, x, y) => enemies.spawn(type, x, y));
let boss = null;
const ui = createUI();

function startBoss() {
  boss = createBoss(scene, state.level - 1);
  state.phase = PHASE.BOSS_FIGHT;
  document.getElementById('boss-bar-container').style.display = 'block';
}

let prevBossPhase = 0;

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
      audio.shoot();
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

    // Wave sequencer (PLAYING state only)
    if (state.phase === PHASE.PLAYING) {
      const result = sequencer.update(dt, enemies.active.length);
      if (result === 'wave_clear') {
        const next = sequencer.nextWave();
        if (next === 'boss_time') startBoss();
      }
    }

    if (state.phase === PHASE.BOSS_FIGHT && boss) {
      boss.update(dt, player.mesh.position.x, player.mesh.position.y,
        (ex, ey, px, py) => bullets.spawnEnemyBullet(ex, ey, px, py));

      const curPhase = boss ? Math.floor((1 - boss.hpFraction) / 0.34) : 0;
      if (boss && curPhase !== prevBossPhase) { prevBossPhase = curPhase; audio.bossPhase(); }

      // Update boss health bar
      document.getElementById('boss-bar-fill').style.width = (boss.hpFraction * 100) + '%';

      // Player bullets vs boss
      for (let i = bullets.activeBullets.length - 1; i >= 0; i--) {
        const b = bullets.activeBullets[i];
        if (b.owner !== 'player') continue;
        if (aabbOverlap({ x: b.mesh.position.x, y: b.mesh.position.y, hw: 0.15, hh: 0.15 }, boss.getBBox())) {
          boss.takeDamage(1);
          bullets.recycleBullet(b);
          if (!boss.alive) {
            addKill('boss', Date.now());
            audio.explodeLarge();
            const { x: bossX, y: bossY } = boss.getBBox();
            particles.explode(bossX, bossY, -25, 40, 0xff4400);
            document.getElementById('boss-bar-container').style.display = 'none';
            boss = null;
            // Level clear
            const next = sequencer.nextLevel();
            if (next === 'victory') {
              state.phase = PHASE.GAME_OVER;
              ui.showGameOver(true);
            } else {
              state.phase = PHASE.LEVEL_CLEAR;
              ui.showLevelClear(state.level);
            }
            break;
          }
        }
      }

      // Boss vs player collision
      if (boss && aabbOverlap(boss.getBBox(), player.getBBox())) {
        if (player.takeDamage()) {
          resetStreak();
          audio.playerHit();
          particles.explode(player.mesh.position.x, player.mesh.position.y, 0, 12, 0xffffff);
          if (state.lives === 0) {
            state.phase = PHASE.GAME_OVER;
            ui.showGameOver(false);
            enemies.clear(); bullets.clear(); powerups.clear(); particles.clear(); boss = null;
            sequencer.reset(); player.reset();
            document.getElementById('boss-bar-container').style.display = 'none';
          }
        }
      }
    }

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
            audio.explodeSmall();
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
          audio.playerHit();
          particles.explode(player.mesh.position.x, player.mesh.position.y, 0, 12, 0xffffff);
          if (state.lives === 0) {
            state.phase = PHASE.GAME_OVER;
            ui.showGameOver(false);
            enemies.clear(); bullets.clear(); powerups.clear(); particles.clear(); boss = null;
            sequencer.reset(); player.reset();
            document.getElementById('boss-bar-container').style.display = 'none';
          }
        }
      }
    }

    // Enemies vs player (body collision)
    for (const e of enemies.active) {
      if (aabbOverlap(enemies.getBBox(e), playerBB)) {
        enemies.remove(e);
        if (player.takeDamage()) {
          resetStreak();
          audio.playerHit();
          particles.explode(player.mesh.position.x, player.mesh.position.y, 0, 12, 0xffffff);
          if (state.lives === 0) {
            state.phase = PHASE.GAME_OVER;
            ui.showGameOver(false);
            enemies.clear(); bullets.clear(); powerups.clear(); particles.clear(); boss = null;
            sequencer.reset(); player.reset();
            document.getElementById('boss-bar-container').style.display = 'none';
          }
        }
      }
    }

    // Player collects power-up
    for (let i = powerups.active.length - 1; i >= 0; i--) {
      if (aabbOverlap(powerups.getBBox(powerups.active[i]), playerBB)) {
        audio.powerUp();
        powerups.collect(powerups.active[i]);
      }
    }
  }

  ui.update();
  composer.render();
}
requestAnimationFrame(loop);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (state.phase === PHASE.MENU) {
      ui.hideLevelScreen();
      resetForNewGame();
      enemies.clear(); bullets.clear(); powerups.clear(); particles.clear();
      sequencer.reset();
      player.reset();
    } else if (state.phase === PHASE.LEVEL_CLEAR) {
      state.level++;
      state.phase = PHASE.PLAYING;
      ui.hideLevelScreen();
    } else if (state.phase === PHASE.GAME_OVER) {
      state.phase = PHASE.MENU;
      ui.showMenu();
    }
  }
  if (e.code === 'KeyB' && state.hasBomb) {
    state.hasBomb = false;
    enemies.clear();
  }
});

document.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (state.hasBomb) { state.hasBomb = false; enemies.clear(); }
});
