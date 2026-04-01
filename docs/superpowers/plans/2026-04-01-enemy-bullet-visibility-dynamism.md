# Enemy Bullet Visibility & Game Feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make enemy bullets clearly visible, distinguish powerups from bullets with floating labels, add bullet trails and subtle screen shake on hit.

**Architecture:** Four independent concerns, each confined to 1-2 files. Render pipeline: `RenderPass → PixelPass → BloomPass → CRTPass` — bloom before CRT so it samples ungraded brightness. CSS2DRenderer runs as an overlay alongside the WebGL canvas.

**Tech Stack:** Three.js 0.160 (CDN via importmap), vanilla ES modules, no build step. Tests run via `tests/test-runner.html` opened in browser.

---

## Task 1: Add shakeIntensity to state

**Files:**
- Modify: `src/state.js`
- Modify: `tests/score.test.js` (add state test at the end)

- [ ] **Step 1: Add shakeIntensity to state object and reset**

In `src/state.js`, add `shakeIntensity: 0` to the `state` object and reset it in `resetForNewGame`:

```js
export const state = {
  phase: PHASE.MENU,
  score: 0,
  hiScore: parseInt(localStorage.getItem('hiScore') || '0'),
  lives: 20,
  level: 1,
  wave: 0,
  multiplier: 1,
  killStreak: 0,
  lastKillTime: 0,
  invincible: false,
  invincibleUntil: 0,
  activePowerUps: {},
  hasBomb: false,
  shakeIntensity: 0,
};

export function resetForNewGame() {
  state.phase = PHASE.PLAYING;
  state.score = 0;
  state.lives = 20;
  state.level = 1;
  state.wave = 0;
  state.multiplier = 1;
  state.killStreak = 0;
  state.lastKillTime = 0;
  state.invincible = false;
  state.invincibleUntil = 0;
  state.activePowerUps = {};
  state.hasBomb = false;
  state.shakeIntensity = 0;
}
```

- [ ] **Step 2: Add test for shakeIntensity**

In `tests/score.test.js`, update the existing state.js import line at the top to include `resetForNewGame`:

```js
import { state, resetForNewGame } from '../src/state.js';
```

Then append to the bottom of `tests/score.test.js`:

```js
describe('state.shakeIntensity');
assert('initializes to 0', state.shakeIntensity === 0);
state.shakeIntensity = 0.5;
resetForNewGame();
assert('resetForNewGame resets shakeIntensity to 0', state.shakeIntensity === 0);
```

- [ ] **Step 3: Open tests/test-runner.html in browser and verify both new assertions pass (green)**

- [ ] **Step 4: Commit**

```bash
git add src/state.js tests/score.test.js
git commit -m "feat: add shakeIntensity to state"
```

---

## Task 2: Resize and recolor enemy bullets

**Files:**
- Modify: `src/bullets.js`

- [ ] **Step 1: Change enemy bullet geometry and color**

In `src/bullets.js`, the `makeBulletMesh` function currently uses one geometry for both bullet types. Split it so enemy bullets are larger and orange:

Replace:
```js
const POOL_SIZE = 120;

function makeBulletMesh(color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.4),
    new THREE.MeshBasicMaterial({ color })
  );
}

export function createBulletPool(scene) {
  // Two pools: player bullets (cyan 0x00ffff) and enemy bullets (red 0xff4444)
  const playerPool = Array.from({ length: POOL_SIZE }, () => {
    const m = makeBulletMesh(0x00ffff); m.visible = false; scene.add(m); return m;
  });
  const enemyPool = Array.from({ length: POOL_SIZE }, () => {
    const m = makeBulletMesh(0xff4444); m.visible = false; scene.add(m); return m;
  });
```

With:
```js
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
```

- [ ] **Step 2: Verify visually**

Open `index.html` in browser (local server), start a game, let enemies shoot. Enemy bullets should now be noticeably larger and orange.

- [ ] **Step 3: Commit**

```bash
git add src/bullets.js
git commit -m "feat: enlarge enemy bullets and change color to orange"
```

---

## Task 3: Add bullet trails for enemy bullets

**Files:**
- Modify: `src/bullets.js`

