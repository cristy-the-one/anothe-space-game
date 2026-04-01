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

    // Trail: 5-point line, fades from orange at head to black at tail
    const trailPositions = new Float32Array(5 * 3);
    const trailColors = new Float32Array(5 * 3);
    for (let i = 0; i < 5; i++) {
      trailPositions[i * 3] = x; trailPositions[i * 3 + 1] = y; trailPositions[i * 3 + 2] = 0;
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
    scene.add(trailLine);

    activeBullets.push({
      mesh, vx: (dx / len) * 18, vy: (dy / len) * 18, vz: 5, owner: 'enemy',
      trailLine, trailGeo, trailPositions, trailColors,
    });
  }

  function recycleBullet(b) {
    b.mesh.visible = false;
    if (b.trailLine) {
      scene.remove(b.trailLine);
      b.trailGeo.dispose();
      b.trailLine.material.dispose();
      b.trailLine = null;
      b.trailGeo = null;
    }
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

        if (b.owner === 'enemy' && b.trailLine) {
          const tp = b.trailPositions;
          const tc = b.trailColors;
          // Shift positions toward tail (index 4 is oldest)
          for (let j = 4; j > 0; j--) {
            tp[j * 3]     = tp[(j - 1) * 3];
            tp[j * 3 + 1] = tp[(j - 1) * 3 + 1];
            tp[j * 3 + 2] = tp[(j - 1) * 3 + 2];
          }
          // Head = current bullet position
          tp[0] = b.mesh.position.x;
          tp[1] = b.mesh.position.y;
          tp[2] = b.mesh.position.z;
          // Colors: orange at head, black at tail
          for (let j = 0; j < 5; j++) {
            const t = 1 - j / 4;
            tc[j * 3]     = t * (0xff / 255); // R
            tc[j * 3 + 1] = t * (0x66 / 255); // G
            tc[j * 3 + 2] = 0;                 // B
          }
          b.trailGeo.attributes.position.needsUpdate = true;
          b.trailGeo.attributes.color.needsUpdate = true;
        }

        if (b.mesh.position.z < -80 || b.mesh.position.z > 10 ||
            Math.abs(b.mesh.position.x) > 20 || Math.abs(b.mesh.position.y) > 15) {
          recycleBullet(b);
        }
      }
    },

    clear() {
      for (let i = activeBullets.length - 1; i >= 0; i--) {
        const b = activeBullets[i];
        b.mesh.visible = false;
        if (b.trailLine) {
          scene.remove(b.trailLine);
          b.trailGeo.dispose();
          b.trailLine.material.dispose();
        }
      }
      activeBullets.length = 0;
    },
  };
}
