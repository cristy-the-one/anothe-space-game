# Arcade Space Rails Shooter Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-playable 3D on-rails space shooter with retro pixel/CRT visuals, waves of enemies, boss fights, power-ups, and local high score.

**Architecture:** Vanilla JS ES modules, no build step. Three.js via CDN for 3D rendering. EffectComposer for pixel/scanline/CRT post-processing. Pure logic functions are unit-tested via a browser test runner; rendering/input tested manually.

**Tech Stack:** Three.js r160 (CDN), THREE.EffectComposer, Web Audio API, localStorage, ES modules

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Entry point, canvas, HUD overlay, loads `src/main.js` |
| `src/main.js` | Bootstrap, game loop (`requestAnimationFrame`), wires modules |
| `src/state.js` | Global state object (phase, score, lives, level, active power-ups) |
| `src/renderer.js` | Three.js WebGLRenderer, EffectComposer, pixel/scanline/CRT passes |
| `src/scene.js` | THREE.Scene, camera, lighting, starfield |
| `src/player.js` | Ship mesh, movement clamping, tilt, input reading |
| `src/bullets.js` | Object pool for player + enemy bullets, movement, lifecycle |
| `src/enemies.js` | Enemy types (Grunt/Weaver/Shooter/Kamikaze), spawn, movement |
| `src/powerups.js` | Power-up types, spawn on kill, float animation, collection |
| `src/boss.js` | Boss mesh, health phases, attack state machine |
| `src/levels.js` | Level + wave definitions, wave sequencer |
| `src/collision.js` | AABB collision detection (pure functions — unit tested) |
| `src/score.js` | Score tracking, multiplier logic (pure functions — unit tested) |
| `src/ui.js` | HUD DOM elements: score, lives, level, boss bar, menu screens |
| `src/audio.js` | Web Audio API synthesizer for shoot, explosion, power-up sounds |
| `tests/test-runner.html` | Browser test runner (no framework) |
| `tests/collision.test.js` | Unit tests for AABB collision |
| `tests/score.test.js` | Unit tests for score/multiplier logic |

---

## Task 1: Project Scaffold

**Files:**
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/state.js`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPACE RAILS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
    #canvas-container { position: relative; width: 100%; height: 100%; }
    canvas { display: block; width: 100% !important; height: 100% !important; }
    #hud {
      position: absolute; inset: 0; pointer-events: none;
      font-family: 'Press Start 2P', monospace; color: #00ff41;
      font-size: 12px; padding: 16px;
    }
    #hud-top { display: flex; justify-content: space-between; align-items: flex-start; }
    #hud-center { text-align: center; }
    #boss-bar-container {
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
      width: 400px; display: none;
    }
    #boss-bar-label { text-align: center; margin-bottom: 4px; font-size: 10px; color: #ff4444; }
    #boss-bar-bg { background: #300; height: 12px; border: 1px solid #f44; }
    #boss-bar-fill { background: #f44; height: 100%; width: 100%; transition: width 0.1s; }
    #screen-overlay {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; background: rgba(0,0,0,0.85);
      font-family: 'Press Start 2P', monospace; color: #00ff41; text-align: center;
      gap: 24px;
    }
    #screen-overlay h1 { font-size: 32px; text-shadow: 0 0 20px #00ff41; }
    #screen-overlay p { font-size: 12px; color: #aaffaa; line-height: 2; }
    #screen-overlay.hidden { display: none; }
  </style>
</head>
<body>
  <div id="canvas-container">
    <div id="hud">
      <div id="hud-top">
        <div id="hud-score">
          <div>SCORE</div>
          <div id="score-value">0</div>
          <div style="margin-top:8px;font-size:10px;color:#aaffaa">HI</div>
          <div id="hiscore-value">0</div>
        </div>
        <div id="hud-center">
          <div id="level-value">LEVEL 1</div>
          <div id="multiplier-value" style="font-size:10px;color:#ffff00;margin-top:4px"></div>
        </div>
        <div id="hud-lives">
          <div>LIVES</div>
          <div id="lives-value">♦ ♦ ♦</div>
        </div>
      </div>
      <div id="boss-bar-container">
        <div id="boss-bar-label">BOSS</div>
        <div id="boss-bar-bg"><div id="boss-bar-fill"></div></div>
      </div>
    </div>
    <div id="screen-overlay">
      <h1>SPACE RAILS</h1>
      <p>WASD / ARROWS — MOVE<br>SPACE / CLICK — SHOOT<br>B / RIGHT CLICK — BOMB</p>
      <p id="hiscore-display">HI-SCORE: 0</p>
      <p style="animation: blink 1s step-end infinite">PRESS ENTER TO START</p>
    </div>
  </div>
  <script type="importmap">
    { "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/" } }
  </script>
  <script type="module" src="src/main.js"></script>
  <style>
    @keyframes blink { 50% { opacity: 0; } }
  </style>
</body>
</html>
```

- [ ] **Step 2: Create `src/state.js`**

```js
export const PHASE = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  BOSS_FIGHT: 'BOSS_FIGHT',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
  GAME_OVER: 'GAME_OVER',
};

export const state = {
  phase: PHASE.MENU,
  score: 0,
  hiScore: parseInt(localStorage.getItem('hiScore') || '0'),
  lives: 3,
  level: 1,       // 1-3
  wave: 0,        // 0-4 within a level
  multiplier: 1,  // 1, 2, or 4
  killStreak: 0,  // consecutive kills toward next multiplier step
  lastKillTime: 0,
  invincible: false,
  invincibleUntil: 0,
  activePowerUps: {}, // { spreadShot: expiry_ms, rapidFire: expiry_ms, shield: true, speedBoost: expiry_ms }
  hasBomb: false,
};

export function resetForNewGame() {
  state.phase = PHASE.PLAYING;
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.wave = 0;
  state.multiplier = 1;
  state.killStreak = 0;
  state.lastKillTime = 0;
  state.invincible = false;
  state.invincibleUntil = 0;
  state.activePowerUps = {};
  state.hasBomb = false;
}
```

