"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const ASCII_CHARS = " .,:;~=+*!?#%$@";

export default function AsciiBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 4;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // WebGL not available — degrade gracefully
      return;
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    // ASCII overlay
    const asciiCanvas = document.createElement("canvas");
    const asciiCtx = asciiCanvas.getContext("2d")!;
    asciiCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    container.appendChild(asciiCanvas);

    // Offscreen for reading pixels
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true })!;

    // Scene objects
    // Main: rotating torus knot
    const torusGeo = new THREE.TorusKnotGeometry(0.9, 0.32, 100, 24, 2, 3);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x003311,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    scene.add(torus);

    // Orbiting icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(0.3, 0);
    const icoMat = new THREE.MeshStandardMaterial({ color: 0x00cc66, roughness: 0.5, metalness: 0.5 });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    scene.add(ico);

    // Floating particles
    const particleCount = 150;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pVel = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      pPos[i] = (Math.random() - 0.5) * 7;
      pVel[i] = (Math.random() - 0.5) * 0.002;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x00ff88, size: 0.06, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Lighting
    const light1 = new THREE.DirectionalLight(0x00ff88, 2.5);
    light1.position.set(3, 4, 5);
    scene.add(light1);
    const light2 = new THREE.DirectionalLight(0x004422, 1.5);
    light2.position.set(-3, -2, 3);
    scene.add(light2);
    scene.add(new THREE.AmbientLight(0x001a0d, 0.8));

    const cellW = 7;
    const cellH = 12;
    const fontSize = 10;

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
    const startTime = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - startTime) * 0.001;

      if (prefersReduced) {
        // Static render for reduced motion
        torus.rotation.set(0.3, 0.5, 0);
      } else {
        torus.rotation.x = elapsed * 0.25;
        torus.rotation.y = elapsed * 0.18;
        torus.rotation.z = elapsed * 0.08;

        // Orbit icosahedron
        ico.position.x = Math.cos(elapsed * 0.6) * 2;
        ico.position.y = Math.sin(elapsed * 0.4) * 1;
        ico.position.z = Math.sin(elapsed * 0.6) * 0.8;
        ico.rotation.x = elapsed * 0.8;
        ico.rotation.y = elapsed * 0.5;

        // Drift particles
        const posAttr = particles.geometry.attributes.position;
        for (let i = 0; i < particleCount; i++) {
          posAttr.array[i * 3] += pVel[i * 3];
          posAttr.array[i * 3 + 1] += pVel[i * 3 + 1];
          posAttr.array[i * 3 + 2] += pVel[i * 3 + 2];
          // Wrap around
          for (let j = 0; j < 3; j++) {
            if (Math.abs(posAttr.array[i * 3 + j]) > 3.5) {
              posAttr.array[i * 3 + j] *= -0.9;
            }
          }
        }
        (posAttr as THREE.BufferAttribute).needsUpdate = true;

        particles.rotation.y = elapsed * 0.03;
      }

      // Render 3D
      renderer.render(scene, camera);

      // Convert to ASCII
      const cols = offscreen.width;
      const rows = offscreen.height;
      if (cols <= 0 || rows <= 0) { animId = requestAnimationFrame(animate); return; }

      offCtx.drawImage(renderer.domElement, 0, 0, cols, rows);
      const imageData = offCtx.getImageData(0, 0, cols, rows);
      const px = imageData.data;

      asciiCtx.fillStyle = "#0a0a0a";
      asciiCtx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height);
      asciiCtx.font = `${fontSize}px monospace`;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

          if (brightness < 0.015) continue;

          const charIdx = Math.floor(brightness * (ASCII_CHARS.length - 1));
          const green = Math.floor(30 + brightness * 225);
          const alpha = 0.2 + brightness * 0.8;
          asciiCtx.fillStyle = `rgba(0,${green},${Math.floor(green * 0.5)},${alpha})`;
          asciiCtx.fillText(ASCII_CHARS[charIdx], x * cellW, y * cellH + fontSize);
        }
      }

      if (!ready) setReady(true);
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      icoGeo.dispose();
      icoMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      if (asciiCanvas.parentNode) asciiCanvas.parentNode.removeChild(asciiCanvas);
    };
  }, [ready]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-1000"
      style={{ opacity: ready ? 0.45 : 0 }}
    />
  );
}
