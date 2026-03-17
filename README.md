# Space Rails

3D on-rails arcade space shooter. Runs in the browser — no install required.

## How to Play

Open `index.html` via a local HTTP server (ES modules require HTTP — see below).

| Action | Keyboard | Mouse |
|---|---|---|
| Move | WASD / Arrows | Move cursor |
| Shoot | Hold Space | Hold left click |
| Bomb | B | Right click |
| Pause | Escape | — |

## Starting a Local Server

**Python:**
```bash
python -c "import http.server, socketserver; h=http.server.SimpleHTTPRequestHandler; h.extensions_map['.js']='application/javascript'; socketserver.TCPServer(('',8080),h).serve_forever()"
```
Then open `http://localhost:8080`

**Node:**
```bash
npx serve .
```

**VS Code:** Right-click `index.html` → Open with Live Server

## Build

No build step. All assets are procedural — no files to download.

## Tests

Open `tests/test-runner.html` via the same local server.

## Gameplay

- 3 levels × 5 waves + boss fight each
- 4 enemy types: Grunt, Weaver, Shooter, Kamikaze
- 5 power-ups: Spread Shot, Shield, Speed Boost, Rapid Fire, Bomb
- Kill streak multiplier (×1 / ×2 / ×4)
- High score saved to localStorage