- [ ] **Step 3: Create `src/main.js`** (minimal stub to verify Three.js loads)

```js
import * as THREE from 'three';
import { state, PHASE, resetForNewGame } from './state.js';

// Verify Three.js loaded
console.log('Three.js loaded:', THREE.REVISION);

// Keyboard enter to start
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && state.phase === PHASE.MENU) {
    document.getElementById('screen-overlay').classList.add('hidden');
    resetForNewGame();
  }
});
```

- [ ] **Step 4: Open `index.html` in browser, verify title screen shows, console shows Three.js revision**

- [ ] **Step 5: Commit**

```bash
git init
git add index.html src/state.js src/main.js
git commit -m "feat: project scaffold with title screen and state"
```

---

## Task 2: Test Runner + Pure Logic Tests

**Files:**
- Create: `tests/test-runner.html`
- Create: `tests/collision.test.js`
- Create: `tests/score.test.js`
- Create: `src/collision.js`
- Create: `src/score.js`

- [ ] **Step 1: Create `tests/test-runner.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tests</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #111; color: #eee; }
    .pass { color: #00ff41; } .fail { color: #ff4444; }
    h2 { color: #aaa; margin: 16px 0 8px; }
  </style>
</head>
<body>
  <h1>Test Results</h1>
  <div id="results"></div>
  <script type="module">
    import './collision.test.js';
    import './score.test.js';
  </script>
  <script type="module">
    // Simple assert helper — imported by test files via window
    window.assert = function(description, condition) {
      const el = document.createElement('div');
      el.className = condition ? 'pass' : 'fail';
      el.textContent = (condition ? '✓ ' : '✗ ') + description;
      document.getElementById('results').appendChild(el);
      if (!condition) console.error('FAIL:', description);
    };
    window.describe = function(name) {
      const el = document.createElement('h2');
      el.textContent = name;
      document.getElementById('results').appendChild(el);
    };
  </script>
</body>
</html>
```

- [ ] **Step 2: Write failing tests in `tests/collision.test.js`**

```js
// Waits for assert/describe to be available
await new Promise(r => setTimeout(r, 50));
import { aabbOverlap } from '../src/collision.js';

describe('AABB Collision');
assert('overlapping boxes return true',
  aabbOverlap({x:0,y:0,hw:1,hh:1}, {x:0.5,y:0,hw:1,hh:1}));
assert('non-overlapping boxes return false',
  !aabbOverlap({x:0,y:0,hw:1,hh:1}, {x:3,y:0,hw:1,hh:1}));
assert('touching edges return false',
  !aabbOverlap({x:0,y:0,hw:1,hh:1}, {x:2,y:0,hw:1,hh:1}));
assert('Y-axis gap returns false',
  !aabbOverlap({x:0,y:0,hw:1,hh:1}, {x:0,y:3,hw:1,hh:1}));
```

- [ ] **Step 3: Write failing tests in `tests/score.test.js`**

```js
await new Promise(r => setTimeout(r, 50));
import { calcMultiplier, addKill } from '../src/score.js';

describe('Score Multiplier');
// After 0-4 kills, multiplier stays x1
assert('0 kills = x1', calcMultiplier(0) === 1);
assert('4 kills = x1', calcMultiplier(4) === 1);
// After 5 kills, multiplier becomes x2
assert('5 kills = x2', calcMultiplier(5) === 2);
assert('9 kills = x2', calcMultiplier(9) === 2);
// After 10 kills, multiplier becomes x4
assert('10 kills = x4', calcMultiplier(10) === 4);
assert('20 kills = x4', calcMultiplier(20) === 4);
```

- [ ] **Step 4: Open `tests/test-runner.html` — expect red failures (functions not defined)**

- [ ] **Step 5: Create `src/collision.js`**

```js
/**
 * Axis-aligned bounding box overlap test.
 * @param {object} a - {x, y, hw (half-width), hh (half-height)}
 * @param {object} b - same shape
 * @returns {boolean}
 */
export function aabbOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.hw + b.hw) &&
         Math.abs(a.y - b.y) < (a.hh + b.hh);
}
```

- [ ] **Step 6: Create `src/score.js`**

```js
import { state } from './state.js';

/**
 * Returns multiplier (1, 2, or 4) for a given consecutive kill count.
 */
export function calcMultiplier(streak) {
  if (streak >= 10) return 4;
  if (streak >= 5)  return 2;
  return 1;
}

const KILL_POINTS = { grunt: 10, weaver: 25, shooter: 25, kamikaze: 50, boss: 500 };
const STREAK_RESET_MS = 3000;

export function addKill(enemyType, now) {
  // Reset streak if too long since last kill
  if (now - state.lastKillTime > STREAK_RESET_MS) {
    state.killStreak = 0;
  }
  state.killStreak++;
  state.lastKillTime = now;
  state.multiplier = calcMultiplier(state.killStreak);
  const pts = (KILL_POINTS[enemyType] ?? 10) * state.multiplier;
  state.score += pts;
  if (state.score > state.hiScore) {
    state.hiScore = state.score;
    localStorage.setItem('hiScore', state.hiScore);
  }
  return pts;
}

export function resetStreak() {
  state.killStreak = 0;
  state.multiplier = 1;
}
```

