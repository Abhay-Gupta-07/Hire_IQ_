import React, { useRef, useEffect } from "react";
import * as THREE from "three";

interface ThreeParticleBackgroundProps {
  theme?: "dark" | "light";
}

export default function ThreeParticleBackground({ theme = "dark" }: ThreeParticleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLight = theme === "light";

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // SCENE & FOG
    const scene = new THREE.Scene();
    
    // Configure scene background and Fog matching the modes
    if (isLight) {
      scene.background = new THREE.Color(0xf8f8f6);
      scene.fog = new THREE.FogExp2(0xf8f8f6, 0.012);
    } else {
      scene.background = new THREE.Color(0x0c0c0c);
      scene.fog = new THREE.FogExp2(0x0c0c0c, 0.015);
    }

    // CAMERA
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 120;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // PARTICLES CREATION
    const particleCount = isLight ? 900 : 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Color palettes
    const paletteLight = [
      new THREE.Color(0x1a1a18),
      new THREE.Color(0x3d3d3a),
      new THREE.Color(0x606059),
      new THREE.Color(0x888780),
      new THREE.Color(0x2c2c2a),
    ];

    const paletteDark = [
      new THREE.Color(0x3D81E3), // Sky/Cobalt blue
      new THREE.Color(0xA4F4FD), // Cyber Cyan
      new THREE.Color(0xffffff), // Clean white star-field
      new THREE.Color(0x6366f1), // Soft Indigo accent
    ];

    const currentPalette = isLight ? paletteLight : paletteDark;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 320;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 320;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 320;

      const clr = currentPalette[Math.floor(Math.random() * currentPalette.length)];
      colors[i * 3]     = clr.r;
      colors[i * 3 + 1] = clr.g;
      colors[i * 3 + 2] = clr.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // MATERIAL Configuration
    const mat = new THREE.PointsMaterial({
      size: isLight ? 2.8 : 1.8,
      vertexColors: true,
      transparent: true,
      opacity: isLight ? 0.85 : 0.75,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Custom textured sprite for square/sharp particles (as uploaded for light mode)
    let tex: THREE.Texture | null = null;
    if (isLight) {
      const spriteCanvas = document.createElement("canvas");
      spriteCanvas.width = 16;
      spriteCanvas.height = 16;
      const ctx = spriteCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = "#1a1a18";
        ctx.fillRect(2, 2, 12, 12);
      }
      tex = new THREE.CanvasTexture(spriteCanvas);
      mat.map = tex;
      mat.alphaTest = 0.05;
    }

    const pSystem = new THREE.Points(geometry, mat);
    scene.add(pSystem);

    // RESIZE OBSERVER
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    });
    resizeObserver.observe(container);

    // MOUSE PARALLAX EFFECT
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.04;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.04;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // ANIMATION LOOP
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      pSystem.rotation.y += 0.0012;
      pSystem.rotation.x += 0.0006;

      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    // CLEANUP
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      
      geometry.dispose();
      mat.dispose();
      if (tex) tex.dispose();
      renderer.dispose();
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme, isLight]);

  return (
    <div
      id="three_js_background"
      ref={containerRef}
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-500 ${
        isLight ? "opacity-100 bg-[#f8f8f6]" : "opacity-40 bg-[#07090e]"
      }`}
      style={isLight ? {} : {
        maskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 100%)",
      }}
    />
  );
}
