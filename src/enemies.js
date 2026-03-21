import * as THREE from 'three';
import { state } from './state.js';

const MESHES = {
  grunt:    () => new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8), new THREE.MeshBasicMaterial({color:0xff8800,emissive:0x442200,emissiveIntensity:1})),
  weaver:   () => new THREE.Mesh(new THREE.OctahedronGeometry(0.6),  new THREE.MeshBasicMaterial({color:0xffff44,emissive:0x664400,emissiveIntensity:1})),
  shooter:  () => new THREE.Mesh(new THREE.DodecahedronGeometry(0.6),new THREE.MeshBasicMaterial({color:0xff44cc,emissive:0x442266,emissiveIntensity:1})),
  kamikaze: () => new THREE.Mesh(new THREE.TetrahedronGeometry(0.7), new THREE.MeshBasicMaterial({color:0xff4444,emissive:0x442200,emissiveIntensity:1})),};

export function createEnemyManager(scene) {
  const active = []; // { mesh, type, hp, phase, phaseTimer, spawnX, age }

  function spawn(type, x, y) {
    const mesh = MESHES[type](); mesh.layers.set(1);
    mesh.position.set(x, y, -60);
    scene.add(mesh);
    active.push({ mesh, type, hp: type === 'kamikaze' ? 1 : 2, phase: 0, phaseTimer: 0, spawnX: x, age: 0 });
  }

  function remove(enemy) {
    scene.remove(enemy.mesh);
    enemy.mesh.geometry.dispose();
    enemy.mesh.material.dispose();
    const idx = active.indexOf(enemy);
    if (idx !== -1) active.splice(idx, 1);
  }

  return {
    active,
    spawn,
    remove,

    update(dt, playerX, playerY, onShoot) {
      const levelSpeed = 12 + (state.level - 1) * 3; // +3 per level: L1=12, L2=15, L3=18
      for (let i = active.length - 1; i >= 0; i--) {
        const e = active[i];
        e.age += dt;
        e.mesh.rotation.y += dt * 1.5;
        e.mesh.position.z += levelSpeed * dt; // fly toward player

        switch (e.type) {
          case 'grunt':
            // Fly straight
            break;
          case 'weaver':
            e.mesh.position.x = e.spawnX + Math.sin(e.age * 2.5) * 3;
            break;
          case 'shooter':
            if (e.phase === 0 && e.mesh.position.z >= -15) {
              e.mesh.position.z = -15;
              e.phase = 1;
            } else if (e.phase === 1) {
              e.mesh.position.z -= 12 * dt;
              if ((e.phaseTimer += dt) > 1.5) {
                e.phaseTimer = 0;
                onShoot(e.mesh.position.x, e.mesh.position.y, playerX, playerY);
              }
              if (e.age > 4) e.phase = 2;
            } else if (e.phase === 2) {
              e.mesh.position.z -= 20 * dt;
            }
            break;
          case 'kamikaze':
            // Fast dive toward player
            {
              const dx = playerX - e.mesh.position.x;
              const dy = playerY - e.mesh.position.y;
              e.mesh.position.x += dx * 2 * dt;
              e.mesh.position.y += dy * 2 * dt;
              e.mesh.position.z += 10 * dt; // extra speed
            }
            break;
        }

        // Remove if past player or off-screen
        if (e.mesh.position.z > 5 || e.mesh.position.z < -120) {
          remove(e);
        }
      }
    },

    getBBox(enemy) {
      return { x: enemy.mesh.position.x, y: enemy.mesh.position.y, hw: 0.6, hh: 0.6 };
    },

    clear() {
      for (let i = active.length - 1; i >= 0; i--) {
        scene.remove(active[i].mesh);
        active[i].mesh.geometry.dispose();
        active[i].mesh.material.dispose();
      }
      active.length = 0;
    },
  };
}
