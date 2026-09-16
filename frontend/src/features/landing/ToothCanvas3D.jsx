import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Procedural Anatomical 3D Tooth constructed via Three.js.
 * Features:
 * - Anatomically-inspired multi-layer morphology (Crown, Cervical Neck, Bifurcated Roots, Internal Pulp Chamber)
 * - Translucent physical enamel material with high-refraction transmission & Fresnel edge sheen
 * - Internal glowing dentin layer and magenta/pink vascular pulp core
 * - Sweeping cyan laser scanning plane with technical readout grid
 * - Orbiting holographic digital telemetry particles
 * - Smooth float bobbing, gentle continuous rotation, and cursor parallax response
 * - Mode support: 'hero' (atmospheric) or 'interactive' (layer inspection with technical callouts)
 */
export default function ToothCanvas3D({
  mode = 'hero',
  activeLayer = 'all', // 'all' | 'enamel' | 'dentin' | 'pulp' | 'root'
  onLayerSelect = null,
  interactive = true,
  className = ''
}) {
  const mountRef = useRef(null);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const sceneRef = useRef(null);
  const materialsRef = useRef({});
  const rootGroupRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      if (typeof window === 'undefined' || !window.WebGLRenderingContext) {
        setWebGlSupported(false);
        return;
      }
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 550;

    // SCENE & CAMERA
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 7.2);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // LIGHTING SYSTEM
    // Key cyan light
    const keyLight = new THREE.PointLight(0x53f3ff, 5.5, 20);
    keyLight.position.set(4, 4, 5);
    scene.add(keyLight);

    // Rim magenta light from back
    const rimLight = new THREE.PointLight(0xff4db8, 4.0, 18);
    rimLight.position.set(-3.5, -2, -3);
    scene.add(rimLight);

    // Soft aqua top fill
    const topLight = new THREE.DirectionalLight(0xb4fcff, 1.8);
    topLight.position.set(0, 6, 2);
    scene.add(topLight);

    // Ambient medical navy glow
    const ambientLight = new THREE.AmbientLight(0x0a192f, 2.5);
    scene.add(ambientLight);

    // ROOT HIERARCHY
    const toothRootGroup = new THREE.Group();
    rootGroupRef.current = toothRootGroup;
    scene.add(toothRootGroup);

    // TOOTH MORPHOLOGY CREATION
    // 1. Crown Geometry (Lathe + Sculpting for realistic molar anatomy)
    function createCrownGeometry(scale = 1.0) {
      const crownPoints = [];
      crownPoints.push(new THREE.Vector2(0.01, 1.35 * scale));
      crownPoints.push(new THREE.Vector2(0.65 * scale, 1.45 * scale)); // Cusp peak
      crownPoints.push(new THREE.Vector2(1.15 * scale, 1.25 * scale)); // Outer cusp curve
      crownPoints.push(new THREE.Vector2(1.28 * scale, 0.65 * scale)); // Crown widest bulge
      crownPoints.push(new THREE.Vector2(1.15 * scale, 0.05 * scale)); // Cervical margin (neck)
      crownPoints.push(new THREE.Vector2(0.95 * scale, -0.35 * scale)); // Furcation base
      crownPoints.push(new THREE.Vector2(0.15 * scale, -0.45 * scale)); // Furcation groove

      const crownGeo = new THREE.LatheGeometry(crownPoints, 48);
      // Deform vertices to create realistic 4-cusp occlusal surface and natural molar curvature
      const pos = crownGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        const angle = Math.atan2(z, x);
        const radius = Math.sqrt(x * x + z * z);

        // Quad-cusp undulating wave on occlusal surface
        if (y > 0.4 * scale) {
          const cuspMod = Math.sin(angle * 2) * 0.18 * scale * (y / (1.45 * scale));
          const depression = Math.cos(angle * 4) * 0.08 * scale;
          y += cuspMod - (radius < 0.5 * scale ? 0.15 * scale : 0);
          pos.setY(i, y);
        }

        // Slight mesial-distal compression for authentic oval dental cross section
        const ovalFactor = 1.0 + 0.14 * Math.cos(angle * 2);
        pos.setX(i, x * ovalFactor);
        pos.setZ(i, z * (2.0 - ovalFactor));
      }
      crownGeo.computeVertexNormals();
      return crownGeo;
    }

    // 2. Root Geometry (Left & Right bifurcated roots)
    function createRootCurve(direction = 1, scale = 1.0) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(direction * 0.45 * scale, -0.35 * scale, 0),
        new THREE.Vector3(direction * 0.75 * scale, -1.05 * scale, 0.08 * scale),
        new THREE.Vector3(direction * 0.88 * scale, -1.75 * scale, -0.05 * scale),
        new THREE.Vector3(direction * 0.72 * scale, -2.45 * scale, 0.12 * scale),
        new THREE.Vector3(direction * 0.55 * scale, -2.95 * scale, 0.02 * scale) // Root apex
      ]);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.42 * scale, 18, false);

      // Taper the root towards the apex
      const pos = tubeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const taperRatio = Math.max(0.18, 1.0 - Math.abs((y + 0.35 * scale) / (2.6 * scale)) * 0.72);
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const curvePoint = curve.getPointAt(Math.min(1, Math.max(0, (-y - 0.35 * scale) / (2.6 * scale))));
        pos.setX(i, curvePoint.x + (x - curvePoint.x) * taperRatio);
        pos.setZ(i, curvePoint.z + (z - curvePoint.z) * taperRatio);
      }
      tubeGeo.computeVertexNormals();
      return tubeGeo;
    }

    // MATERIALS
    // A. Enamel Outer Shell (Ultra-premium translucent physical glass with cyan Fresnel)
    const enamelMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xb4fcff,
      emissive: 0x005577,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.05,
      transmission: 0.82,
      thickness: 1.4,
      ior: 1.58,
      transparent: true,
      opacity: 0.78,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      wireframe: false
    });

    // B. Internal Dentin Layer (Semi-opaque cyan structure)
    const dentinMaterial = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.15,
      transparent: true,
      opacity: 0.52
    });

    // C. Internal Pulp Core (Warm magenta-pink vascular tissue)
    const pulpMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6bd6,
      emissive: 0xff2d78,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92
    });

    // D. Wireframe Diagnostic Grid (holographic medical scanning feel)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x53f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.18
    });

    materialsRef.current = {
      enamel: enamelMaterial,
      dentin: dentinMaterial,
      pulp: pulpMaterial,
      wireframe: wireframeMaterial
    };

    // BUILD TOOTH MESHES
    // 1. Outer Enamel Crown & Roots
    const enamelGroup = new THREE.Group();
    enamelGroup.name = 'enamel-group';
    const crownEnamel = new THREE.Mesh(createCrownGeometry(1.0), enamelMaterial);
    const leftRootEnamel = new THREE.Mesh(createRootCurve(-1, 1.0), enamelMaterial);
    const rightRootEnamel = new THREE.Mesh(createRootCurve(1, 1.0), enamelMaterial);
    enamelGroup.add(crownEnamel, leftRootEnamel, rightRootEnamel);

    // Wireframe overlay for technical scan aesthetic
    const crownWire = new THREE.Mesh(createCrownGeometry(1.008), wireframeMaterial);
    const leftRootWire = new THREE.Mesh(createRootCurve(-1, 1.008), wireframeMaterial);
    const rightRootWire = new THREE.Mesh(createRootCurve(1, 1.008), wireframeMaterial);
    enamelGroup.add(crownWire, leftRootWire, rightRootWire);

    // 2. Dentin Intermediate Layer
    const dentinGroup = new THREE.Group();
    dentinGroup.name = 'dentin-group';
    const crownDentin = new THREE.Mesh(createCrownGeometry(0.82), dentinMaterial);
    crownDentin.position.y = -0.05;
    const leftRootDentin = new THREE.Mesh(createRootCurve(-1, 0.82), dentinMaterial);
    const rightRootDentin = new THREE.Mesh(createRootCurve(1, 0.82), dentinMaterial);
    dentinGroup.add(crownDentin, leftRootDentin, rightRootDentin);

    // 3. Pulp Chamber & Root Canals
    const pulpGroup = new THREE.Group();
    pulpGroup.name = 'pulp-group';
    const crownPulp = new THREE.Mesh(createCrownGeometry(0.55), pulpMaterial);
    crownPulp.position.y = -0.15;
    const leftRootPulp = new THREE.Mesh(createRootCurve(-1, 0.52), pulpMaterial);
    const rightRootPulp = new THREE.Mesh(createRootCurve(1, 0.52), pulpMaterial);
    pulpGroup.add(crownPulp, leftRootPulp, rightRootPulp);

    toothRootGroup.add(enamelGroup);
    toothRootGroup.add(dentinGroup);
    toothRootGroup.add(pulpGroup);

    // Position tooth at vertical visual balance
    toothRootGroup.position.y = 0.55;

    // 4. SCANNING LASER RING & SWEEP PLANE
    const scanRingGeo = new THREE.RingGeometry(1.35, 1.6, 64);
    const scanRingMat = new THREE.MeshBasicMaterial({
      color: 0x53f3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const scanRing = new THREE.Mesh(scanRingGeo, scanRingMat);
    scanRing.rotation.x = Math.PI / 2;
    scene.add(scanRing);

    // Inner scanning disk with laser beam
    const scanDiskGeo = new THREE.CircleGeometry(1.35, 48);
    const scanDiskMat = new THREE.MeshBasicMaterial({
      color: 0x53f3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending
    });
    const scanDisk = new THREE.Mesh(scanDiskGeo, scanDiskMat);
    scanDisk.rotation.x = Math.PI / 2;
    scanRing.add(scanDisk);

    // 5. ORBITING DIGITAL PARTICLES
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);
    const particleAngles = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.8 + Math.random() * 2.2;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 5.0;

      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;

      particleRadii[i] = radius;
      particleAngles[i] = angle;
      particleSpeeds[i] = 0.2 + Math.random() * 0.45;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // Particle sprite
    const particleMat = new THREE.PointsMaterial({
      color: 0x53f3ff,
      size: 0.055,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // MOUSE PARALLAX HANDLER
    function handleMouseMove(e) {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      mouseRef.current.targetX = ((clientX / rect.width) * 2 - 1) * 0.55;
      mouseRef.current.targetY = -((clientY / rect.height) * 2 - 1) * 0.45;
    }

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // ANIMATION CLOCK & LOOP
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Tooth floating & gentle rotation
      toothRootGroup.rotation.y = elapsedTime * 0.35 + mouseRef.current.x * 0.8;
      toothRootGroup.rotation.x = Math.sin(elapsedTime * 0.5) * 0.08 + mouseRef.current.y * 0.6;
      toothRootGroup.position.y = 0.55 + Math.sin(elapsedTime * 0.9) * 0.12;

      // Scanning plane elevation sweep
      const scanCycle = Math.sin(elapsedTime * 1.4);
      scanRing.position.y = 0.55 + scanCycle * 1.95;
      scanRingMat.opacity = 0.35 + Math.abs(scanCycle) * 0.45;

      // Pulse lighting
      keyLight.intensity = 5.0 + Math.sin(elapsedTime * 2.0) * 1.2;
      rimLight.intensity = 3.5 + Math.cos(elapsedTime * 1.8) * 1.0;
      pulpMaterial.emissiveIntensity = 1.1 + Math.sin(elapsedTime * 2.5) * 0.4;

      // Orbit particles
      const positions = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        particleAngles[i] += particleSpeeds[i] * 0.005;
        positions[i * 3] = Math.cos(particleAngles[i]) * particleRadii[i];
        positions[i * 3 + 2] = Math.sin(particleAngles[i]) * particleRadii[i];
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // RESIZE OBSERVER
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || 500;
      const newHeight = container.clientHeight || 550;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [interactive]);

  // LAYER VISIBILITY & OPACITY CONTROLLER (For Anatomy Section)
  useEffect(() => {
    const materials = materialsRef.current;
    if (!materials.enamel || !materials.dentin || !materials.pulp) return;

    if (activeLayer === 'all') {
      materials.enamel.opacity = 0.78;
      materials.enamel.wireframe = false;
      materials.dentin.opacity = 0.55;
      materials.pulp.opacity = 0.92;
    } else if (activeLayer === 'enamel') {
      materials.enamel.opacity = 0.95;
      materials.enamel.wireframe = false;
      materials.dentin.opacity = 0.15;
      materials.pulp.opacity = 0.1;
    } else if (activeLayer === 'dentin') {
      materials.enamel.opacity = 0.18;
      materials.enamel.wireframe = true;
      materials.dentin.opacity = 0.92;
      materials.pulp.opacity = 0.25;
    } else if (activeLayer === 'pulp') {
      materials.enamel.opacity = 0.12;
      materials.enamel.wireframe = true;
      materials.dentin.opacity = 0.15;
      materials.pulp.opacity = 1.0;
    } else if (activeLayer === 'root') {
      materials.enamel.opacity = 0.4;
      materials.dentin.opacity = 0.75;
      materials.pulp.opacity = 0.85;
    }
  }, [activeLayer]);

  if (!webGlSupported) {
    return <FuturisticToothFallback mode={mode} className={className} />;
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full flex items-center justify-center select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Interactive 3D Holographic Model of Human Tooth"
      role="img"
    >
      {/* Precision Scanning Technical HUD Overlays */}
      <div className="absolute top-4 left-4 pointer-events-none text-[10px] tracking-widest font-mono text-cyan-400/70 space-y-1 z-10">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>OPTICAL SCAN: ACTIVE</span>
        </div>
        <div className="text-white/40">FREQ: 94.2 GHz • SPECTRAL IOR 1.58</div>
        <div className="text-white/40">LAYER: {activeLayer.toUpperCase()}</div>
      </div>

      <div className="absolute bottom-4 right-4 pointer-events-none text-[10px] tracking-widest font-mono text-right text-pink-400/70 space-y-1 z-10">
        <div className="text-white/40">PRECISION: 0.02mm</div>
        <div className="text-cyan-400/80">3D ANATOMICAL RENDERING</div>
      </div>
    </div>
  );
}

/**
 * Fallback procedural SVG & Canvas for devices without WebGL
 */
export function FuturisticToothFallback({ mode = 'hero', className = '' }) {
  return (
    <div className={`relative w-full h-full min-h-[380px] flex items-center justify-center ${className}`}>
      <div className="relative w-72 h-80 flex items-center justify-center">
        {/* Glow Aura */}
        <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full animate-pulse" />
        <div className="absolute inset-8 bg-pink-500/15 blur-2xl rounded-full" />

        {/* Anatomical Procedural Vector Tooth */}
        <svg
          viewBox="0 0 200 240"
          className="w-64 h-72 drop-shadow-[0_0_25px_rgba(83,243,255,0.7)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="enamelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b4fcff" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#53f3ff" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="pulpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff6bd6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#be185d" stopOpacity="0.8" />
            </linearGradient>
            <radialGradient id="haloGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#53f3ff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#53f3ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Halo Glow */}
          <circle cx="100" cy="110" r="90" fill="url(#haloGlow)" />

          {/* Outer Enamel Shell */}
          <path
            d="M 50 40 C 35 60, 30 100, 55 125 C 65 135, 70 170, 65 210 C 62 230, 75 235, 80 220 C 88 190, 95 150, 100 135 C 105 150, 112 190, 120 220 C 125 235, 138 230, 135 210 C 130 170, 135 135, 145 125 C 170 100, 165 60, 150 40 C 135 22, 115 32, 100 24 C 85 32, 65 22, 50 40 Z"
            fill="url(#enamelGrad)"
            stroke="#53f3ff"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Dentin Layer */}
          <path
            d="M 62 55 C 50 70, 48 98, 66 118 C 74 126, 78 155, 75 188 C 78 198, 86 195, 88 185 C 94 162, 98 135, 100 128 C 102 135, 106 162, 112 185 C 114 195, 122 198, 125 188 C 122 155, 126 126, 134 118 C 152 98, 150 70, 138 55 C 126 42, 112 48, 100 44 C 88 48, 74 42, 62 55 Z"
            fill="#22d3ee"
            fillOpacity="0.4"
            stroke="#22d3ee"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* Vascular Pulp Core */}
          <path
            d="M 75 75 C 68 85, 68 102, 78 114 C 84 120, 86 145, 84 165 C 87 167, 90 162, 91 155 C 96 138, 98 122, 100 120 C 102 122, 104 138, 109 155 C 110 162, 113 167, 116 165 C 114 145, 116 120, 122 114 C 132 102, 132 85, 125 75 C 118 68, 108 72, 100 70 C 92 72, 82 68, 75 75 Z"
            fill="url(#pulpGrad)"
            stroke="#ff6bd6"
            strokeWidth="1.5"
          />

          {/* Sweeping Laser Line */}
          <line x1="20" y1="110" x2="180" y2="110" stroke="#53f3ff" strokeWidth="2" strokeDasharray="4 2" />
        </svg>

        {/* Scan Status */}
        <div className="absolute bottom-2 text-center text-xs font-mono text-cyan-300/80">
          PROCEDURAL HIGH-RES PREVIEW
        </div>
      </div>
    </div>
  );
}