- [ ] **Step 1: Add trail creation in spawnEnemyBullet**

Replace the current `spawnEnemyBullet` function:

```js
function spawnEnemyBullet(x, y, tx, ty) {
  const mesh = enemyPool.find(m => !m.visible);
  if (!mesh) return;
  mesh.position.set(x, y, 0);
  mesh.visible = true;
  const dx = tx - x, dy = ty - y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  activeBullets.push({ mesh, vx: (dx / len) * 18, vy: (dy / len) * 18, vz: 5, owner: 'enemy' });
}
```

With:

```js
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
```

- [ ] **Step 2: Update trail positions each frame in update()**

In the `update(dt)` method, after moving each bullet, add trail update logic for enemy bullets. Replace the full `update` method:

```js
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
```

- [ ] **Step 3: Dispose trail in recycleBullet**

Replace `recycleBullet`:

```js
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
```

- [ ] **Step 4: Dispose trails in clear()**

Replace `clear()`:

```js
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
```

- [ ] **Step 5: Verify visually**

Open `index.html`, play until a Shooter enemy appears and fires. Enemy bullets should leave a short orange-to-black trail. Player bullets should have no trail.

- [ ] **Step 6: Commit**

```bash
git add src/bullets.js
git commit -m "feat: add orange trails to enemy bullets"
```

---

## Task 4: Add UnrealBloomPass and CSS2DRenderer to renderer

**Files:**
- Modify: `src/renderer.js`

- [ ] **Step 1: Rewrite renderer.js with bloom + CSS2DRenderer**

Full replacement of `src/renderer.js`:

```js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

const PixelShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2() }, pixelSize: { value: 4.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelSize;
    varying vec2 vUv;
    void main(){
      vec2 dxy = pixelSize / resolution;
      vec2 coord = dxy * floor(vUv / dxy);
      gl_FragColor = texture2D(tDiffuse, coord);
    }`,
};

const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2() },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform vec2 resolution;
    varying vec2 vUv;
    void main(){
      vec2 uv = vUv - 0.5;
      float dist = dot(uv, uv);
      uv *= 1.0 + dist * 0.08;
      uv += 0.5;
      if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){ gl_FragColor=vec4(0,0,0,1); return; }
      vec4 col = texture2D(tDiffuse, uv);
      float line = mod(floor(vUv.y * resolution.y), 2.0);
      col.rgb *= 0.85 + 0.15 * line;
      float brightness = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = mix(col.rgb, vec3(0.0, brightness * 1.2, 0.0), 0.10);
      col.rgb += vec3(0.0, 0.03, 0.0);
      gl_FragColor = col;
    }`,
};

export function createRenderer(scene, camera) {
  const container = document.getElementById('canvas-container');
  const w = container.clientWidth, h = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  container.insertBefore(renderer.domElement, container.firstChild);

  // CSS2D overlay for powerup labels
  const css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(w, h);
  css2dRenderer.domElement.style.position = 'absolute';
  css2dRenderer.domElement.style.top = '0';
  css2dRenderer.domElement.style.left = '0';
  css2dRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(css2dRenderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const pixelPass = new ShaderPass(PixelShader);
  pixelPass.uniforms.resolution.value.set(w, h);
  pixelPass.uniforms.pixelSize.value = 3.0;
  composer.addPass(pixelPass);

  // Bloom before CRT so it samples ungraded brightness
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.3, 0.4);
  composer.addPass(bloomPass);

  const crtPass = new ShaderPass(CRTShader);
  crtPass.uniforms.resolution.value.set(w, h);
  composer.addPass(crtPass);

  window.addEventListener('resize', () => {
    const nw = container.clientWidth, nh = container.clientHeight;
    renderer.setSize(nw, nh);
    composer.setSize(nw, nh);
    css2dRenderer.setSize(nw, nh);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    pixelPass.uniforms.resolution.value.set(nw, nh);
    crtPass.uniforms.resolution.value.set(nw, nh);
  });

  return { renderer, composer, crtPass, css2dRenderer };
}
```

- [ ] **Step 2: Verify visually**

