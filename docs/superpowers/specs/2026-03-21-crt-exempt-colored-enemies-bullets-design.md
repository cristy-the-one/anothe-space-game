# CRT-Exempt Colored Enemies & Bullets

## Overview
Shader exemptions for enemies (orange tones) & bullets/projectiles (red) to stand out through green CRT tint. Uses Three.js layers for selective post-processing.

## Goals
- Enemies: solid orange per type (grunt 0xff8800, etc.), visible distinct.
- Bullets: enemy red 0xff4444 (already), untinted.
- Preserve green retro aesthetic for player/background.

## Approach (Chosen #3)
Multi-pass composer: Layer 0 (bg/player) → pixelate → CRT. Layer 1 (enemies/bullets) → pixelate only → overlay blend.

## Components
### renderer.js
- Dual RenderPass: layer0 (tinted), layer1 (raw).
- Shader unchanged; selective via layers.

### Materials
| Object | Color | Layer | Emissive |
|--------|-------|-------|----------|
| Grunt | 0xffaa44 → brighter 0xff8800 | 1 | 0x442200 |
| Weaver | 0xffff44 | 1 | 0x664400 |
| Shooter | 0xff44cc | 1 | 0x442266 |
| Kamikaze | 0xff4444 | 1 | 0x442200 |
| Enemy bullets | 0xff4444 | 1 | 0x330000 |
| Boss | Existing orange w/ emissive | 1 | Existing |

## Integration
- Spawn funcs: `mesh.layers.set(1)`
- Defaults layer0.

## Testing
- Visual: Enemies/bullets pop orange/red.
- Regress: Collisions, z-order, perf.

Generated 2026-03-21