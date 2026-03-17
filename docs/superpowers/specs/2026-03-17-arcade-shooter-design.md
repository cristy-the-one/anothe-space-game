# Arcade Space Rails Shooter — Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

A 3D on-rails arcade space shooter playable in the browser. The player's ship flies forward automatically along a Z-axis tunnel while the player steers left/right/up/down and shoots enemies. Inspired by Star Fox. Features waves of enemies, boss battles, power-ups, and a local high score.

---

## Tech Stack

- **Runtime:** Browser (no install, no build step)
- **3D Engine:** [Three.js](https://threejs.org) via CDN
- **Post-processing:** `THREE.EffectComposer` (pixelation, scanlines, CRT warp, green palette)
- **Audio:** Web Audio API (synthesized 8-bit sounds, no audio files)
- **Persistence:** `localStorage` (high score only)
- **Language:** Vanilla JS ES modules

---

## File Structure

```
index.html
src/
  main.js          — bootstrap, game loop (requestAnimationFrame)
  renderer.js      — Three.js setup, EffectComposer, pixel post-processing passes
  scene.js         — 3D scene, camera, lighting, starfield
  player.js        — ship mesh, movement clamping, shooting, input handling
  enemies.js       — enemy types, spawn logic, movement patterns
  bullets.js       — bullet pool for player and enemy projectiles
  powerups.js      — power-up types, spawn on enemy death, collection logic
  boss.js          — boss mesh, health phases, attack state machine
  levels.js        — level definitions, wave configs, difficulty scaling
  ui.js            — HTML/CSS HUD overlay (score, lives, level, boss bar)
  audio.js         — Web Audio API synth for shoot, explosion, power-up sounds
  state.js         — global game state machine, score, lives, active power-ups
assets/            — (empty; all visuals are procedural geometry)
```

---

## Architecture

Single-page app. `index.html` loads `src/main.js` as an ES module. All other modules are imported from `main.js` or each other. No bundler required.

Each module owns one clear responsibility and exposes a minimal API (init, update, reset). Modules communicate through the shared `state.js` object and direct function calls — no event bus needed at this scale.

---

## Game State Machine

```
MENU → PLAYING → BOSS_FIGHT → LEVEL_CLEAR → GAME_OVER → MENU
```

- **MENU:** Title screen, show high score, press Enter/click to start
- **PLAYING:** Normal wave gameplay
- **BOSS_FIGHT:** Boss spawns after final wave of a level; music/visual change
- **LEVEL_CLEAR:** Brief text cutscene between levels
- **GAME_OVER:** Show final score, compare to high score, save to localStorage

---

## Game Loop (requestAnimationFrame)

Each frame in order:
1. Read input (keyboard + mouse)
2. Update player position & shooting
3. Update enemies (spawn, move, shoot)
4. Update bullets (move, check collisions vs player + enemies)
5. Update power-ups (float animation, check collection)
6. Update boss (if BOSS_FIGHT state)
7. Update particles/explosions (fade, recycle pool)
8. Update HUD (score, lives, boss health bar)
9. Render (Three.js scene → EffectComposer post-processing)

---

## Gameplay Systems

### On-Rails Movement
Camera and player ship move forward along the Z-axis at a constant speed (increasing slightly each level). Player steers within a clamped 2D bounding box (`±8` units X, `±5` units Y). Ship tilts slightly in the direction of movement for feel.

### Combat
- Player shoots forward with auto-fire (hold Space or hold mouse button)
- Default: single bullet per shot
- All bullets use object pools to avoid GC spikes
- Collision detection: AABB per entity, checked every frame
- Max entities in play: ~50 enemies + ~100 bullets (safe for O(n×m) checks)

### Enemy Types
| Type | Behavior |
|---|---|
| Grunt | Flies straight at player |
| Weaver | Sine-wave movement |
| Shooter | Stops mid-field, fires at player, retreats |
| Kamikaze | Fast dive at player ship |

### Power-ups
Drop from killed enemies (~15% chance):

| Power-up | Effect | Duration |
|---|---|---|
| Spread Shot | 3-way bullet fan | 10s |
| Shield | Absorbs 1 hit | Until hit |
| Speed Boost | Faster ship movement | 8s |
| Rapid Fire | 2× fire rate | 10s |
| Bomb | Instantly destroys all on-screen enemies | Instant |

### Waves & Levels
- 3 levels, each with 5 waves of enemies
- Wave difficulty scales: more enemies, faster movement, more shooters
- After wave 5: boss fight
- After boss death: LEVEL_CLEAR cutscene, then next level

### Boss
- One boss per level, unique mesh per boss
- 3 health phases (100%→66%→33%), each phase changes attack pattern
- Phase 1: slow spread shot
- Phase 2: adds homing missiles
- Phase 3: erratic movement + rapid fire
- Health bar shown at bottom of HUD during BOSS_FIGHT

### Score
- +10 per grunt kill, +25 weaver/shooter, +50 kamikaze, +500 boss
- Consecutive kill multiplier (×1 → ×2 → ×4, resets on player hit or 3s gap)
- High score saved to `localStorage`, displayed on MENU screen

### Lives
- 3 lives, lose 1 on collision with enemy or enemy bullet
- Brief invincibility frames (2s) after hit
- Game over at 0 lives

---

## Visual & Rendering

### 3D Scene
- All geometry is procedural Three.js primitives — no texture files
- Player ship: `ConeGeometry` + wing planes, green emissive material
- Enemies: `BoxGeometry` / `DodecahedronGeometry`, red/orange flat shading
- Bosses: compound meshes (multiple geometries merged), larger scale
- Starfield: 1000 `Points` in a long cylinder, recycled as they pass the camera

### Post-Processing (EffectComposer)
Applied in order:
1. **Pixelation pass** — render at 320×240, upscale to fill screen
2. **Scanline pass** — horizontal lines at 2px intervals, 30% opacity
3. **CRT barrel warp** — subtle edge distortion shader
4. **Color grade** — shift palette toward green phosphor (#00ff41 dominant)

### Explosions
- Pool of 20 reusable `BoxGeometry` cube particles per explosion
- On trigger: scatter outward with random velocity, scale down, fade opacity over 0.5s
- Return to pool when invisible

### HUD
- HTML/CSS overlay (`position: absolute` over canvas)
- Font: **Press Start 2P** (Google Fonts) for pixel aesthetic
- Top-left: SCORE / HI-SCORE
- Top-right: LIVES (ship icons)
- Top-center: LEVEL
- Bottom-center: BOSS health bar (hidden during normal waves)

---

## Input

| Action | Keyboard | Mouse |
|---|---|---|
| Move ship | WASD / Arrow keys | Move cursor (ship follows) |
| Shoot | Hold Space | Hold left button |
| Bomb (if collected) | B | Right click |
| Pause | Escape | — |

Both input methods active simultaneously.

---

## Audio

All sounds synthesized via Web Audio API — no audio files needed:
- **Shoot:** Short high-pitched oscillator burst
- **Explosion (small):** Noise burst, fast decay
- **Explosion (large/boss):** Lower noise burst, longer decay
- **Power-up collect:** Rising arpeggio
- **Player hit:** Descending tone + distortion
- **Boss phase change:** Dramatic chord stab

---

## Out of Scope (v1)

- Multiplayer
- Online leaderboard
- Mobile touch controls
- Saved progress / checkpoints
- More than 3 levels
- Cutscene animations

---

## Success Criteria

- Loads in browser with no install or build step
- Feels fast and responsive (60fps target)
- Retro pixel/CRT look is immediately recognizable
- Full run (3 levels + 3 bosses) completable in ~10 minutes
- High score persists across sessions