- [ ] **Step 7: Reload `tests/test-runner.html` — all tests should be green**

- [ ] **Step 8: Commit**

```bash
git add tests/ src/collision.js src/score.js
git commit -m "feat: AABB collision and score/multiplier logic with tests"
```

---

## Task 3: Renderer + Post-Processing

**Files:**
- Create: `src/renderer.js`

- [ ] **Step 1: Create `src/renderer.js`**

```js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Pixelation shader — renders at low res then upscales
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

// Scanline + CRT + green tint shader
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
      // Barrel warp
      vec2 uv = vUv - 0.5;
      float dist = dot(uv, uv);
      uv *= 1.0 + dist * 0.08;
      uv += 0.5;
      if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){ gl_FragColor=vec4(0,0,0,1); return; }
      vec4 col = texture2D(tDiffuse, uv);
      // Scanlines
      float line = mod(floor(vUv.y * resolution.y), 2.0);
      col.rgb *= 0.85 + 0.15 * line;
      // Green phosphor tint
      col.rgb = vec3(col.r * 0.2 + col.g * 0.1, col.g * 0.9 + col.r * 0.3, col.b * 0.2);
      col.rgb += vec3(0.0, 0.05, 0.0); // ambient green glow
      gl_FragColor = col;
    }`,
};

export function createRenderer(scene, camera) {
  const container = document.getElementById('canvas-container');
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1); // crisp pixels
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.insertBefore(renderer.domElement, container.firstChild);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const pixelPass = new ShaderPass(PixelShader);
  pixelPass.uniforms.resolution.value.set(container.clientWidth, container.clientHeight);
  pixelPass.uniforms.pixelSize.value = 3.0;
  composer.addPass(pixelPass);

  const crtPass = new ShaderPass(CRTShader);
  crtPass.uniforms.resolution.value.set(container.clientWidth, container.clientHeight);
  composer.addPass(crtPass);

  // Handle resize
  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pixelPass.uniforms.resolution.value.set(w, h);
    crtPass.uniforms.resolution.value.set(w, h);
  });

  return { renderer, composer, crtPass };
}
```

- [ ] **Step 2: Update `src/main.js` to use renderer — render a black scene**

```js
import * as THREE from 'three';
import { state, PHASE, resetForNewGame } from './state.js';
import { createRenderer } from './renderer.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 8);
camera.lookAt(0, 0, 0);

const { composer, crtPass } = createRenderer(scene, camera);

let lastTime = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  crtPass.uniforms.time.value = now * 0.001;
  composer.render();
}
requestAnimationFrame(loop);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && state.phase === PHASE.MENU) {
    document.getElementById('screen-overlay').classList.add('hidden');
    resetForNewGame();
  }
});
```

- [ ] **Step 3: Open browser — title screen shows with green CRT tint on background**

- [ ] **Step 4: Commit**

```bash
git add src/renderer.js src/main.js
git commit -m "feat: Three.js renderer with pixelation and CRT post-processing"
```

---

## Task 4: Scene, Camera, Starfield

**Files:**
- Create: `src/scene.js`

- [ ] **Step 1: Create `src/scene.js`**

```js
import * as THREE from 'three';

export function setupScene(scene) {
  scene.background = new THREE.Color(0x020818);
  scene.fog = new THREE.FogExp2(0x020818, 0.02);

  // Ambient + directional light
  scene.add(new THREE.AmbientLight(0x004400, 0.5));
  const dirLight = new THREE.DirectionalLight(0x00ff41, 1.0);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  return scene;
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
```

- [ ] **Step 2: Update `src/main.js` to use scene + starfield**

Add imports and calls:
```js
import { setupScene, createStarfield } from './scene.js';
// after scene/camera creation:
setupScene(scene);
const starfield = createStarfield(scene);
// in loop, inside PLAYING/BOSS_FIGHT phases:
// starfield.update(dt, 20);
```

Call `starfield.update(dt, 20)` inside the game loop unconditionally for now.

- [ ] **Step 3: Open browser — press Enter, stars should stream past**

- [ ] **Step 4: Commit**

```bash
git add src/scene.js src/main.js
git commit -m "feat: scene setup with starfield"
```

---

## Task 5: Player Ship

**Files:**
- Create: `src/player.js`

- [ ] **Step 1: Create `src/player.js`**

```js
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
  document.addEventListener('keydown', e => keys[e.code] = true);
  document.addEventListener('keyup',   e => keys[e.code] = false);

  // Mouse position (normalized to game bounds)
  let mouseTarget = { x: 0, y: 0 };
  let useMouseMove = false;
  document.addEventListener('mousemove', e => {
    useMouseMove = true;
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    mouseTarget.x = ((e.clientX - cx) / cx) * BOUNDS.x;
    mouseTarget.y = -((e.clientY - cy) / cy) * BOUNDS.y;
  });

  // Shooting
  let shootCooldown = 0;
  const shooting = { active: false };
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
    },
  };
}
```

- [ ] **Step 2: Update `src/main.js` to create player and call update**

```js
import { createPlayer } from './player.js';
// after scene setup:
const player = createPlayer(scene);
// in loop, if state.phase is PLAYING or BOSS_FIGHT:
player.update(dt);
```

- [ ] **Step 3: Open browser — green ship appears, moves with WASD/mouse**

- [ ] **Step 4: Commit**

```bash
git add src/player.js src/main.js
git commit -m "feat: player ship with movement, input, invincibility"
```

---

## Task 6: Bullet Pool

**Files:**
- Create: `src/bullets.js`

- [ ] **Step 1: Create `src/bullets.js`**

```js
import * as THREE from 'three';

