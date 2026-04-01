import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { state } from './state.js';

const TYPES = ['spreadShot', 'shield', 'speedBoost', 'rapidFire', 'bomb'];
const COLORS = { spreadShot: 0xffff00, shield: 0x00aaff, speedBoost: 0x00ffaa, rapidFire: 0xff8800, bomb: 0xff0055 };
const LABELS = { spreadShot: 'SPREAD', shield: 'SHIELD', speedBoost: 'SPEED', rapidFire: 'RAPID', bomb: 'BOMB' };
const DURATION = { spreadShot: 10000, speedBoost: 8000, rapidFire: 10000 };

function colorHex(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

function makeLabel(type) {
  const div = document.createElement('div');
  div.textContent = LABELS[type];
  div.style.cssText = `font: bold 11px monospace; color: ${colorHex(COLORS[type])}; pointer-events: none; text-shadow: 0 0 4px ${colorHex(COLORS[type])};`;
  const obj = new CSS2DObject(div);
  obj.position.set(0, 0.7, 0);
  return obj;
}

export function createPowerUpManager(scene) {
  const active = []; // { mesh, type, age, label }

  function trySpawn(x, y, z) {
    if (Math.random() > 0.15) return;
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35),
      new THREE.MeshBasicMaterial({ color: COLORS[type], wireframe: true })
    );
    mesh.position.set(x, y, z);
    const label = makeLabel(type);
    mesh.add(label);
    scene.add(mesh);
    active.push({ mesh, type, age: 0, label });
  }

  function collect(pu) {
    pu.mesh.remove(pu.label);
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
        pu.mesh.position.z += 8 * dt;
        pu.mesh.position.y += Math.sin(pu.age * 3) * 0.01;

        if (pu.mesh.position.z > 5 || pu.age > 12) {
          pu.mesh.remove(pu.label);
          scene.remove(pu.mesh);
          pu.mesh.geometry.dispose();
          active.splice(i, 1);
        }
      }
    },

    clear() {
      for (const pu of active) {
        pu.mesh.remove(pu.label);
        scene.remove(pu.mesh);
        pu.mesh.geometry.dispose();
      }
      active.length = 0;
      state.activePowerUps = {};
      state.hasBomb = false;
    },
  };
}
