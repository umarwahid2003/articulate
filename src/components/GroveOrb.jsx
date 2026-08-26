import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Grove Orb — modern abstract 3D mascot, expressive edition
 * -----------------------------------------------------------
 * A soft, morphing blob (Siri-orb / Notion-AI-orb aesthetic) with a real
 * expression system layered on top: eyebrows, a smirking mouth, blush,
 * eye gleam, natural blinking, and occasional mischievous winks — built
 * on raw Three.js only, no external deps beyond `three`.
 *
 * Usage:
 *   <GroveOrb />                        // interactive demo w/ buttons
 *   <GroveOrb state="thinking" showControls={false} />   // app-controlled
 *
 * States: idle | active | listening | thinking | celebrating | sleeping
 * Drag to rotate the camera.
 */

// ---------- Compact 3D Simplex noise (classic Perlin-style, public domain algorithm) ----------
class SimplexNoise {
  constructor(seed = 42) {
    this.p = new Uint8Array(256);
    let n = seed;
    for (let i = 0; i < 256; i++) this.p[i] = i;
    for (let i = 255; i > 0; i--) {
      n = (n * 16807) % 2147483647;
      const j = n % (i + 1);
      [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
  }
  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  noise3D(x, y, z) {
    const P = this.perm;
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = x * x * x * (x * (x * 6 - 15) + 10);
    const v = y * y * y * (y * (y * 6 - 15) + 10);
    const w = z * z * z * (z * (z * 6 - 15) + 10);
    const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z;
    const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    const lerp = (a, b, t) => a + t * (b - a);
    return lerp(
      lerp(
        lerp(this.grad(P[AA], x, y, z), this.grad(P[BA], x - 1, y, z), u),
        lerp(this.grad(P[AB], x, y - 1, z), this.grad(P[BB], x - 1, y - 1, z), u), v),
      lerp(
        lerp(this.grad(P[AA + 1], x, y, z - 1), this.grad(P[BA + 1], x - 1, y, z - 1), u),
        lerp(this.grad(P[AB + 1], x, y - 1, z - 1), this.grad(P[BB + 1], x - 1, y - 1, z - 1), u), v),
      w
    );
  }
}

const PALETTE = {
  teal: new THREE.Color(0x1f7a6c),
  mint: new THREE.Color(0x8fd9c4),
  lavender: new THREE.Color(0xa9a8d6),
  darkTeal: new THREE.Color(0x0f3d33),
  gold: new THREE.Color(0xffd76b),
  blush: new THREE.Color(0xff9f8f),
};

const STATES = ['idle', 'active', 'listening', 'thinking', 'celebrating', 'sleeping'];

// Small helper: exponential smoothing toward a target value
function approach(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export default function GroveOrb({ state: controlledState, showControls = true }) {
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
    camera.position.set(0, 0.3, 5.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // ---------- Lights ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 4, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(PALETTE.mint.getHex(), 0.8);
    rim.position.set(-4, 1, -3);
    scene.add(rim);
    const fillLight = new THREE.PointLight(PALETTE.lavender.getHex(), 0.5, 10);
    fillLight.position.set(0, -2, 2);
    scene.add(fillLight);

    // ---------- Glow sprite behind the orb ----------
    // Glow removed per user request

    // ---------- Orb root ----------
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // Geometry: icosahedron subdivided, vertices displaced by noise each frame
    const geo = new THREE.IcosahedronGeometry(1.2, 4);
    const posAttr = geo.attributes.position;
    const vertexCount = posAttr.count;
    const basePositions = new Float32Array(posAttr.array);
    const normals = [];
    for (let i = 0; i < vertexCount; i++) {
      normals.push(new THREE.Vector3(basePositions[i * 3], basePositions[i * 3 + 1], basePositions[i * 3 + 2]).normalize());
    }

    const colors = new Float32Array(vertexCount * 3);
    const cLow = PALETTE.teal, cMid = PALETTE.mint, cHigh = PALETTE.lavender;
    for (let i = 0; i < vertexCount; i++) {
      const y = normals[i].y;
      const t = (y + 1) / 2;
      const c = new THREE.Color();
      if (t < 0.5) c.lerpColors(cLow, cMid, t * 2);
      else c.lerpColors(cMid, cHigh, (t - 0.5) * 2);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const orbMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.25,
      metalness: 0.1,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
      transmission: 0.05,
      sheen: 0.4,
      sheenColor: new THREE.Color(0xffffff),
    });
    const orbMesh = new THREE.Mesh(geo, orbMat);
    orbGroup.add(orbMesh);

    // ================= FACE ================= //
    const faceGroup = new THREE.Group();
    faceGroup.position.set(0, 0.1, 1.05);
    orbGroup.add(faceGroup);

    const darkMat = new THREE.MeshStandardMaterial({ color: PALETTE.darkTeal.getHex(), roughness: 0.5 });
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Eyes (each is a group so a "gleam" highlight can ride along)
    function makeEye(x) {
      const g = new THREE.Group();
      g.position.set(x, 0, 0.15);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), darkMat);
      g.add(ball);
      const gleam = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), highlightMat);
      gleam.position.set(-0.03, 0.035, 0.075);
      g.add(gleam);
      return g;
    }
    const eyeL = makeEye(-0.28);
    const eyeR = makeEye(0.28);
    faceGroup.add(eyeL, eyeR);

    // Eyebrows (thin flattened boxes, pivoted at inner end for tilt)
    function makeBrow(x, side) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.19, 0.13);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.03), darkMat);
      bar.position.x = 0.11 * side;
      bar.geometry.translate(0.11 * side, 0, 0); // pivot at inner edge
      pivot.add(bar);
      return pivot;
    }
    const browL = makeBrow(-0.28, 1);
    const browR = makeBrow(0.28, -1);
    faceGroup.add(browL, browR);

    // Mouth — a partial torus arc; flipping/tilting it produces smile <-> smirk
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.032, 10, 24, Math.PI * 0.85),
      darkMat
    );
    mouth.position.set(0, -0.22, 0.14);
    mouth.rotation.z = Math.PI; // flip so the open arc reads as a smile (∪)
    faceGroup.add(mouth);

    // Blush
    function makeBlush(x) {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(0.09, 20),
        new THREE.MeshBasicMaterial({ color: PALETTE.blush.getHex(), transparent: true, opacity: 0 })
      );
      m.position.set(x, -0.08, 0.16);
      return m;
    }
    const blushL = makeBlush(-0.48);
    const blushR = makeBlush(0.48);
    faceGroup.add(blushL, blushR);

    // ---------- Sparkles (celebrating) ----------
    const sparkleGroup = new THREE.Group();
    const sparkles = [];
    const sparkleMat = new THREE.MeshStandardMaterial({ color: PALETTE.gold.getHex(), emissive: PALETTE.gold.getHex(), emissiveIntensity: 1 });
    for (let i = 0; i < 10; i++) {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), sparkleMat);
      sparkleGroup.add(sp);
      sparkles.push(sp);
    }
    sparkleGroup.visible = false;
    scene.add(sparkleGroup);

    // ---------- Thinking dots ----------
    const dotsGroup = new THREE.Group();
    const dotMat = new THREE.MeshStandardMaterial({ color: PALETTE.teal.getHex() });
    for (let i = 0; i < 3; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), dotMat);
      d.position.set(0.5 + i * 0.22, 1.1, 0.2);
      dotsGroup.add(d);
    }
    dotsGroup.visible = false;
    scene.add(dotsGroup);

    // ---------- Ripple rings (listening) ----------
    const rippleGroup = new THREE.Group();
    const ripples = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.3, 1.36, 48),
        new THREE.MeshBasicMaterial({ color: PALETTE.mint.getHex(), transparent: true, opacity: 0, side: THREE.DoubleSide })
      );
      rippleGroup.add(ring);
      ripples.push(ring);
    }
    scene.add(rippleGroup);

    // ---------- "Z" sprite (sleeping) ----------
    function makeTextSprite(text, color) {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 90px sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(text, 24, 90);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sprite.scale.set(0.5, 0.5, 0.5);
      return sprite;
    }
    const zSprite = makeTextSprite('Z', '#1f7a6c');
    zSprite.position.set(0.9, 1.0, 0.3);
    zSprite.visible = false;
    scene.add(zSprite);

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

    // ---------- Expression state machine (blink + mischievous winks) ----------
    let blinkTimer = 1.5 + Math.random() * 2;   // countdown to next blink
    let blinkPhase = 0;                          // 0 = open, 1 = fully shut, animated
    let winkTimer = 4 + Math.random() * 4;        // countdown to next mischief burst
    let winkActive = 0;                           // 0..1 progress of a wink+smirk burst
    let winkEye = 'L';

    // ---------- Animation ----------
    const noise = new SimplexNoise(7);
    const clock = new THREE.Clock();
    let lastT = 0;
    let frameId;
    const tmp = new THREE.Vector3();

    // smoothed expression values
    const eyeSquint = { L: 0, R: 0 }; // 0 = fully open, 1 = fully closed
    let browTiltL = 0, browTiltR = 0, browRaiseL = 0, browRaiseR = 0;
    let mouthTilt = 0, mouthScaleTarget = 1, mouthScale = 1;
    let blushOpacity = 0;
    let gleamOffsetX = 0;

    function animate() {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const dt = Math.min(t - lastT, 0.05);
      lastT = t;
      const s = stateRef.current;

      sparkleGroup.visible = s === 'celebrating';
      dotsGroup.visible = s === 'thinking';
      zSprite.visible = s === 'sleeping';

      // per-state tuning + base expression targets
      let noiseFreq = 1.1, noiseAmp = 0.06, noiseSpeed = 0.3;
      let scaleTarget = new THREE.Vector3(1, 1, 1);
      let posX = 0, posY = 0, rotY = 0, rotZ = 0;
      let colorShift = 0;
      let eyeOffsetY = 0, eyeOffsetX = 0;
      let glowOpacity = 0.9;

      // expression targets (overwritten per-state below)
      let tBrowRaiseL = 0.02, tBrowRaiseR = 0.02, tBrowTiltL = -0.12, tBrowTiltR = 0.12;
      let tMouthTilt = 0.08, tMouthScale = 1;
      let tBlush = 0;
      let allowMischief = false;
      const sleepy = s === 'sleeping';

      switch (s) {
        case 'active':
          noiseFreq = 1.4; noiseAmp = 0.09; noiseSpeed = 0.6;
          posX = Math.sin(t * 1.1) * 0.5;
          posY = Math.abs(Math.sin(t * 2.2)) * 0.15;
          scaleTarget.set(1 + Math.sin(t * 4) * 0.04, 1 - Math.sin(t * 4) * 0.04, 1);
          rotY = Math.sin(t * 0.5) * 0.4;
          tBrowRaiseL = tBrowRaiseR = 0.06;
          tMouthScale = 1.25; tMouthTilt = 0.05;
          allowMischief = true;
          break;
        case 'listening':
          noiseFreq = 1.3; noiseAmp = 0.1; noiseSpeed = 0.9;
          scaleTarget.set(0.97, 1.06, 0.97);
          eyeOffsetY = 0.02 * Math.sin(t * 2);
          tBrowRaiseL = tBrowRaiseR = 0.08; // curious, both raised
          tMouthScale = 0.85; tMouthTilt = 0;
          ripples.forEach((ring, i) => {
            const cycle = (t * 0.6 + i / ripples.length) % 1;
            ring.scale.setScalar(0.6 + cycle * 0.9);
            ring.material.opacity = (1 - cycle) * 0.35;
          });
          break;
        case 'thinking':
          noiseFreq = 1.6; noiseAmp = 0.07; noiseSpeed = 1.2;
          rotY = t * 0.4;
          eyeOffsetY = 0.05;
          eyeOffsetX = Math.sin(t * 1.5) * 0.05;
          tBrowRaiseL = 0.1; tBrowRaiseR = -0.01; // one eyebrow cocked = pondering/sly
          tBrowTiltL = -0.25; tBrowTiltR = 0.05;
          tMouthTilt = 0.3; tMouthScale = 0.8; // smirk, pulled to one side
          dotsGroup.children.forEach((d, i) => { d.position.y = 1.1 + Math.sin(t * 3 + i) * 0.05; });
          break;
        case 'celebrating':
          noiseFreq = 1.2; noiseAmp = 0.12; noiseSpeed = 1.5;
          posY = Math.abs(Math.sin(t * 5)) * 0.35;
          scaleTarget.set(1 - Math.abs(Math.sin(t * 5)) * 0.15, 1 + Math.abs(Math.sin(t * 5)) * 0.2, 1 - Math.abs(Math.sin(t * 5)) * 0.15);
          rotY = t * 1.5;
          colorShift = 0.5 + Math.sin(t * 3) * 0.3;
          glowOpacity = 1.2;
          tBrowRaiseL = tBrowRaiseR = 0.12;
          tMouthScale = 1.5; tMouthTilt = 0.1;
          tBlush = 1;
          sparkles.forEach((sp, i) => {
            const a = t * 2.5 + i * ((Math.PI * 2) / sparkles.length);
            const r = 1.8 + Math.sin(t * 3 + i) * 0.2;
            sp.position.set(Math.cos(a) * r, 0.4 + Math.sin(a * 2) * 0.4, Math.sin(a) * r);
          });
          break;
        case 'sleeping':
          noiseFreq = 0.8; noiseAmp = 0.02; noiseSpeed = 0.1;
          scaleTarget.set(1.05, 0.85, 1.05);
          rotZ = 0.05;
          tBrowRaiseL = tBrowRaiseR = -0.05; // relaxed
          tMouthScale = 0.7; tMouthTilt = 0; // small content "o"
          zSprite.position.y = 1.0 + Math.sin(t * 1.5) * 0.06;
          zSprite.material.opacity = 0.5 + Math.sin(t * 2) * 0.3;
          glowOpacity = 0.5;
          break;
        default: // idle
          noiseFreq = 1.0; noiseAmp = 0.055; noiseSpeed = 0.35;
          scaleTarget.set(1 + Math.sin(t * 1.3) * 0.025, 1 + Math.sin(t * 1.3 + 1) * 0.025, 1 + Math.sin(t * 1.3) * 0.025);
          allowMischief = true;
      }

      // ---------- vertex displacement via noise ----------
      for (let i = 0; i < vertexCount; i++) {
        const n = normals[i];
        const nVal = noise.noise3D(
          n.x * noiseFreq + t * noiseSpeed,
          n.y * noiseFreq + t * noiseSpeed,
          n.z * noiseFreq + t * noiseSpeed
        );
        const disp = 1 + nVal * noiseAmp;
        tmp.set(basePositions[i * 3], basePositions[i * 3 + 1], basePositions[i * 3 + 2]).multiplyScalar(disp);
        posAttr.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();

      if (colorShift > 0) {
        orbMat.emissive = PALETTE.gold;
        orbMat.emissiveIntensity = colorShift * 0.4;
      } else {
        orbMat.emissiveIntensity = 0;
      }
      // glowSprite removed

      // ---------- Blinking ----------
      if (!sleepy) {
        blinkTimer -= dt;
        if (blinkTimer <= 0 && blinkPhase === 0) blinkPhase = 0.001; // trigger
        if (blinkPhase > 0) {
          blinkPhase += dt * 9; // ~0.22s total blink
          if (blinkPhase >= 2) { blinkPhase = 0; blinkTimer = 2 + Math.random() * 3.5; }
        }
      }
      const blinkAmount = blinkPhase > 0 ? Math.sin(Math.min(blinkPhase, 2) * (Math.PI / 2)) : 0;

      // ---------- Mischievous wink bursts (idle / active only) ----------
      if (allowMischief) {
        winkTimer -= dt;
        if (winkTimer <= 0 && winkActive === 0) {
          winkActive = 0.0001;
          winkEye = Math.random() < 0.5 ? 'L' : 'R';
        }
        if (winkActive > 0) {
          winkActive += dt * 1.6; // ~0.6s burst
          if (winkActive >= 1) { winkActive = 0; winkTimer = 5 + Math.random() * 5; }
        }
      } else {
        winkActive = 0;
      }
      const winkCurve = winkActive > 0 ? Math.sin(Math.min(winkActive, 1) * Math.PI) : 0;

      // ---------- Combine expression targets ----------
      eyeSquint.L = sleepy ? 0.95 : Math.max(blinkAmount, winkActive > 0 && winkEye === 'L' ? winkCurve : 0);
      eyeSquint.R = sleepy ? 0.95 : Math.max(blinkAmount, winkActive > 0 && winkEye === 'R' ? winkCurve : 0);

      // a wink also nudges the brow and mouth into a sly little smirk
      const mischiefBoost = winkCurve;
      browTiltL = approach(browTiltL, tBrowTiltL - (winkEye === 'L' ? mischiefBoost * 0.3 : 0), 6, dt);
      browTiltR = approach(browTiltR, tBrowTiltR + (winkEye === 'R' ? mischiefBoost * 0.3 : 0), 6, dt);
      browRaiseL = approach(browRaiseL, tBrowRaiseL + (winkEye === 'L' ? mischiefBoost * 0.08 : 0), 6, dt);
      browRaiseR = approach(browRaiseR, tBrowRaiseR + (winkEye === 'R' ? mischiefBoost * 0.08 : 0), 6, dt);
      mouthTilt = approach(mouthTilt, tMouthTilt + mischiefBoost * (winkEye === 'L' ? -0.25 : 0.25), 6, dt);
      mouthScaleTarget = tMouthScale + mischiefBoost * 0.2;
      mouthScale = approach(mouthScale, mouthScaleTarget, 6, dt);
      blushOpacity = approach(blushOpacity, Math.max(tBlush, mischiefBoost * 0.6), 4, dt);
      gleamOffsetX = approach(gleamOffsetX, mischiefBoost * 0.03, 6, dt);

      // ---------- Apply to meshes ----------
      eyeL.scale.y = 1 - eyeSquint.L * 0.85;
      eyeR.scale.y = 1 - eyeSquint.R * 0.85;
      eyeL.children[1].position.x = -0.03 + gleamOffsetX * (winkEye === 'L' ? 1 : 0);
      eyeR.children[1].position.x = -0.03 + gleamOffsetX * (winkEye === 'R' ? 1 : 0);

      browL.rotation.z = browTiltL;
      browR.rotation.z = browTiltR;
      browL.position.y = 0.19 + browRaiseL;
      browR.position.y = 0.19 + browRaiseR;
      browL.visible = !sleepy;
      browR.visible = !sleepy;

      mouth.rotation.y = 0; // keep facing camera
      mouth.rotation.z = Math.PI + mouthTilt;
      mouth.scale.set(mouthScale, mouthScale, 1);

      blushL.material.opacity = blushOpacity;
      blushR.material.opacity = blushOpacity;

      faceGroup.position.y = 0.1 + eyeOffsetY;
      faceGroup.position.x = eyeOffsetX;

      orbGroup.scale.lerp(scaleTarget, 0.15);

      currentRotY += (targetRotY - currentRotY) * 0.1;
      orbGroup.rotation.y = currentRotY + rotY;
      orbGroup.rotation.z = rotZ;
      orbGroup.position.set(posX, posY, 0);
      rippleGroup.position.set(posX, posY, 0);
      rippleGroup.visible = s === 'listening';

      renderer.render(scene, camera);
    }
    animate();

    // ---------- Resize ----------
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'transparent', boxSizing: 'border-box' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '100%' }} />
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