const POOL_SIZE = 120;

function makeBulletMesh(color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.4),
    new THREE.MeshBasicMaterial({ color })
  );
}

export function createBulletPool(scene) {
  // Two pools: player (green) and enemy (red)
  const playerPool = Array.from({ length: POOL_SIZE }, () => {
    const m = makeBulletMesh(0x00ffff); m.visible = false; scene.add(m); return m;
  });
  const enemyPool = Array.from({ length: POOL_SIZE }, () => {
    const m = makeBulletMesh(0xff4444); m.visible = false; scene.add(m); return m;
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
      for (let i = activeBullets.length - 1; i >= 0; i--) {
        activeBullets[i].mesh.visible = false;
      }
      activeBullets.length = 0;
    },
  };
}
```

- [ ] **Step 2: Update `src/main.js` — add bullet pool, wire player shooting**

```js
import { createBulletPool } from './bullets.js';
import { state } from './state.js';

const bullets = createBulletPool(scene);

// In loop (PLAYING/BOSS_FIGHT):
bullets.update(dt);

// Player shooting
const FIRE_RATE = 0.15; // seconds between shots
if (player.shooting.active && player.shootCooldown <= 0) {
  const fireRate = FIRE_RATE / (state.activePowerUps.rapidFire ? 2 : 1);
  player.shootCooldown = fireRate;
  const px = player.mesh.position.x, py = player.mesh.position.y;
  if (state.activePowerUps.spreadShot) {
    bullets.spawnPlayerBullet(px, py, -0.3);
    bullets.spawnPlayerBullet(px, py, 0);
    bullets.spawnPlayerBullet(px, py, 0.3);
  } else {
    bullets.spawnPlayerBullet(px, py);
  }
}
```

- [ ] **Step 3: Open browser — press space/click, green bullets fire forward**

- [ ] **Step 4: Commit**

```bash
git add src/bullets.js src/main.js
git commit -m "feat: bullet pool with player shooting, spread shot support"
```

---

## Task 7: Enemies

**Files:**
- Create: `src/enemies.js`

- [ ] **Step 1: Create `src/enemies.js`**

```js
import * as THREE from 'three';

const MESHES = {
  grunt:    () => new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8), new THREE.MeshLambertMaterial({color:0xff4422})),
  weaver:   () => new THREE.Mesh(new THREE.OctahedronGeometry(0.6),  new THREE.MeshLambertMaterial({color:0xff8800})),
  shooter:  () => new THREE.Mesh(new THREE.DodecahedronGeometry(0.6),new THREE.MeshLambertMaterial({color:0xff2288})),
  kamikaze: () => new THREE.Mesh(new THREE.TetrahedronGeometry(0.7), new THREE.MeshLambertMaterial({color:0xff0000})),
};

