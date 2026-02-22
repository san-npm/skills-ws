"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const ASCII_CHARS = " .,:-~=+*!#%$@";

export default function AsciiBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Setup Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    // ASCII overlay canvas
    const asciiCanvas = document.createElement("canvas");
    const asciiCtx = asciiCanvas.getContext("2d")!;
    asciiCanvas.style.position = "absolute";
    asciiCanvas.style.inset = "0";
    asciiCanvas.style.width = "100%";
    asciiCanvas.style.height = "100%";
    container.appendChild(asciiCanvas);

    // Hidden offscreen canvas for reading 3D render
    const offscreen = document.createElement("canvas");

    // 3D objects — rotating torus knot and floating spheres
    const torusGeo = new THREE.TorusKnotGeometry(1, 0.35, 128, 32);
    const torusMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, roughness: 0.4, metalness: 0.6 });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    scene.add(torus);

    // Floating particles
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 8;
    }
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particlesMat = new THREE.PointsMaterial({ color: 0x00ff88, size: 0.08 });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // Lighting
    const light1 = new THREE.DirectionalLight(0x00ff88, 2);
    light1.position.set(2, 3, 4);
    scene.add(light1);
    const light2 = new THREE.DirectionalLight(0x008844, 1);
    light2.position.set(-2, -1, 2);
    scene.add(light2);
    scene.add(new THREE.AmbientLight(0x001a0d, 0.5));

    const cellW = 8;
    const cellH = 14;
    const fontSize = 11;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      const cols = Math.floor(w / cellW);
      const rows = Math.floor(h / cellH);
      offscreen.width = cols;
      offscreen.height = rows;
      asciiCanvas.width = w;
      asciiCanvas.height = h;
    };
    resize();
    window.addEventListener("resize", resize);

    let animId: number;
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true })!;

    const animate = () => {
      const time = performance.now() * 0.001;

      torus.rotation.x = time * 0.3;
      torus.rotation.y = time * 0.2;
      torus.rotation.z = time * 0.1;

      particles.rotation.y = time * 0.05;
      particles.rotation.x = Math.sin(time * 0.1) * 0.2;

      // Render 3D scene
      renderer.render(scene, camera);

      // Read pixels at low resolution
      const cols = offscreen.width;
      const rows = offscreen.height;
      if (cols <= 0 || rows <= 0) { animId = requestAnimationFrame(animate); return; }

      offCtx.drawImage(renderer.domElement, 0, 0, cols, rows);
      const imageData = offCtx.getImageData(0, 0, cols, rows);
      const pixels = imageData.data;

      // Render ASCII
      asciiCtx.fillStyle = "#0a0a0a";
      asciiCtx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height);
      asciiCtx.font = `${fontSize}px monospace`;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

          if (brightness < 0.02) continue; // skip black

          const charIdx = Math.floor(brightness * (ASCII_CHARS.length - 1));
          const char = ASCII_CHARS[charIdx];

          const green = Math.floor(40 + brightness * 215);
          const alpha = 0.3 + brightness * 0.7;
          asciiCtx.fillStyle = `rgba(0, ${green}, ${Math.floor(green * 0.55)}, ${alpha})`;
          asciiCtx.fillText(char, x * cellW, y * cellH + fontSize);
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      if (asciiCanvas.parentNode) asciiCanvas.parentNode.removeChild(asciiCanvas);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden"
      style={{ opacity: 0.5 }}
    />
  );
}
