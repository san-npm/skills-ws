---
name: ascii-banner
description: "Build animated ASCII/Unicode banners for CLI tools and web UIs — frame animation, ANSI color, terminal capability detection, flicker-free rendering, accessibility, and canvas/WebGL ASCII shaders. Use when adding a CLI startup banner, building terminal-aesthetic web UIs, converting images/3D scenes to ASCII, or making banner animation TTY-safe."
---

# Animated ASCII Banners

## Overview

Animated ASCII banners create personality in CLI tools and terminal-aesthetic web UIs. This skill covers both terminal-native (Node.js/Python CLI) and web-based (canvas/WebGL) implementations.

**Key challenges:** Terminal inconsistency, ANSI color fragmentation, screen reader accessibility, flicker prevention, and cross-platform rendering.

## Part 1: Terminal ASCII Animation (CLI)

### 1. Frame-Based Animation Architecture

```
project/
  frames/           # Each .txt file is one animation frame
    frame-001.txt
    frame-002.txt
    ...
  colors/           # Color map per frame (optional)
    frame-001.json
  src/
    renderer.ts     # Animation engine
    palette.ts      # ANSI color role mapping
    detect.ts       # Terminal capability detection
```

### 2. Basic Animation Loop (Node.js)

```javascript
import fs from "fs";
import readline from "readline";

const frames = fs
  .readdirSync("./frames")
  .filter(f => f.endsWith(".txt"))
  .sort()
  .map(f => fs.readFileSync(`./frames/${f}`, "utf8"));

let current = 0;
let running = true;

function render() {
  if (!running) return;
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  process.stdout.write(frames[current]);
  current = (current + 1) % frames.length;
}

// 75ms = ~13fps — safe for most terminals
const interval = setInterval(render, 75);

// Graceful cleanup
process.on("SIGINT", () => {
  running = false;
  clearInterval(interval);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  process.exit(0);
});

// Auto-stop after one loop
setTimeout(() => {
  clearInterval(interval);
  running = false;
}, frames.length * 75);
```

### 3. ANSI Color System

**Use semantic color roles, not hardcoded values.** Terminals remap colors based on user themes.

```javascript
// Color role mapping — degrade gracefully across terminals
const ANSI_ROLES = {
  primary:   "\x1b[32m",   // Green (accent)
  secondary: "\x1b[36m",   // Cyan
  highlight: "\x1b[97m",   // Bright white
  shadow:    "\x1b[90m",   // Dark gray
  dim:       "\x1b[2m",    // Dim modifier
  reset:     "\x1b[0m",
};

function colorize(char, role) {
  if (!role || role === "none") return char;
  return `${ANSI_ROLES[role] || ""}${char}${ANSI_ROLES.reset}`;
}
```

**ANSI color modes:**

| Mode | Colors | Support | Use |
|------|--------|---------|-----|
| 4-bit | 16 colors | Universal | Safe default — use this |
| 8-bit | 256 colors | Most modern terminals | Extended palette |
| 24-bit (truecolor) | 16M colors | iTerm2, Kitty, modern terminals | Brand-exact colors |

**Terminal detection:**
```javascript
function getColorSupport() {
  const env = process.env;
  if (env.NO_COLOR) return "none";
  if (env.COLORTERM === "truecolor" || env.COLORTERM === "24bit") return "24bit";
  if (env.TERM_PROGRAM === "iTerm.app") return "24bit";
  if (env.TERM?.includes("256color")) return "8bit";
  if (process.stdout.isTTY) return "4bit";
  return "none";
}
```

### 4. Flicker Prevention

**Problem:** `clearScreen` + full repaint causes visible flicker.

**Solution:** Differential rendering — only repaint changed characters:

```javascript
let previousFrame = "";

function renderDiff(frame) {
  const lines = frame.split("\n");
  const prevLines = previousFrame.split("\n");

  for (let y = 0; y < lines.length; y++) {
    if (lines[y] !== prevLines[y]) {
      readline.cursorTo(process.stdout, 0, y);
      process.stdout.write(lines[y] + "\x1b[K"); // Clear to end of line
    }
  }
  previousFrame = frame;
}
```

