import * as THREE from 'three';

export function setupScene(scene) {
  scene.background = new THREE.Color(0x020818);
  scene.fog = new THREE.FogExp2(0x020818, 0.02);

  // Ambient + directional light
  scene.add(new THREE.AmbientLight(0x004400, 0.5));
  const dirLight = new THREE.DirectionalLight(0x00ff41, 1.0);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);
}

export function createStarfield(scene) {
  const count = 1000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 30;  // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;  // y
    positions[i * 3 + 2] = -(Math.random() * 200);       // z (ahead)
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xaaffaa, size: 0.08 });
  const stars = new THREE.Points(geo, mat);
  scene.add(stars);

  return {
    update(dt, speed) {
      const pos = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 2] += speed * dt;
        if (pos[i * 3 + 2] > 10) {
          pos[i * 3 + 2] = -200;
          pos[i * 3]     = (Math.random() - 0.5) * 30;
          pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
        }
      }
      geo.attributes.position.needsUpdate = true;
    }
  };
}
