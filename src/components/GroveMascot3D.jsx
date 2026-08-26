import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Grove — 3D animated mascot (stylized hummingbird)
 * -------------------------------------------------
 * Self-contained React component built on raw Three.js (r128-compatible,
 * no external deps beyond `three`). Drop this into any React app.
 *
 * Usage:
 *   <GroveMascot />                    // interactive, buttons control state
 *   <GroveMascot state="flying" />     // controlled externally, hides buttons
 *
 * States: idle | flying | listening | thinking | celebrating | sleeping
 * Drag with mouse/touch to rotate the camera around the mascot.
 */

const COLORS = {
  darkTeal: 0x0f3d33,
  teal: 0x1f7a6c,
  green: 0x3daa71,
  mint: 0x8fd9c4,
  cream: 0xf5f3ec,
  dark: 0x3a3a3a,
  gold: 0xffd76b,
};

const STATES = ['idle', 'flying', 'listening', 'thinking', 'celebrating', 'sleeping'];

export default function GroveMascot({ state: controlledState, showControls = true }) {
  const mountRef = useRef(null);
  const stateRef = useRef(controlledState || 'idle');
  const [uiState, setUiState] = useState(controlledState || 'idle');

  useEffect(() => {
    const s = controlledState || uiState;
    stateRef.current = STATES.includes(s) ? s : 'idle';
  }, [controlledState, uiState]);

  useEffect(() => {
    const mount = mountRef.current;
    let width = mount.clientWidth || 400;
    let height = mount.clientHeight || 400;

    // ---------- Scene / camera / renderer ----------
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 6.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // ---------- Lights ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(COLORS.mint, 0.7);
    rim.position.set(-4, 2, -3);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-2, -1, 3);
    scene.add(fill);

    // ---------- Materials ----------
    const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.teal, metalness: 0.35, roughness: 0.3 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: COLORS.cream, metalness: 0.05, roughness: 0.55 });
    const darkMat = new THREE.MeshStandardMaterial({ color: COLORS.dark, roughness: 0.4 });
    const wingMat = new THREE.MeshStandardMaterial({
      color: COLORS.mint, metalness: 0.45, roughness: 0.2,
      side: THREE.DoubleSide, transparent: true, opacity: 0.9,
    });
    const tailMat = new THREE.MeshStandardMaterial({ color: COLORS.darkTeal, metalness: 0.4, roughness: 0.3, side: THREE.DoubleSide });
    const branchMat = new THREE.MeshStandardMaterial({ color: 0x6b4a35, roughness: 0.85 });
    const sparkleMat = new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.gold, emissiveIntensity: 0.9 });
    const dotMat = new THREE.MeshStandardMaterial({ color: COLORS.teal });
    const orbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, emissive: 0xffffff, emissiveIntensity: 0.2 });

    // ---------- Bird root ----------
    const bird = new THREE.Group();
    scene.add(bird);

    // Body (rounder, plumper)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), bodyMat);
    body.scale.set(0.9, 0.9, 1.1);
    bird.add(body);

    // Belly (cream underside)
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 20), bellyMat);
    belly.position.set(0, -0.05, 0.18);
    belly.scale.set(0.85, 0.9, 1.0);
    bird.add(belly);

    // Head group (so it can tilt independently)
    const head = new THREE.Group();
    head.position.set(0, 0.45, 0.45); // moved slightly down/back to sit on plump body
    bird.add(head);
    
    // Main head sphere
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), bodyMat));

    // Head Tuft (Feather cowlick)
    function tuftShape() {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.quadraticCurveTo(0.1, 0.15, 0.05, 0.3);
      s.quadraticCurveTo(0.0, 0.15, -0.05, 0.0);
      return s;
    }
    const tuft = new THREE.Mesh(new THREE.ExtrudeGeometry(tuftShape(), { depth: 0.02, bevelEnabled: false }), bodyMat);
    tuft.position.set(0, 0.4, -0.1);
    tuft.rotation.x = -0.3;
    head.add(tuft);

    // Beak (Softer, shorter, wider)
    const beak = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), darkMat);
    beak.scale.set(0.6, 0.4, 1.5); // Stretched into a soft oval bean
    beak.position.set(0, -0.05, 0.5);
    head.add(beak);

    // Eyes (Expressive Mascot Eyes)
    const eyeBase = new THREE.Group();
    
    // Sclera (White base)
    const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), scleraMat);
    sclera.scale.set(1, 1.2, 0.6); // slightly tall and flat
    eyeBase.add(sclera);
    
    // Pupil
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), darkMat);
    pupil.scale.set(1, 1.2, 0.6);
    pupil.position.set(0, 0, 0.05);
    eyeBase.add(pupil);
    
    // Catchlight (Sparkle)
    const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), catchlightMat);
    catchlight.position.set(0.03, 0.05, 0.1);
    eyeBase.add(catchlight);

    const eyeL = eyeBase.clone();
    eyeL.position.set(-0.25, 0.15, 0.35);
    eyeL.rotation.y = -0.3; // point slightly inward/forward
    head.add(eyeL);
    
    const eyeR = eyeBase.clone();
    eyeR.position.set(0.25, 0.15, 0.35);
    eyeR.rotation.y = 0.3;
    // Mirror the catchlight on the right eye
    eyeR.children[2].position.set(-0.03, 0.05, 0.1); 
    head.add(eyeR);

    // Wings — built from a curved silhouette, extruded thin
    function wingShape() {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.quadraticCurveTo(0.6, 0.32, 1.15, 0.05);
      s.quadraticCurveTo(0.9, -0.18, 0.5, -0.22);
      s.quadraticCurveTo(0.2, -0.16, 0, 0);
      return s;
    }
    const wingGeo = new THREE.ExtrudeGeometry(wingShape(), { depth: 0.02, bevelEnabled: false });

    const wingLPivot = new THREE.Group();
    wingLPivot.position.set(-0.25, 0.18, 0.05);
    bird.add(wingLPivot);
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.scale.set(-1, 1, 1);
    wingLPivot.add(wingL);

    const wingRPivot = new THREE.Group();
    wingRPivot.position.set(0.25, 0.18, 0.05);
    bird.add(wingRPivot);
    wingRPivot.add(new THREE.Mesh(wingGeo, wingMat));

    // Tail — fanned triangle
    function tailShape() {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.lineTo(-0.25, -0.7);
      s.lineTo(0, -0.58);
      s.lineTo(0.25, -0.7);
      s.lineTo(0, 0);
      return s;
    }
    const tail = new THREE.Mesh(new THREE.ExtrudeGeometry(tailShape(), { depth: 0.02, bevelEnabled: false }), tailMat);
    tail.position.set(0, -0.05, -0.65);
    tail.rotation.x = 0.15;
    bird.add(tail);

    // Feet (visible when perched)
    const footGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8);
    const footL = new THREE.Mesh(footGeo, darkMat);
    footL.position.set(-0.12, -0.62, 0.15);
    bird.add(footL);
    const footR = footL.clone();
    footR.position.x = 0.12;
    bird.add(footR);

    // Branch (sleeping state)
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 10), branchMat);
    branch.rotation.z = Math.PI / 2;
    branch.position.set(0, -0.75, 0.12);
    branch.visible = false;
    scene.add(branch);

    // Sparkles (celebrating)
    const sparkleGroup = new THREE.Group();
    const sparkles = [];
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), sparkleMat);
      sparkleGroup.add(sp);
      sparkles.push(sp);
    }
    sparkleGroup.visible = false;
    scene.add(sparkleGroup);

    // "Z" sprite (sleeping)
    function makeTextSprite(text, color) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 90px sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(text, 20, 90);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.45, 0.45, 0.45);
      return sprite;
    }
    const zSprite = makeTextSprite('Z', '#3daa71');
    zSprite.position.set(0.55, 1.0, 0.3);
    zSprite.visible = false;
    scene.add(zSprite);

    // Thinking dots
    const dotsGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), dotMat);
      d.position.set(0.4 + i * 0.15, 0.9, 0.3);
      dotsGroup.add(d);
    }
    dotsGroup.visible = false;
    scene.add(dotsGroup);

    // Listening orb
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), orbMat);
    orb.position.set(0.55, 0.5, 0.5);
    orb.visible = false;
    scene.add(orb);

    // ---------- Drag-to-rotate camera ----------
    let isDragging = false, prevX = 0, targetRotY = 0, currentRotY = 0;
    const onDown = (e) => { isDragging = true; prevX = e.touches ? e.touches[0].clientX : e.clientX; };
    const onMove = (e) => {
      if (!isDragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      targetRotY += (x - prevX) * 0.01;
      prevX = x;
    };
    const onUp = () => { isDragging = false; };
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // ---------- Animation loop ----------
    const clock = new THREE.Clock();
    let frameId;

    function animate() {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const s = stateRef.current;

      branch.visible = s === 'sleeping';
      zSprite.visible = s === 'sleeping';
      dotsGroup.visible = s === 'thinking';
      orb.visible = s === 'listening';
      sparkleGroup.visible = s === 'celebrating';
      footL.visible = s === 'sleeping';
      footR.visible = s === 'sleeping';

      let wingSpeed = 16, wingAmp = 0.45;
      let bob = 0, tiltX = 0, tiltZ = 0;
      let rotY = 0, posX = 0, posY = 0;

      switch (s) {
        case 'flying':
          wingSpeed = 20; wingAmp = 0.65;
          posX = Math.sin(t * 0.6) * 0.6;
          posY = Math.sin(t * 1.5) * 0.1;
          rotY = Math.sin(t * 0.6) * 0.3;
          break;
        case 'listening':
          wingSpeed = 8; wingAmp = 0.2;
          tiltZ = Math.sin(t * 1.5) * 0.08 + 0.15;
          bob = Math.sin(t * 2) * 0.03;
          orb.position.y = 0.5 + Math.sin(t * 3) * 0.05;
          break;
        case 'thinking':
          wingSpeed = 6; wingAmp = 0.15;
          tiltX = 0.2;
          tiltZ = Math.sin(t) * 0.05;
          dotsGroup.children.forEach((d, i) => { d.position.y = 0.9 + Math.sin(t * 3 + i) * 0.03; });
          break;
        case 'celebrating':
          wingSpeed = 22; wingAmp = 0.7;
          rotY = t * 2;
          posY = Math.abs(Math.sin(t * 4)) * 0.15;
          sparkles.forEach((sp, i) => {
            const a = t * 2 + i * ((Math.PI * 2) / sparkles.length);
            sp.position.set(Math.cos(a) * 0.9, 0.5 + Math.sin(a * 2) * 0.3, Math.sin(a) * 0.9);
          });
          break;
        case 'sleeping':
          wingSpeed = 1; wingAmp = 0.02;
          bob = Math.sin(t * 1.2) * 0.03;
          tiltX = 0.3;
          zSprite.position.y = 1.0 + Math.sin(t * 1.5) * 0.05;
          zSprite.material.opacity = 0.6 + Math.sin(t * 2) * 0.3;
          break;
        default: // idle
          wingSpeed = 16; wingAmp = 0.45;
          bob = Math.sin(t * 3) * 0.05;
      }

      const flap = Math.sin(t * wingSpeed) * wingAmp;
      wingLPivot.rotation.z = s === 'sleeping' ? 0.1 : flap;
      wingRPivot.rotation.z = s === 'sleeping' ? -0.1 : -flap;

      head.rotation.x = tiltX;
      head.rotation.z = tiltZ;

      const eyeScale = s === 'sleeping' ? 0.15 : 1;
      eyeL.scale.y = eyeScale;
      eyeR.scale.y = eyeScale;

      currentRotY += (targetRotY - currentRotY) * 0.1;
      bird.rotation.y = currentRotY + rotY;
      bird.position.set(posX, bob + posY, 0);

      renderer.render(scene, camera);
    }
    animate();

    // ---------- Resize handling ----------
    const onResize = () => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ---------- Cleanup ----------
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#F5F3EC', borderRadius: 16, padding: 16, boxSizing: 'border-box' }}>
      <div ref={mountRef} style={{ width: '100%', height: 420 }} />
      {showControls && !controlledState && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
          {STATES.map((s) => (
            <button
              key={s}
              onClick={() => setUiState(s)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px solid #1F7A6C',
                background: uiState === s ? '#1F7A6C' : 'transparent',
                color: uiState === s ? '#fff' : '#1F7A6C',
                fontSize: 13,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