**Additional techniques:**
- Use alternate screen buffer (`\x1b[?1049h` to enter, `\x1b[?1049l` to exit)
- Hide cursor during animation (`\x1b[?25l`, restore with `\x1b[?25h`)
- Batch writes using a string buffer, write once per frame

### 5. Accessibility

Terminals have **no `aria-live` equivalent** — a screen reader reads stdout linearly, so every cursor-repositioned frame you write risks being announced as new text (a "chatterbox" of garbage). The accessible pattern is the opposite of the web one: **emit a single static text line, then do all animation with raw escape codes that assistive tech ignores or that you suppress entirely when not on an interactive TTY.**

**Mandatory requirements:**

| Requirement | Concrete CLI implementation |
|-------------|------------------------------|
| Opt-in / opt-out | Animate only behind intent (`--banner`/`--animate`), and always honor `--no-banner`. Never auto-play in CI or pipes. |
| Static alternative | Before animating, print one plain line (e.g. `skills.ws — CLI v1.2.0`). This is what a screen reader and a logfile actually read; the animation is decoration layered on top. |
| Don't re-announce | Never rewrite the *text content* every frame. Either animate inside the alternate screen buffer (which most SR setups skip) or only repaint changed cells (see §4) so unchanged glyphs aren't re-emitted. |
| Reduced motion | There is **no standardized terminal "reduce motion" signal.** Disable animation when stdout is not a TTY, when `NO_COLOR` is set (users who set it generally want quiet output), when `TERM=dumb`, and via your own opt-out flag/config. On the **web** use the real standard: `@media (prefers-reduced-motion: reduce)`. |
| Graceful degradation | Static ASCII art fallback (no escapes) whenever animation is disabled by any check above. |
| Color-independent | Art must read by shape, not color — verify it's recognizable in `NO_COLOR=1` mode. |

```javascript
// CLI gate: only animate when it's safe and wanted.
// Note: NO_ANIMATION / REDUCE_MOTION are conventions, not standards —
// support them defensively but rely on the TTY/flag checks as the real signal.
function shouldAnimate({ flags = {} } = {}) {
  if (flags.noBanner) return false;            // explicit opt-out wins
  if (!process.stdout.isTTY) return false;     // piped, redirected, or CI
  if (process.env.CI) return false;            // build logs
  if (process.env.TERM === "dumb") return false;
  if (process.env.NO_COLOR) return false;      // user wants quiet output
  if (process.env.NO_ANIMATION) return false;  // de-facto convention
  if (process.env.REDUCE_MOTION) return false; // some apps export this; non-standard
  return true;
}

// Always emit the accessible line; animate only as decoration on top.
function showBanner(flags) {
  console.log("skills.ws — CLI v1.2.0");   // read by SR / captured in logs
  if (shouldAnimate({ flags })) startAnimation();
}
```

> Web equivalent: gate animation with the standardized media query, not an env var:
> ```javascript
> const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
> if (!reduce) startWebAnimation();
> ```

### 6. ASCII Art Design

**Pick a character set deliberately — "ASCII" and "terminal art" are not the same.** True ASCII is bytes 0x20–0x7E and renders identically everywhere (logs, dumb terminals, Windows `cmd`, CI). The box/block/arrow glyphs below are **Unicode** — gorgeous in iTerm2/Kitty/Windows Terminal but they mojibake on legacy code pages or under the wrong locale. Treat them as two distinct modes and pick based on `process.stdout.isTTY` + a UTF-8 locale check (`/utf-?8/i.test(process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || "")`).

**Mode A — ASCII-safe (universal, 0x20–0x7E only):**
```
Shading (light → dense):  . : - = + * # %  @
Borders:                  + - | =   (corners: + , edges: - and |)
Fills:                    . , ; * # @   (no solid blocks exist in ASCII)
Geometry / arrows:        / \ < > ^ v  (use v for down-arrow)
```