export function createEnemyManager(scene) {
  const active = []; // { mesh, type, hp, phase, phaseTimer, spawnX, age }

  function spawn(type, x, y) {
    const mesh = MESHES[type]();
    mesh.position.set(x, y, -60);
    scene.add(mesh);
    active.push({ mesh, type, hp: type === 'kamikaze' ? 1 : 2, phase: 0, phaseTimer: 0, spawnX: x, age: 0 });
  }

  function remove(enemy) {
    scene.remove(enemy.mesh);
    enemy.mesh.geometry.dispose();
    const idx = active.indexOf(enemy);
    if (idx !== -1) active.splice(idx, 1);
  }

  return {
    active,
    spawn,
    remove,

    update(dt, playerX, playerY, onShoot) {
      for (let i = active.length - 1; i >= 0; i--) {
        const e = active[i];
        e.age += dt;
        e.mesh.rotation.y += dt * 1.5;
        e.mesh.position.z += 12 * dt; // fly toward player

        switch (e.type) {
          case 'grunt':
            // Fly straight
            break;
          case 'weaver':
            e.mesh.position.x = e.spawnX + Math.sin(e.age * 2.5) * 3;
            break;
          case 'shooter':
            // Stop at z=-15, shoot, retreat
            if (e.mesh.position.z > -15) {
              e.mesh.position.z = -15;
              e.phaseTimer += dt;
              if (e.phaseTimer > 1.5) {
                e.phaseTimer = 0;
                onShoot(e.mesh.position.x, e.mesh.position.y, playerX, playerY);
              }
            }
            if (e.age > 4) e.mesh.position.z -= 8 * dt; // retreat
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
      }
      active.length = 0;
    },
  };
}
```

- [ ] **Step 2: Update `src/main.js` — add enemies, wire shooting and spawn a test wave**

```js
import { createEnemyManager } from './enemies.js';
const enemies = createEnemyManager(scene);

// Temporary: spawn a few grunts to test
setTimeout(() => {
  enemies.spawn('grunt',  -3, 1);
  enemies.spawn('weaver',  0, 0);
  enemies.spawn('shooter', 3, -1);
  enemies.spawn('kamikaze', 1, 2);
}, 1000);

// In loop (PLAYING/BOSS_FIGHT):
enemies.update(dt, player.mesh.position.x, player.mesh.position.y,
  (ex, ey, px, py) => bullets.spawnEnemyBullet(ex, ey, px, py));
```

- [ ] **Step 3: Open browser — enemies fly toward you with distinct behaviors**

- [ ] **Step 4: Commit**

```bash
git add src/enemies.js src/main.js
git commit -m "feat: four enemy types with distinct movement patterns"
```

---

## Task 8: Collision Detection

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add collision checks to `src/main.js` game loop**

```js
import { aabbOverlap } from './collision.js';
import { addKill, resetStreak } from './score.js';

// In loop, after updating bullets and enemies:

// Player bullets vs enemies
for (let i = bullets.activeBullets.length - 1; i >= 0; i--) {
  const b = bullets.activeBullets[i];
  if (b.owner !== 'player') continue;
  const bb = { x: b.mesh.position.x, y: b.mesh.position.y, hw: 0.15, hh: 0.15 };
  for (let j = enemies.active.length - 1; j >= 0; j--) {
    const e = enemies.active[j];
    if (aabbOverlap(bb, enemies.getBBox(e))) {
      e.hp--;
      bullets.recycleBullet(b);
      if (e.hp <= 0) {
        addKill(e.type, Date.now());
        // TODO: spawn explosion, power-up
        enemies.remove(e);
      }
      break;
    }
  }
}

// Enemy bullets + enemies vs player
const playerBB = player.getBBox();
for (let i = bullets.activeBullets.length - 1; i >= 0; i--) {
  const b = bullets.activeBullets[i];
  if (b.owner !== 'enemy') continue;
  if (aabbOverlap({ x: b.mesh.position.x, y: b.mesh.position.y, hw: 0.1, hh: 0.1 }, playerBB)) {
    bullets.recycleBullet(b);
    if (player.takeDamage()) resetStreak();
  }
}
for (const e of enemies.active) {
  if (aabbOverlap(enemies.getBBox(e), playerBB)) {
    enemies.remove(e);
    if (player.takeDamage()) resetStreak();
  }
}
```

- [ ] **Step 2: Open browser — shooting enemies destroys them; enemies hitting player cost a life**

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: collision detection between bullets, enemies, and player"
```

---

## Task 9: Explosions (Particle Pool)

**Files:**
- Create: `src/particles.js`

- [ ] **Step 1: Create `src/particles.js`**

```js
import * as THREE from 'three';

const POOL_SIZE = 200; // total cubes across all explosions

export function createParticleSystem(scene) {
  const pool = Array.from({ length: POOL_SIZE }, () => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x00ff41 })
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
```

- [ ] **Step 2: Import and wire into `src/main.js`**

```js
import { createParticleSystem } from './particles.js';
const particles = createParticleSystem(scene);

// In loop: particles.update(dt);
// On enemy kill: particles.explode(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, 8, 0xff6600);
// On player hit: particles.explode(player.mesh.position.x, player.mesh.position.y, 0, 12, 0xffffff);
```

- [ ] **Step 3: Open browser — enemies explode with colored particles on death**

- [ ] **Step 4: Commit**

```bash
git add src/particles.js src/main.js
git commit -m "feat: particle explosion system pooled"
```

---

## Task 10: Power-ups

**Files:**
- Create: `src/powerups.js`

- [ ] **Step 1: Create `src/powerups.js`**

```js
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
```

- [ ] **Step 2: Wire into `src/main.js`**

```js
import { createPowerUpManager } from './powerups.js';
const powerups = createPowerUpManager(scene);

// On enemy kill (replace existing kill code):
powerups.trySpawn(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z);

// In loop: powerups.update(dt);

// Player collects power-up
const playerBB = player.getBBox();
for (let i = powerups.active.length - 1; i >= 0; i--) {
  if (aabbOverlap(powerups.getBBox(powerups.active[i]), playerBB)) {
    powerups.collect(powerups.active[i]);
    // TODO: play power-up sound
  }
}

// Bomb input
document.addEventListener('keydown', e => {
  if ((e.code === 'KeyB') && state.hasBomb) {
    state.hasBomb = false;
    enemies.clear(); // destroy all on-screen enemies
  }
});
document.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (state.hasBomb) { state.hasBomb = false; enemies.clear(); }
});
```

- [ ] **Step 3: Open browser — kill enemies, occasionally a spinning wireframe gem appears; collect it**

- [ ] **Step 4: Commit**

```bash
git add src/powerups.js src/main.js
git commit -m "feat: power-ups with spawn, collection, expiry, bomb"
```

---

## Task 11: Levels & Wave Sequencer

**Files:**
- Create: `src/levels.js`

- [ ] **Step 1: Create `src/levels.js`**

```js
// Wave: array of spawn groups. Each group: { type, count, xRange, yRange, delay }
// delay = seconds after wave start to spawn this group

const LEVELS = [
  { // Level 1
    waves: [
      [{ type:'grunt',    count:5, xRange:[-4,4], yRange:[-2,2], delay:0 }],
      [{ type:'grunt',    count:4, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'weaver',   count:2, xRange:[-3,3], yRange:[-1,1], delay:1.5 }],
      [{ type:'weaver',   count:5, xRange:[-4,4], yRange:[-2,2], delay:0 }],
      [{ type:'shooter',  count:3, xRange:[-4,4], yRange:[-2,2], delay:0 },
       { type:'grunt',    count:3, xRange:[-3,3], yRange:[-1,1], delay:2 }],
      [{ type:'kamikaze', count:4, xRange:[-4,4], yRange:[-2,2], delay:0 },
       { type:'grunt',    count:4, xRange:[-5,5], yRange:[-3,3], delay:1 }],
    ]
  },
  { // Level 2
    waves: [
      [{ type:'grunt',    count:6, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'weaver',   count:3, xRange:[-3,3], yRange:[-2,2], delay:1 }],
      [{ type:'weaver',   count:5, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'shooter',  count:2, xRange:[-3,3], yRange:[-1,1], delay:0 }],
      [{ type:'shooter',  count:4, xRange:[-5,5], yRange:[-2,2], delay:0 },
       { type:'kamikaze', count:3, xRange:[-4,4], yRange:[-2,2], delay:2 }],
      [{ type:'kamikaze', count:5, xRange:[-5,5], yRange:[-3,3], delay:0 }],
      [{ type:'grunt',    count:5, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'weaver',   count:3, xRange:[-3,3], yRange:[-2,2], delay:1 },
       { type:'kamikaze', count:3, xRange:[-4,4], yRange:[-2,2], delay:2 }],
    ]
  },
  { // Level 3
    waves: [
      [{ type:'weaver',   count:6, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'shooter',  count:3, xRange:[-4,4], yRange:[-2,2], delay:1 }],
      [{ type:'kamikaze', count:6, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'grunt',    count:4, xRange:[-3,3], yRange:[-2,2], delay:1.5 }],
      [{ type:'shooter',  count:5, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'weaver',   count:4, xRange:[-4,4], yRange:[-2,2], delay:1 }],
      [{ type:'kamikaze', count:7, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'shooter',  count:3, xRange:[-3,3], yRange:[-2,2], delay:2 }],
      [{ type:'grunt',    count:6, xRange:[-5,5], yRange:[-3,3], delay:0 },
       { type:'weaver',   count:5, xRange:[-4,4], yRange:[-2,2], delay:1 },
       { type:'shooter',  count:4, xRange:[-3,3], yRange:[-2,2], delay:2 },
       { type:'kamikaze', count:3, xRange:[-4,4], yRange:[-2,2], delay:3 }],
    ]
  },
];

export function createWaveSequencer(onSpawn) {
  let levelIdx = 0;
  let waveIdx = 0;
  let waveTimer = 0;
  let pendingSpawns = []; // { type, x, y, at_time }
  let waveStartTime = 0;
  let waitingForClear = false;

  function rand(min, max) { return min + Math.random() * (max - min); }

  function loadWave(li, wi) {
    const groups = LEVELS[li].waves[wi];
    waveStartTime = 0; // reset local timer
    pendingSpawns = [];
    for (const g of groups) {
      for (let i = 0; i < g.count; i++) {
        pendingSpawns.push({
          type: g.type,
          x: rand(g.xRange[0], g.xRange[1]),
          y: rand(g.yRange[0], g.yRange[1]),
          at: g.delay + i * 0.4,
        });
      }
    }
    pendingSpawns.sort((a, b) => a.at - b.at);
  }

  loadWave(0, 0);

  return {
    get levelNumber() { return levelIdx + 1; },
    get waveNumber()  { return waveIdx + 1; },
    get totalWaves()  { return LEVELS[levelIdx].waves.length; },
    get isBossTime()  { return waveIdx >= LEVELS[levelIdx].waves.length; },
    get isLastLevel() { return levelIdx >= LEVELS.length - 1; },

    update(dt, enemyCount) {
      waveStartTime += dt;

      // Spawn pending enemies
      while (pendingSpawns.length && pendingSpawns[0].at <= waveStartTime) {
        const s = pendingSpawns.shift();
        onSpawn(s.type, s.x, s.y);
      }

      // Wave complete when all spawned and all dead
      if (pendingSpawns.length === 0 && enemyCount === 0 && !waitingForClear) {
        waitingForClear = true;
        return 'wave_clear';
      }
      return null;
    },

    nextWave() {
      waitingForClear = false;
      waveIdx++;
      if (waveIdx < LEVELS[levelIdx].waves.length) {
        loadWave(levelIdx, waveIdx);
        return 'wave';
      }
      return 'boss_time'; // all waves done — trigger boss
    },

    nextLevel() {
      levelIdx++;
      waveIdx = 0;
      waitingForClear = false;
      if (levelIdx < LEVELS.length) {
        loadWave(levelIdx, waveIdx);
        return 'level';
      }
      return 'victory'; // all levels done
    },

    reset() {
      levelIdx = 0; waveIdx = 0; waveStartTime = 0;
      waitingForClear = false;
      pendingSpawns = [];
      loadWave(0, 0);
    },
  };
}
```

- [ ] **Step 2: Wire into `src/main.js`**

```js
import { createWaveSequencer } from './levels.js';
// Remove temporary test spawns from Task 7

const sequencer = createWaveSequencer((type, x, y) => enemies.spawn(type, x, y));

// In game loop (PLAYING state only):
const result = sequencer.update(dt, enemies.active.length);
if (result === 'wave_clear') {
  const next = sequencer.nextWave();
  if (next === 'boss_time') state.phase = PHASE.BOSS_FIGHT;
}
```

- [ ] **Step 3: Open browser — enemies spawn in waves; after all 5 waves, state transitions to BOSS_FIGHT (nothing visible yet)**

- [ ] **Step 4: Commit**

```bash
git add src/levels.js src/main.js
git commit -m "feat: wave sequencer with 3 levels × 5 waves each"
```

---

## Task 12: Boss

**Files:**
- Create: `src/boss.js`

- [ ] **Step 1: Create `src/boss.js`**

```js
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
```

- [ ] **Step 2: Wire into `src/main.js`**

```js
import { createBoss } from './boss.js';
let boss = null;

// When transitioning to BOSS_FIGHT:
function startBoss() {
  boss = createBoss(scene, state.level - 1);
  state.phase = PHASE.BOSS_FIGHT;
  document.getElementById('boss-bar-container').style.display = 'block';
}

// In game loop (BOSS_FIGHT state):
if (state.phase === PHASE.BOSS_FIGHT && boss) {
  boss.update(dt, player.mesh.position.x, player.mesh.position.y,
    (ex, ey, px, py) => bullets.spawnEnemyBullet(ex, ey, px, py));

  // Update boss health bar
  document.getElementById('boss-bar-fill').style.width = (boss.hpFraction * 100) + '%';

  // Player bullets vs boss
  for (let i = bullets.activeBullets.length - 1; i >= 0; i--) {
    const b = bullets.activeBullets[i];
    if (b.owner !== 'player') continue;
    if (aabbOverlap({ x: b.mesh.position.x, y: b.mesh.position.y, hw: 0.15, hh: 0.15 }, boss.getBBox())) {
      boss.takeDamage(1);
      bullets.recycleBullet(b);
      if (!boss.alive) {
        addKill('boss', Date.now());
        particles.explode(0, 0, -25, 40, 0xff4400);
        document.getElementById('boss-bar-container').style.display = 'none';
        boss = null;
        // Level clear
        const next = sequencer.nextLevel();
        if (next === 'victory') {
          state.phase = PHASE.GAME_OVER; // victory handled in GAME_OVER screen
        } else {
          state.phase = PHASE.LEVEL_CLEAR;
        }
        break;
      }
    }
  }

  // Boss vs player collision
  if (boss && aabbOverlap(boss.getBBox(), player.getBBox())) {
    if (player.takeDamage()) resetStreak();
  }
}

// Trigger boss from wave sequencer (replace inline nextWave call):
if (result === 'wave_clear') {
  const next = sequencer.nextWave();
  if (next === 'boss_time') startBoss();
}
```

- [ ] **Step 3: Open browser — complete 5 waves, boss appears with health bar; shoot it, watch phases change**

- [ ] **Step 4: Commit**

```bash
git add src/boss.js src/main.js
git commit -m "feat: boss with 3 phases, health bar, attack patterns per level"
```

---

## Task 13: HUD & Game State Screens

**Files:**
- Create: `src/ui.js`

- [ ] **Step 1: Create `src/ui.js`**

```js
import { state, PHASE } from './state.js';

const $ = id => document.getElementById(id);

export function createUI() {
  const overlay      = $('screen-overlay');
  const scoreVal     = $('score-value');
  const hiScoreVal   = $('hiscore-value');
  const livesVal     = $('lives-value');
  const levelVal     = $('level-value');
  const multVal      = $('multiplier-value');
  const hiDisplay    = $('hiscore-display');

  hiDisplay.textContent = `HI-SCORE: ${state.hiScore}`;
  hiScoreVal.textContent = state.hiScore;

  return {
    update() {
      scoreVal.textContent   = state.score;
      hiScoreVal.textContent = state.hiScore;
      livesVal.textContent   = '♦ '.repeat(state.lives).trim() || '---';
      levelVal.textContent   = `LEVEL ${state.level}`;
      multVal.textContent    = state.multiplier > 1 ? `×${state.multiplier}` : '';
    },

    showMenu() {
      overlay.classList.remove('hidden');
      overlay.innerHTML = `
        <h1>SPACE RAILS</h1>
        <p>WASD / ARROWS — MOVE<br>SPACE / CLICK — SHOOT<br>B / RIGHT CLICK — BOMB</p>
        <p>HI-SCORE: ${state.hiScore}</p>
        <p style="animation:blink 1s step-end infinite">PRESS ENTER TO START</p>`;
    },

    showLevelClear(levelNum) {
      overlay.classList.remove('hidden');
      overlay.innerHTML = `
        <h1 style="font-size:20px">LEVEL ${levelNum} CLEAR!</h1>
        <p>SCORE: ${state.score}</p>
        <p style="animation:blink 1s step-end infinite">PRESS ENTER TO CONTINUE</p>`;
    },

    showGameOver(victory = false) {
      overlay.classList.remove('hidden');
      const newHi = state.score >= state.hiScore;
      overlay.innerHTML = `
        <h1 style="font-size:${victory?'20px':'24px'};color:${victory?'#ffff00':'#ff4444'}">${victory ? 'YOU WIN!' : 'GAME OVER'}</h1>
        ${newHi ? '<p style="color:#ffff00">NEW HI-SCORE!</p>' : ''}
        <p>SCORE: ${state.score}</p>
        <p>HI-SCORE: ${state.hiScore}</p>
        <p style="animation:blink 1s step-end infinite">PRESS ENTER TO CONTINUE</p>`;
    },

    hideLevelScreen() {
      overlay.classList.add('hidden');
    },
  };
}
```

- [ ] **Step 2: Wire `src/ui.js` into `src/main.js` and handle all state transitions**

```js
import { createUI } from './ui.js';
const ui = createUI();

// In loop: ui.update();

// Handle LEVEL_CLEAR and GAME_OVER enter key
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (state.phase === PHASE.MENU) {
    ui.hideLevelScreen();
    resetForNewGame();
    enemies.clear(); bullets.clear(); powerups.clear(); particles.clear();
    sequencer.reset();
    player.reset();
  } else if (state.phase === PHASE.LEVEL_CLEAR) {
    state.level++;
    state.phase = PHASE.PLAYING;
    ui.hideLevelScreen();
  } else if (state.phase === PHASE.GAME_OVER) {
    state.phase = PHASE.MENU;
    ui.showMenu();
  }
});

// On boss defeat (victory case):
// if (next === 'victory') { state.phase = PHASE.GAME_OVER; ui.showGameOver(true); }

// On level clear:
// state.phase = PHASE.LEVEL_CLEAR; ui.showLevelClear(state.level);

// On game over (lives = 0):
// state.phase = PHASE.GAME_OVER; ui.showGameOver(false);
// In player.takeDamage(): if (state.lives === 0) trigger game over
```

- [ ] **Step 3: Open browser — verify score counts, lives decrement, level clear and game over screens appear**

- [ ] **Step 4: Commit**

```bash
git add src/ui.js src/main.js
git commit -m "feat: HUD updates and game state screens (menu, level clear, game over)"
```

---

## Task 14: Audio

**Files:**
- Create: `src/audio.js`

- [ ] **Step 1: Create `src/audio.js`**

```js
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone({ freq = 440, type = 'square', duration = 0.1, gain = 0.3, freqEnd = null, detune = 0 }) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.connect(g); g.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + duration);
  osc.detune.setValueAtTime(detune, c.currentTime);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

function playNoise(duration = 0.1, gain = 0.2, freqLow = 100, freqHigh = 2000) {
  const c = getCtx();
  const bufSize = c.sampleRate * duration;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = (freqLow + freqHigh) / 2;
  filter.Q.value = 0.5;
  const g = c.createGain();
  src.connect(filter); filter.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  src.start(); src.stop(c.currentTime + duration);
}

export const audio = {
  shoot()         { playTone({ freq: 880, type: 'square', duration: 0.06, gain: 0.15 }); },
  explodeSmall()  { playNoise(0.12, 0.25, 200, 1800); },
  explodeLarge()  { playNoise(0.4,  0.4,  60,  800); },
  powerUp()       {
    [440, 554, 659, 880].forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, type: 'square', duration: 0.08, gain: 0.2 }), i * 60));
  },
  playerHit()     { playTone({ freq: 220, freqEnd: 80, type: 'sawtooth', duration: 0.3, gain: 0.3 }); },
  bossPhase()     {
    [110, 138, 164].forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, type: 'sawtooth', duration: 0.4, gain: 0.35 }), i * 100));
  },
};
```

- [ ] **Step 2: Wire audio into `src/main.js` at all relevant events**

Add `import { audio } from './audio.js';` at the top.

Then insert calls at these exact locations in the game loop / event handlers:

```js
// 1. Player shooting (where spawnPlayerBullet is called):
audio.shoot();
bullets.spawnPlayerBullet(px, py);

// 2. Enemy killed (where enemies.remove(e) is called after hp <= 0):
audio.explodeSmall();
particles.explode(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, 8, 0xff6600);
enemies.remove(e);

// 3. Power-up collected (where powerups.collect() is called):
audio.powerUp();
powerups.collect(powerups.active[i]);

// 4. Player hit (where player.takeDamage() returns true):
audio.playerHit();
particles.explode(player.mesh.position.x, player.mesh.position.y, 0, 12, 0xffffff);

// 5. Boss defeated (where boss.alive becomes false):
audio.explodeLarge();

// 6. Boss phase change — track previous phase, call when it changes:
let prevBossPhase = 0;
// In BOSS_FIGHT update block, after boss.update():
const curPhase = boss ? Math.floor((1 - boss.hpFraction) / 0.34) : 0;
if (boss && curPhase !== prevBossPhase) { prevBossPhase = curPhase; audio.bossPhase(); }
```

- [ ] **Step 3: Open browser — verify sounds play on shoot, explosion, power-up, hit**

- [ ] **Step 4: Commit**

```bash
git add src/audio.js src/main.js
git commit -m "feat: Web Audio API synthesized 8-bit sound effects"
```

---

## Task 15: Full Integration & Polish

**Files:**
- Modify: `src/main.js` — wire all remaining loose ends

- [ ] **Step 1: Audit `src/main.js` — verify all TODOs are resolved**
  - Game over triggers when `state.lives === 0` after `player.takeDamage()`
  - Victory triggers after defeating level 3 boss
  - Level clear shows between levels, level number increments
  - Boss phase change triggers `audio.bossPhase()`
  - HUD multiplier shows/hides correctly
  - `resetStreak()` called on player hit

- [ ] **Step 2: Game over on 0 lives — add to player hit logic in main.js**

```js
// After player.takeDamage() returns true:
if (state.lives === 0) {
  state.phase = PHASE.GAME_OVER;
  ui.showGameOver(false);
  enemies.clear(); bullets.clear(); powerups.clear(); boss = null;
  document.getElementById('boss-bar-container').style.display = 'none';
}
```

- [ ] **Step 3: Speed scaling — increase enemy speed each level**

In `src/enemies.js` `update()`, replace hardcoded `12 * dt` with:
```js
const levelSpeed = 12 + (state.level - 1) * 3; // +3 per level
e.mesh.position.z += levelSpeed * dt;
```
Import `state` at top of `enemies.js`.

- [ ] **Step 4: Play full game from menu — verify all 3 levels + 3 bosses play through to victory screen**

- [ ] **Step 5: Final commit**

```bash
git add src/main.js src/enemies.js
git commit -m "feat: full game integration — game over, victory, level speed scaling"
```

---

## Task 16: README

- [ ] **Step 1: Create `README.md`**

```markdown
# Space Rails

3D on-rails arcade space shooter. Runs in the browser — no install required.

## How to Play

Open `index.html` in any modern browser (Chrome/Firefox/Edge).

| Action | Keyboard | Mouse |
|---|---|---|
| Move | WASD / Arrows | Move cursor |
| Shoot | Hold Space | Hold left click |
| Bomb | B | Right click |

## Build

No build step. Open `index.html` directly.

## Tests

Open `tests/test-runner.html` in a browser.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with controls and setup"
```
