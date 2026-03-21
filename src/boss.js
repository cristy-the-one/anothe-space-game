import * as THREE from 'three';

const BOSS_HP = [200, 150, 120]; // HP per level

function buildBossMesh(levelIdx) {
  const g = new THREE.Group();
  const colors = [0xff2200, 0xff6600, 0xff0088];
  const c = colors[levelIdx % colors.length];
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), new THREE.MeshLambertMaterial({color: c, emissive: 0x220000}));
  g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.15, 6, 16), new THREE.MeshBasicMaterial({color: c, wireframe: true}));
  ring.rotation.x = Math.PI / 3;
  g.add(ring);
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 0.3), new THREE.MeshLambertMaterial({color: c}));
  g.add(arm1);
  const arm2 = arm1.clone();
  arm2.rotation.z = Math.PI / 2;
  g.add(arm2);
  g.traverse(child => { if (child.isMesh) child.layers.set(1); });
  return { group: g, ring };
}

export function createBoss(scene, levelIdx) {
  const maxHp = BOSS_HP[levelIdx] ?? 150;
  let hp = maxHp;
  const { group, ring } = buildBossMesh(levelIdx);
  group.position.set(0, 0, -25);
  scene.add(group);

  let phase = 0; // 0, 1, 2
  let shootTimer = 0;
  let age = 0;
  let alive = true;

  function getPhase() {
    if (hp / maxHp > 0.66) return 0;
    if (hp / maxHp > 0.33) return 1;
    return 2;
  }

  return {
    get alive() { return alive; },
    get hpFraction() { return Math.max(0, hp / maxHp); },

    takeDamage(dmg = 1) {
      if (!alive) return;
      hp -= dmg;
      if (hp <= 0) { alive = false; scene.remove(group); }
    },

    getBBox() {
      return { x: group.position.x, y: group.position.y, hw: 1.5, hh: 1.5 };
    },

    update(dt, playerX, playerY, onShoot) {
      if (!alive) return;
      age += dt;
      phase = getPhase();
      ring.rotation.z += dt * (1 + phase * 0.5);
      group.rotation.y += dt * 0.4;

      // Erratic movement in phase 2, gentle drift otherwise
      const targetX = phase === 2
        ? Math.sin(age * 3.0) * 5
        : Math.sin(age * 0.8) * 4;
      const targetY = Math.sin(age * (phase === 2 ? 2.5 : 1.0)) * 2;
      group.position.x += (targetX - group.position.x) * 2 * dt;
      group.position.y += (targetY - group.position.y) * 2 * dt;

      // Shooting
      const fireRate = [1.5, 1.0, 0.5][phase];
      shootTimer += dt;
      if (shootTimer >= fireRate) {
        shootTimer = 0;
        const bx = group.position.x, by = group.position.y;

        if (phase === 0) {
          // Spread shot: 5 bullets
          for (let a = -2; a <= 2; a++) {
            onShoot(bx + a * 0.5, by, playerX + a * 2, playerY);
          }
        } else if (phase === 1) {
          // Phase 1: spread + homing (straight at player)
          for (let a = -2; a <= 2; a++) {
            onShoot(bx + a * 0.5, by, playerX + a * 2, playerY);
          }
          onShoot(bx, by, playerX, playerY); // direct homing shot
        } else {
          // Phase 2: rapid multi-direction
          for (let a = -3; a <= 3; a++) {
            onShoot(bx + a * 0.4, by, playerX + a * 1.5, playerY);
          }
          onShoot(bx, by, playerX, playerY);
          onShoot(bx, by, playerX, playerY + 1);
        }
      }
    },
  };
}