**Mode B — Unicode-enhanced (UTF-8 TTYs only; falls back to Mode A):**
```
Box-drawing:  ┌ ─ ┐ │ └ ┘ ╔ ═ ╗ ║ ╚ ╝ ├ ┤ ┬ ┴ ┼
Block fills:  ░ ▒ ▓ █ ▄ ▀ ▐ ▌   (▁▂▃▄▅▆▇█ for vertical bars/sparklines)
Geometry:     ╱ ╲ △ ▽ ◇ ○ ●
Arrows:       → ← ↑ ↓ ⟶ ⟵
```

```javascript
const supportsUnicode =
  process.stdout.isTTY &&
  /utf-?8/i.test(process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || "");
const charset = supportsUnicode ? UNICODE_SET : ASCII_SET;
```

**figlet for text banners.** `npm install figlet` installs the **library** locally — it does *not* put a `figlet` binary on your PATH. Use `npx` (downloads/runs the CLI without a global install), or install a CLI globally, or call the library from code.

```bash
# No-install, one-off (recommended): npx fetches the CLI on demand
npx figlet-cli -f Slant "SKILLS"

# OR install a CLI globally so `figlet` is on PATH
npm i -g figlet-cli        # provides the `figlet` command
figlet -f Slant "SKILLS"

# Python equivalent (pyfiglet ships a console script):
pip install pyfiglet
pyfiglet -f slant "SKILLS"
```

```javascript
// Or use the figlet npm package as a library (after `npm install figlet`):
import figlet from "figlet";
console.log(figlet.textSync("SKILLS", { font: "Slant" }));
```

**Popular figlet fonts:** `Slant`, `Banner3`, `Big`, `Doom`, `Standard`, `Small` (npm font names are capitalized; the system `figlet`/`pyfiglet` binaries accept lowercase like `slant`). List installed fonts with `figlet -l` or `pyfiglet -l`.

## Part 2: Web ASCII Animation (Canvas/WebGL)

### 7. Canvas-Based ASCII Renderer

Convert any visual (3D scene, video, image) to ASCII in the browser:

```javascript
const CHARS = " .:-=+*#%@";

function renderAscii(ctx, canvas, source, cellW, cellH) {
  // Draw source to small offscreen canvas
  const cols = Math.floor(canvas.width / cellW);
  const rows = Math.floor(canvas.height / cellH);
  const offscreen = new OffscreenCanvas(cols, rows);
  const offCtx = offscreen.getContext("2d");
  offCtx.drawImage(source, 0, 0, cols, rows);
  const pixels = offCtx.getImageData(0, 0, cols, rows).data;

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${cellH - 2}px monospace`;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const brightness = (pixels[i] * 0.299 + pixels[i+1] * 0.587 + pixels[i+2] * 0.114) / 255;
      if (brightness < 0.02) continue;

      const char = CHARS[Math.floor(brightness * (CHARS.length - 1))];
      const green = Math.floor(40 + brightness * 215);
      ctx.fillStyle = `rgba(0,${green},${Math.floor(green*0.55)},${0.3 + brightness * 0.7})`;
      ctx.fillText(char, x * cellW, y * cellH + cellH - 2);
    }
  }
}
```

### 8. Three.js + ASCII Post-Processing

Render an animated 3D scene to an offscreen WebGL buffer, then feed that buffer to the `renderAscii` function from §7. Complete, runnable example (Three.js r150+; verify the import path and API against your installed version — `THREE.WebGLRenderer` and ES-module imports are stable through mid-2026, but minor APIs drift):

```javascript
import * as THREE from "three";

// --- Sizing (drives BOTH the WebGL buffer and the visible ASCII canvas) ---
const WIDTH = 480, HEIGHT = 320;
const CELL_W = 8, CELL_H = 14; // monospace cell size in px

