"use client";

import { useEffect, useRef } from "react";

const CHARS = " .:-=+*#%@";

export default function AsciiBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const cellW = 10;
    const cellH = 16;
    const fontSize = 12;

    const draw = () => {
      time += 0.008;
      const cols = Math.floor(canvas.width / cellW);
      const rows = Math.floor(canvas.height / cellH);

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const nx = x / cols;
          const ny = y / rows;

          // Layered sine waves creating flowing patterns
          const v1 = Math.sin(nx * 6 + time * 0.7) * Math.cos(ny * 4 - time * 0.5);
          const v2 = Math.sin((nx + ny) * 3 + time * 0.3);
          const v3 = Math.sin(Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 8 - time * 1.2);
          const v = (v1 + v2 + v3) / 3;

          const normalized = (v + 1) / 2;
          const charIdx = Math.floor(normalized * (CHARS.length - 1));
          const char = CHARS[charIdx];

          // Green accent with varying brightness
          const brightness = Math.floor(normalized * 40 + 15);
          const green = Math.floor(normalized * 255 * 0.3 + 30);
          ctx.fillStyle = `rgba(0, ${green}, ${Math.floor(green * 0.55)}, ${brightness / 100})`;
          ctx.fillText(char, x * cellW, y * cellH + fontSize);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.35 }}
    />
  );
}
