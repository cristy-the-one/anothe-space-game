import * as THREE from 'three';

const POOL_SIZE = 120;

function makePlayerBulletMesh() {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  );
}

function makeEnemyBulletMesh() {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.6),
    new THREE.MeshBasicMaterial({ color: 0xff6600 })
  );
}

export function createBulletPool(scene) {
  const playerPool = Array.from({ length: POOL_SIZE }, () => {
    const m = makePlayerBulletMesh(); m.visible = false; scene.add(m); return m;
  });
  const enemyPool = Array.from({ length: POOL_SIZE }, () => {
    const m = makeEnemyBulletMesh(); m.visible = false; scene.add(m); return m;
  });

  const activeBullets = []; // { mesh, vx, vy, vz, owner: 'player'|'enemy' }

  function spawnPlayerBullet(x, y, spread = 0) {
    const mesh = playerPool.find(m => !m.visible);
    if (!mesh) return;
    mesh.position.set(x + spread, y, -1);
    mesh.visible = true;
    activeBullets.push({ mesh, vx: spread * 4, vy: 0, vz: -40, owner: 'player' });
  }

  function spawnEnemyBullet(x, y, tx, ty) {
    const mesh = enemyPool.find(m => !m.visible);
    if (!mesh) return;
    mesh.position.set(x, y, 0);
    mesh.visible = true;
    const dx = tx - x, dy = ty - y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    activeBullets.push({ mesh, vx: (dx / len) * 18, vy: (dy / len) * 18, vz: 5, owner: 'enemy' });
  }

  function recycleBullet(b) {
    b.mesh.visible = false;
    const idx = activeBullets.indexOf(b);
    if (idx !== -1) activeBullets.splice(idx, 1);
  }

  return {
    activeBullets,
    spawnPlayerBullet,
    spawnEnemyBullet,
    recycleBullet,

    update(dt) {
      for (let i = activeBullets.length - 1; i >= 0; i--) {
        const b = activeBullets[i];
        b.mesh.position.x += b.vx * dt;
        b.mesh.position.y += b.vy * dt;
        b.mesh.position.z += b.vz * dt;
        // Remove if out of range
        if (b.mesh.position.z < -80 || b.mesh.position.z > 10 ||
            Math.abs(b.mesh.position.x) > 20 || Math.abs(b.mesh.position.y) > 15) {
          recycleBullet(b);
        }
      }
    },

    clear() {
      // Positions are reset at spawn time — only hide and drain the active list
      for (let i = activeBullets.length - 1; i >= 0; i--) {
        activeBullets[i].mesh.visible = false;
      }
      activeBullets.length = 0;
    },
  };
}
