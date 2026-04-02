import * as THREE from 'three';
import { state } from './state.js';

const BOUNDS = { x: 7, y: 4.5 };
const BASE_SPEED = 12;

function buildShipMesh() {
  const group = new THREE.Group();
  // Body
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 1.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x00ff41, emissive: 0x003300 })
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);
  // Wings
  const wingGeo = new THREE.BoxGeometry(1.6, 0.08, 0.5);
  const wingMat = new THREE.MeshLambertMaterial({ color: 0x00cc33 });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.z = 0.2;
  group.add(wings);
  // Engine glow
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  );
  glow.position.z = 0.7;
  group.add(glow);
  return group;
}

export function createPlayer(scene) {
  const mesh = buildShipMesh();
  mesh.position.set(0, 0, 0);
  scene.add(mesh);

  // Input state
  const keys = {};
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) {
      useMouseMove = false;
    }
  });
  document.addEventListener('keyup',   e => keys[e.code] = false);

  // Mouse / touch position (normalized to game bounds)
  let mouseTarget = { x: 0, y: 0 };
  let useMouseMove = false;

  function clientToGame(clientX, clientY) {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    return {
      x: ((clientX - cx) / cx) * BOUNDS.x,
      y: -((clientY - cy) / cy) * BOUNDS.y,
    };
  }

  document.addEventListener('mousemove', e => {
    useMouseMove = true;
    Object.assign(mouseTarget, clientToGame(e.clientX, e.clientY));
  });

  // Touch: primary finger moves + auto-fires; second finger triggers bomb flag
  const shooting = { active: false, bombRequested: false };
  let touchDragOffset = { x: 0, y: 0 };

  document.addEventListener('touchstart', e => {
    e.preventDefault();
    useMouseMove = true;
    shooting.active = true;
    const t = e.touches[0];
    const gamePos = clientToGame(t.clientX, t.clientY);
    // Record offset so ship doesn't snap to finger — it stays where it is relative to touch point
    touchDragOffset.x = mesh.position.x - gamePos.x;
    touchDragOffset.y = mesh.position.y - gamePos.y;
    mouseTarget.x = mesh.position.x;
    mouseTarget.y = mesh.position.y;
    if (e.touches.length >= 2) shooting.bombRequested = true;
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    const gamePos = clientToGame(t.clientX, t.clientY);
    mouseTarget.x = gamePos.x + touchDragOffset.x;
    mouseTarget.y = gamePos.y + touchDragOffset.y;
  }, { passive: false });

  document.addEventListener('touchend', e => {
    e.preventDefault();
    if (e.touches.length === 0) shooting.active = false;
  }, { passive: false });

  document.addEventListener('keydown', e => { if (e.code === 'Space') shooting.active = true; });
  document.addEventListener('keyup',   e => { if (e.code === 'Space') shooting.active = false; });
  document.addEventListener('mousedown', e => { if (e.button === 0) shooting.active = true; });
  document.addEventListener('mouseup',   e => { if (e.button === 0) shooting.active = false; });

  return {
    mesh,
    shooting,
    shootCooldown: 0,

    update(dt) {
      if (state.invincible && Date.now() > state.invincibleUntil) {
        state.invincible = false;
      }

      // Flash when invincible
      mesh.visible = !state.invincible || (Math.floor(Date.now() / 100) % 2 === 0);

      const speed = BASE_SPEED * (state.activePowerUps.speedBoost ? 1.5 : 1.0);

      if (useMouseMove) {
        // Lerp toward mouse position
        mesh.position.x += (mouseTarget.x - mesh.position.x) * 8 * dt;
        mesh.position.y += (mouseTarget.y - mesh.position.y) * 8 * dt;
      } else {
        if (keys['KeyA'] || keys['ArrowLeft'])  mesh.position.x -= speed * dt;
        if (keys['KeyD'] || keys['ArrowRight']) mesh.position.x += speed * dt;
        if (keys['KeyW'] || keys['ArrowUp'])    mesh.position.y += speed * dt;
        if (keys['KeyS'] || keys['ArrowDown'])  mesh.position.y -= speed * dt;
      }

      // Clamp to bounds
      mesh.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, mesh.position.x));
      mesh.position.y = Math.max(-BOUNDS.y, Math.min(BOUNDS.y, mesh.position.y));

      // Tilt in movement direction
      mesh.rotation.z = (useMouseMove
        ? (mouseTarget.x - mesh.position.x) * -0.05
        : ((keys['KeyD'] || keys['ArrowRight']) ? -0.3 : (keys['KeyA'] || keys['ArrowLeft']) ? 0.3 : 0));

      this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    },

    getBBox() {
      return { x: mesh.position.x, y: mesh.position.y, hw: 0.5, hh: 0.4 };
    },

    takeDamage() {
      if (state.invincible) return false;
      if (state.activePowerUps.shield) {
        delete state.activePowerUps.shield;
        return false; // absorbed
      }
      state.lives = Math.max(0, state.lives - 1);
      state.invincible = true;
      state.invincibleUntil = Date.now() + 2000;
      return true; // hit registered
    },

    reset() {
      mesh.position.set(0, 0, 0);
      this.shootCooldown = 0;
      mesh.visible = true;
      mesh.rotation.z = 0;
    },
  };
}
