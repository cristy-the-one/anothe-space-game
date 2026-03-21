# CRT-Exempt Colored Enemies & Bullets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exempt enemies (orange) & bullets (red) from CRT green tint using Three.js layers/multi-pass.

**Architecture:** renderer.js: Dual RenderPass (layer0 tinted, layer1 raw). Spawn funcs: layers.set(1). Enemies solid orange w/ emissive.

**Tech Stack:** Three.js EffectComposer, RenderPass, Layers, MeshBasicMaterial.

**Reference spec:** docs/superpowers/specs/2026-03-21-crt-exempt-colored-enemies-bullets-design.md

---

### Task 1: Dual RenderPass in renderer.js

**Files:**
- Modify: src/renderer.js

- [ ] Read src/renderer.js for baseline

- [ ] Update composer:
```js
const renderPassLayer0 = new RenderPass(scene, camera);
renderPassLayer0.enabled = true;
camera.layers.enable(0); // default
composer.addPass(renderPassLayer0);

const renderPassLayer1 = new RenderPass(scene, camera);
renderPassLayer1.enabled = true;
camera.layers.enable(1);
composer.addPass(renderPassLayer1);

const pixelPass1 = pixelPass.clone(); // layer0 pixelate
composer.addPass(pixelPass1);
const crtPassLayer0 = crtPass.clone(); // layer0 CRT
composer.addPass(crtPassLayer0);

const pixelPass2 = pixelPass.clone(); // layer1 pixelate only
composer.addPass(pixelPass2);
// No CRT for layer1
```
Note: Pass order: layer0 render → pixel → CRT → layer1 render → pixel.

- [ ] Test: Run index.html — no crash, all visible (tinted).

- [ ] Commit:
```bash
git add src/renderer.js
git commit -m \"feat: dual layer RenderPass for exempt objects\"
```

### Task 2: Enemy layer & solid orange materials

**Files:**
- Modify: src/enemies.js

- [ ] Update MESHES:
```js
grunt: () => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8), new THREE.MeshBasicMaterial({color:0xff8800, emissive:0x442200}));
  m.layers.set(1);
  return m;
},
// Similar for weaver 0xffff44 emissive 0x664400, shooter 0xff44cc:0x442266, kamikaze 0xff4444:0x442200
```

- [ ] In spawn: `scene.add(mesh); mesh.layers.set(1);` (already in material)

- [ ] Test: Spawn enemies — orange solid, untinted.

- [ ] Commit:
```bash
git add src/enemies.js
git commit -m \"feat: solid orange enemies on exempt layer\"
```

### Task 3: Bullets & boss exempt layer

**Files:**
- Modify: src/bullets.js, src/boss.js

- [ ] bullets.js pools: `makeBulletMesh(color): m.layers.set(1); return m;`

- [ ] boss.js: `mesh.layers.set(1); group.layers.set(1);` recurse children if needed.

- [ ] Test: Shooters/kamikaze/boss — red bullets untinted.

- [ ] Commit:
```bash
git add src/bullets.js src/boss.js
git commit -m \"feat: exempt bullets & boss from tint\"
```

### Task 4: Final verification & cleanup

**Files:**
- None new

- [ ] Full run: Local server, complete wave/boss — colors distinct, no perf/z issues.

- [ ] git status/log — clean.

- [ ] Commit summary if needed.

Generated 2026-03-21