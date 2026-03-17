import * as THREE from 'three';

const POOL_SIZE = 200; // total cubes across all explosions

export function createParticleSystem(scene) {
  const pool = Array.from({ length: POOL_SIZE }, () => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true })
    );
    m.visible = false;
    scene.add(m);
    return m;
  });

  const active = []; // { mesh, vx, vy, vz, life, maxLife, color }

  function explode(x, y, z, count = 10, color = 0x00ff41) {
    for (let i = 0; i < count; i++) {
      const mesh = pool.find(m => !m.visible);
      if (!mesh) break;
      mesh.position.set(x, y, z);
      mesh.material.color.setHex(color);
      mesh.visible = true;
      const speed = 3 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      active.push({
        mesh,
        vx: speed * Math.sin(phi) * Math.cos(theta),
        vy: speed * Math.sin(phi) * Math.sin(theta),
        vz: speed * Math.cos(phi),
        life: 0,
        maxLife: 0.3 + Math.random() * 0.3,
      });
    }
  }

  return {
    explode,
    update(dt) {
      for (let i = active.length - 1; i >= 0; i--) {
        const p = active[i];
        p.life += dt;
        const t = p.life / p.maxLife;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.scale.setScalar(1 - t);
        const opacity = 1 - t;
        p.mesh.material.opacity = opacity;
        if (t >= 1) {
          p.mesh.visible = false;
          active.splice(i, 1);
        }
      }
    },
    clear() {
      for (const p of active) p.mesh.visible = false;
      active.length = 0;
    },
  };
}
