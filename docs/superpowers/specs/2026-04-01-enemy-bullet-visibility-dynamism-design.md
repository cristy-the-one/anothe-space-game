# Design: Enemy Bullet Visibility & Game Feel
**Date:** 2026-04-01

## Problem
Enemy bullets are nearly invisible — tiny `0.08×0.08×0.4` red boxes that are suppressed further by the CRT green phosphor tint. Powerups and bullets share the same visual language (small bright geometric shapes), so players can't distinguish danger from reward at a glance. The game lacks dynamism: no trails, no feedback on hits.

## Goals
1. Enemy bullets are immediately readable as threats
2. Powerups are immediately readable as pickups (not threats)
3. Taking a hit feels physical
4. The scene feels alive between hits

## Out of Scope
- New enemy types, new powerup types
- Changes to game balance, damage, or spawn rates
- Audio changes

---

## Section 1 — Enemy Bullet Visibility + Bloom

### Bullet changes (`bullets.js`)
- Geometry: `0.08×0.08×0.4` → `0.15×0.15×0.6`
- Color: `0xff4444` (red) → `0xff6600` (orange)
  - Rationale: red is maximally suppressed by the CRT green tint; orange survives it and reads instinctively as danger

### Bloom pass (`renderer.js`)
Add `UnrealBloomPass` to the existing composer pipeline, inserted **before** the CRT pass so bloom samples raw bright values before color grading:
```
RenderPass → PixelPass → BloomPass → CRTPass
```
Settings:
- `threshold: 0.4` — picks up moderately bright surfaces
- `strength: 0.5` — visible glow without washing the scene
- `radius: 0.3` — tight bloom, not a haze

Side effect (intentional): player bullets (cyan), powerups, and explosion particles also get a subtle glow, improving overall scene life.

---

## Section 2 — Enemy Bullet Trails

### Approach
Each active enemy bullet maintains a ring buffer of its last **5 world positions**, updated every frame. A `THREE.Line` with `BufferGeometry` and `vertexColors` is created at bullet spawn and removed at recycle. Vertex colors fade from full bullet color at the head to `0x000000` / alpha 0 at the tail.

### Scope
- Trail objects are part of bullet lifecycle — created in `spawnEnemyBullet`, disposed in `recycleBullet`
- Player bullets do NOT get trails (player bullets are already readable; trails on both would add clutter)
- Max 120 `Line` objects (pool size), 5 points each — negligible GPU cost

---

## Section 3 — Screen Shake on Hit

### State (`state.js`)
Add `shakeIntensity: 0` to the state object.

### Trigger
When the player takes damage (wherever damage is applied in `collision.js` or `main.js`), set `state.shakeIntensity = 0.13`.

### Per-frame (`main.js`)
```
camera.position.x = baseCameraX + (Math.random() * 2 - 1) * state.shakeIntensity
camera.position.y = baseCameraY + (Math.random() * 2 - 1) * state.shakeIntensity
state.shakeIntensity *= (1 - dt * 10)  // decays in ~0.1s
if (state.shakeIntensity < 0.005) state.shakeIntensity = 0
```
- Translation only (no rotation) — keeps the pixel grid stable
- Snap-back in ~0.1 seconds

---

## Section 4 — Powerup Floating Labels

### Approach
Use Three.js `CSS2DRenderer` + `CSS2DObject` to attach a floating label to each powerup mesh. The label renders into a `div` overlay positioned over the canvas.

### Label content
Short all-caps strings matching powerup type:
| Type | Label |
|------|-------|
| spreadShot | SPREAD |
| shield | SHIELD |
| speedBoost | SPEED |
| rapidFire | RAPID |
| bomb | BOMB |

### Styling
- Font: monospace, ~11px, bold
- Color: same hex as the powerup's material color
- No background, no border
- Positioned `0.7` units above the mesh in world space

### Renderer changes (`renderer.js`)
- Instantiate `CSS2DRenderer`, size it to match the canvas, position it absolutely over the canvas container
- Call `css2dRenderer.render(scene, camera)` at the end of each frame after `composer.render()`
- Export `css2dRenderer` alongside `renderer` and `composer`

### Powerup changes (`powerups.js`)
- On `trySpawn`: create a `CSS2DObject` with the label div, attach to the powerup mesh at `(0, 0.7, 0)`
- On `collect` / expiry cleanup: call `mesh.remove(labelObject)` before removing the mesh from the scene

---

## Files Changed
| File | Change |
|------|--------|
| `src/bullets.js` | Enlarge enemy bullet geometry + color; add trail spawn/update/dispose |
| `src/renderer.js` | Add `UnrealBloomPass`; add `CSS2DRenderer` |
| `src/powerups.js` | Attach `CSS2DObject` label on spawn, remove on collect/expire |
| `src/state.js` | Add `shakeIntensity: 0` |
| `src/main.js` | Apply camera shake per-frame; set shake on player hit |
