---
name: ascii-banner
description: "Build animated ASCII banners for CLI tools and web interfaces. Frame-based animation, ANSI color systems, terminal compatibility, accessibility, flicker-free rendering, and web-based ASCII shaders. Use when creating CLI splash screens, terminal animations, branded ASCII art, or web ASCII effects."
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

**Mandatory requirements:**

| Requirement | Implementation |
|-------------|---------------|
| Opt-in animation | Behind a flag (`--banner`, `--animate`) — never auto-play |
| Screen reader safe | Use `aria-live` equivalent: announce start/end, skip frames |
| Reduced motion | Respect `REDUCE_MOTION` env var or OS setting |
| Graceful degradation | Static ASCII art fallback when animation is disabled |
| Color-independent | Art must be recognizable without color (shape > color) |

```javascript
function shouldAnimate() {
  if (process.env.NO_ANIMATION) return false;
  if (process.env.REDUCE_MOTION) return false;
  if (!process.stdout.isTTY) return false;
  if (process.env.TERM === "dumb") return false;
  return true;
}
```

### 6. ASCII Art Design

**Character density (for shading):**
```
Light → Dense:  . : - = + * # % @
```

**Common block characters:**
```
Borders:    ┌ ─ ┐ │ └ ┘ ╔ ═ ╗ ║ ╚ ╝
Blocks:     ░ ▒ ▓ █ ▄ ▀ ▐ ▌
Geometry:   ╱ ╲ △ ▽ ◇ ○ ●
Arrows:     → ← ↑ ↓ ⟶ ⟵
```

**figlet for text banners:**
```bash
# Install
npm install figlet
# or
pip install pyfiglet

# Generate
figlet -f slant "SKILLS"
pyfiglet -f slant "SKILLS"
```

**Popular figlet fonts:** `slant`, `banner3`, `big`, `doom`, `standard`, `small`

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

For animated 3D scenes rendered as ASCII:

```javascript
import * as THREE from "three";

// 1. Create scene with geometry
const scene = new THREE.Scene();
const geometry = new THREE.TorusKnotGeometry(1, 0.35, 128, 32);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// 2. Render to offscreen WebGL
const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);

// 3. Read pixels → ASCII conversion (same as canvas method)
// 4. Output to visible canvas as ASCII characters

// Animation loop
function animate() {
  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.007;
  renderer.render(scene, camera);
  renderAscii(asciiCtx, asciiCanvas, renderer.domElement, 8, 14);
  requestAnimationFrame(animate);
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

**From text to ASCII banner:**
```bash
# Quick branded banner
figlet -f slant "skills.ws" | sed 's/^/  /'

# With color (bash)
echo -e "\033[32m$(figlet -f slant 'skills.ws')\033[0m"
```

## Checklist

- [ ] Terminal capability detection before rendering
- [ ] Fallback to static art when animation disabled
- [ ] Respect NO_COLOR and REDUCE_MOTION env vars
- [ ] Hide cursor during animation, restore after
- [ ] Use alternate screen buffer for full-screen animations
- [ ] Differential rendering to prevent flicker
- [ ] Test on: iTerm2, Terminal.app, Windows Terminal, Alacritty, VS Code terminal
- [ ] Cleanup on SIGINT (restore cursor, clear buffer)
- [ ] Keep animation under 3 seconds (respect user's time)
- [ ] Web: add gradient fade, throttle to 30fps max
