import * as THREE from 'three';
import { state } from './state.js';

const TYPES = ['spreadShot', 'shield', 'speedBoost', 'rapidFire', 'bomb'];
const COLORS = { spreadShot: 0xffff00, shield: 0x00aaff, speedBoost: 0x00ffaa, rapidFire: 0xff8800, bomb: 0xff0055 };
const DURATION = { spreadShot: 10000, speedBoost: 8000, rapidFire: 10000 };

export function createPowerUpManager(scene) {
  const active = []; // { mesh, type, age }

  function trySpawn(x, y, z) {
    if (Math.random() > 0.15) return; // 15% chance
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35),
      new THREE.MeshBasicMaterial({ color: COLORS[type], wireframe: true })
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
    active.push({ mesh, type, age: 0 });
  }

  function collect(pu) {
    scene.remove(pu.mesh);
    pu.mesh.geometry.dispose();
    const idx = active.indexOf(pu);
    if (idx !== -1) active.splice(idx, 1);

    if (pu.type === 'bomb') {
      state.hasBomb = true;
    } else if (pu.type === 'shield') {
      state.activePowerUps.shield = true;
    } else {
      state.activePowerUps[pu.type] = Date.now() + DURATION[pu.type];
    }
  }

  return {
    active,
    trySpawn,
    collect,

    getBBox(pu) {
      return { x: pu.mesh.position.x, y: pu.mesh.position.y, hw: 0.4, hh: 0.4 };
    },

    update(dt) {
      // Expire timed power-ups
      const now = Date.now();
      for (const key of ['spreadShot', 'speedBoost', 'rapidFire']) {
        if (state.activePowerUps[key] && now > state.activePowerUps[key]) {
          delete state.activePowerUps[key];
        }
      }

      for (let i = active.length - 1; i >= 0; i--) {
        const pu = active[i];
        pu.age += dt;
        pu.mesh.rotation.y += dt * 2;
        pu.mesh.position.z += 8 * dt; // drift toward player
        pu.mesh.position.y += Math.sin(pu.age * 3) * 0.01; // float bob

        if (pu.mesh.position.z > 5 || pu.age > 12) {
          scene.remove(pu.mesh);
          pu.mesh.geometry.dispose();
          active.splice(i, 1);
        }
      }
    },

    clear() {
      for (const pu of active) { scene.remove(pu.mesh); pu.mesh.geometry.dispose(); }
      active.length = 0;
      state.activePowerUps = {};
      state.hasBomb = false;
    },
  };
}