Open `index.html`, start a game. All bright objects (player bullets, enemy bullets, powerups, explosion particles) should have a soft glow. No visible performance drop. Check iPad/mobile too if possible.

- [ ] **Step 3: Commit**

```bash
git add src/renderer.js
git commit -m "feat: add UnrealBloomPass and CSS2DRenderer to render pipeline"
```

---

## Task 5: Attach floating labels to powerups

**Files:**
- Modify: `src/powerups.js`

- [ ] **Step 1: Rewrite powerups.js with CSS2DObject labels**

Full replacement of `src/powerups.js`:

```js
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
```

- [ ] **Step 2: Verify visually**

Kill enemies until a powerup drops. It should display its name as a floating label above the octahedron in the matching color. The label should follow the powerup as it moves toward the player.

- [ ] **Step 3: Commit**

```bash
git add src/powerups.js
git commit -m "feat: add floating CSS2D labels to powerups"
```

---

## Task 6: Wire CSS2DRenderer render call and screen shake

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Import css2dRenderer and set base camera constants**

In `src/main.js`, change the destructure of `createRenderer` and add camera base constants:

Replace:
```js
const { composer, crtPass } = createRenderer(scene, camera);
```

With:
```js
const { composer, crtPass, css2dRenderer } = createRenderer(scene, camera);
const BASE_CAMERA_X = 0;
const BASE_CAMERA_Y = 2;
```

- [ ] **Step 2: Apply screen shake and render CSS2D each frame**

In the `loop` function, locate the line:
```js
  ui.update();
  composer.render();
}
```

Replace it with:
```js
  // Screen shake
  if (state.shakeIntensity > 0) {
    camera.position.x = BASE_CAMERA_X + (Math.random() * 2 - 1) * state.shakeIntensity;
    camera.position.y = BASE_CAMERA_Y + (Math.random() * 2 - 1) * state.shakeIntensity;
    state.shakeIntensity *= (1 - dt * 10);
    if (state.shakeIntensity < 0.005) {
      state.shakeIntensity = 0;
      camera.position.x = BASE_CAMERA_X;
      camera.position.y = BASE_CAMERA_Y;
    }
  }

  ui.update();
  composer.render();
  css2dRenderer.render(scene, camera);
}
```

- [ ] **Step 3: Trigger shake on all three player-hit sites**

There are three places in `main.js` where `player.takeDamage()` returns true and damage is processed. Add `state.shakeIntensity = 0.13;` immediately inside each `if (player.takeDamage())` block, before the existing `resetStreak()` call.

**Site 1** — Boss vs player (around line 129):
```js
if (player.takeDamage()) {
  state.shakeIntensity = 0.13;
  resetStreak();
  audio.playerHit();
```

**Site 2** — Enemy bullets vs player (around line 173):
```js
if (player.takeDamage()) {
  state.shakeIntensity = 0.13;
  resetStreak();
  audio.playerHit();
```

**Site 3** — Enemy body vs player (around line 192):
```js
if (player.takeDamage()) {
  state.shakeIntensity = 0.13;
  resetStreak();
  audio.playerHit();
```

- [ ] **Step 4: Verify visually**

Open `index.html`. Take a hit from an enemy bullet, an enemy body, and (optionally) the boss. Each should produce a quick ~0.1s camera jitter that snaps back. Powerup labels should be visible and track their powerups.

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: screen shake on hit + wire CSS2DRenderer"
```

---

## Final Verification Checklist

- [ ] Enemy bullets are large, orange, and immediately readable as threats
- [ ] Enemy bullets have a short orange-to-black trail behind them
- [ ] Player bullets have NO trail
- [ ] All bright objects (bullets, powerups, particles) have a soft glow from bloom
- [ ] Powerup labels appear above each pickup in the correct color
- [ ] Labels follow the powerup as it drifts toward the player
- [ ] Labels disappear when the powerup is collected or expires
- [ ] Taking any hit (enemy bullet, body, boss) produces a subtle camera jitter
- [ ] Shake snaps back in ~0.1 seconds, no lingering wobble
- [ ] Game runs smoothly on desktop and iPad (no visible frame drop from bloom)
- [ ] `tests/test-runner.html` shows all green