// --- Visible ASCII canvas (what the user sees) ---
const asciiCanvas = document.getElementById("ascii");
asciiCanvas.width = WIDTH;
asciiCanvas.height = HEIGHT;
const asciiCtx = asciiCanvas.getContext("2d", { willReadFrequently: false });

// --- Scene ---
const scene = new THREE.Scene();
const geometry = new THREE.TorusKnotGeometry(1, 0.35, 128, 32);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// --- Camera (REQUIRED — was missing) ---
const camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 0.1, 100);
camera.position.z = 4;

// --- Lighting (MeshStandardMaterial renders black without lights) ---
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(3, 4, 5);
scene.add(key);

// --- Offscreen WebGL renderer (its canvas is the SOURCE for renderAscii) ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(WIDTH, HEIGHT);
// renderer.domElement is NOT added to the DOM — it's our pixel source.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animate() {
  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.007;
  renderer.render(scene, camera);
  // renderAscii is defined in §7; it reads pixels and draws characters.
  renderAscii(asciiCtx, asciiCanvas, renderer.domElement, CELL_W, CELL_H);
  requestAnimationFrame(animate);
}

if (reduceMotion) {
  // Honor reduced motion: render a single static frame instead of looping.
  renderer.render(scene, camera);
  renderAscii(asciiCtx, asciiCanvas, renderer.domElement, CELL_W, CELL_H);
} else {
  animate();
}
```

### 9. Performance Optimization

| Technique | Impact | Implementation |
|-----------|--------|---------------|
| Skip black pixels | 30-50% fewer draw calls | `if (brightness < threshold) continue` |
| Throttle FPS | Reduce CPU usage | `requestAnimationFrame` with timestamp check |
| Reduce resolution | Fewer cells to render | Smaller offscreen canvas |
| Cache character metrics | Avoid repeated `measureText` | Pre-compute once |
| Use `willReadFrequently` | Faster `getImageData` | Pass to canvas context options |
| Gradient fade | Visual polish | CSS gradient overlay at edges |

### 10. Static ASCII Art Generation

**From image to ASCII (Python):**
```python
from PIL import Image

CHARS = " .:-=+*#%@"

def image_to_ascii(path, width=80):
    img = Image.open(path).convert("L")
    aspect = img.height / img.width
    height = int(width * aspect * 0.5)  # Terminal chars are ~2:1
    img = img.resize((width, height))

    ascii_art = ""
    for y in range(height):
        for x in range(width):
            brightness = img.getpixel((x, y)) / 255
            ascii_art += CHARS[int(brightness * (len(CHARS) - 1))]
        ascii_art += "\n"
    return ascii_art
```

**From text to ASCII banner** (uses `npx figlet-cli`; swap for a global `figlet` if installed — see §6):
```bash
# Quick branded banner, indented two spaces
npx figlet-cli -f Slant "skills.ws" | sed 's/^/  /'

# With green color (bash) — wrap in ANSI SGR codes
echo -e "\033[32m$(npx figlet-cli -f Slant 'skills.ws')\033[0m"
```

## Checklist

- [ ] Terminal capability detection (TTY + UTF-8 locale) before rendering
- [ ] Print a static text alternative first; fall back to static art when animation disabled
- [ ] Disable animation when not a TTY, in CI, with `NO_COLOR`, or `TERM=dumb`; web uses `prefers-reduced-motion`
- [ ] Choose ASCII-safe vs Unicode charset by capability (don't assume UTF-8)
- [ ] Hide cursor during animation, restore after
- [ ] Use alternate screen buffer for full-screen animations
- [ ] Differential rendering to prevent flicker
- [ ] Test on: iTerm2, Terminal.app, Windows Terminal, Alacritty, VS Code terminal
- [ ] Cleanup on SIGINT (restore cursor, clear buffer)
- [ ] Keep animation under 3 seconds (respect user's time)
- [ ] Web: add gradient fade, throttle to 30fps max
