import * as THREE from 'three';
import type { SceneMaterialLibrary } from './materials';
import {
  WATER_LEVEL,
  distanceToStream,
  getBiomeWaterSpec,
  groundHeightAt,
  pondSignedFactor,
} from './terrainMath';
import type { PalaceStyle } from './types';

export interface EnvironmentBuildResult {
  group: THREE.Group;
  skyUniforms: {
    uSunDir: { value: THREE.Vector3 };
    uNightMix: { value: number };
    uDayHorizon: { value: THREE.Color };
    uDayMid: { value: THREE.Color };
    uDayZenith: { value: THREE.Color };
  };
  lanternLights: THREE.PointLight[];
  dispose: () => void;
}

const BIOME_SKY_COLORS: Record<
  PalaceStyle,
  { horizon: number; mid: number; zenith: number }
> = {
  japanese: { horizon: 0xf29b68, mid: 0x7d4f70, zenith: 0x1f2447 },
  russian: { horizon: 0xc9d7e8, mid: 0x6c86ad, zenith: 0x1f3052 },
  victorian: { horizon: 0xdf9f6c, mid: 0x67607e, zenith: 0x202a47 },
  mughal: { horizon: 0xee9762, mid: 0x895065, zenith: 0x232448 },
  persian: { horizon: 0xf5b166, mid: 0xb16a54, zenith: 0x283056 },
};

/**
 * Custom sky dome shader transitioning smoothly between biome golden hour and starry moonlit night
 */
function createBiomeSkyDome(
  style: PalaceStyle,
  sunDir: THREE.Vector3,
): {
  mesh: THREE.Mesh;
  uniforms: EnvironmentBuildResult['skyUniforms'];
  dispose: () => void;
} {
  const palette = BIOME_SKY_COLORS[style];
  const uniforms: EnvironmentBuildResult['skyUniforms'] = {
    uSunDir: { value: sunDir.clone().normalize() },
    uNightMix: { value: 0.0 },
    uDayHorizon: { value: new THREE.Color(palette.horizon) },
    uDayMid: { value: new THREE.Color(palette.mid) },
    uDayZenith: { value: new THREE.Color(palette.zenith) },
  };
  const geo = new THREE.SphereGeometry(240, 48, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      uniform vec3 uSunDir;
      uniform float uNightMix;
      uniform vec3 uDayHorizon;
      uniform vec3 uDayMid;
      uniform vec3 uDayZenith;

      float starHash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y, -0.15, 1.0);

        vec3 sunLow = uDayHorizon * 0.78;
        vec3 daySky = mix(uDayHorizon, uDayMid, smoothstep(0.0, 0.24, h));
        daySky = mix(daySky, uDayZenith, smoothstep(0.20, 0.72, h));
        if (h < 0.0) {
          daySky = mix(uDayHorizon, sunLow, smoothstep(0.0, -0.15, h));
        }

        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        daySky += vec3(1.0, 0.62, 0.32) * pow(sunDot, 8.0) * 0.32;
        daySky += vec3(1.0, 0.88, 0.68) * pow(sunDot, 160.0) * 0.72;

        float band = sin(dir.x * 11.0 + dir.z * 6.0) * cos(dir.y * 28.0);
        float cloudMask = smoothstep(0.04, 0.28, h) * (1.0 - smoothstep(0.28, 0.52, h));
        daySky += uDayHorizon * max(0.0, band) * cloudMask * 0.1;

        vec3 nightZenith  = vec3(0.025, 0.038, 0.095);
        vec3 nightMid     = vec3(0.055, 0.088, 0.195);
        vec3 nightHorizon = vec3(0.105, 0.155, 0.275);
        vec3 nightLow     = vec3(0.06, 0.09, 0.16);

        vec3 nightSky = mix(nightHorizon, nightMid, smoothstep(0.0, 0.28, h));
        nightSky = mix(nightSky, nightZenith, smoothstep(0.22, 0.76, h));
        if (h < 0.0) {
          nightSky = mix(nightHorizon, nightLow, smoothstep(0.0, -0.15, h));
        }

        vec3 moonDir = normalize(vec3(-0.32, 0.38, -0.86));
        float moonDot = max(dot(dir, moonDir), 0.0);
        nightSky += vec3(0.32, 0.46, 0.74) * pow(moonDot, 14.0) * 0.32;
        nightSky += vec3(0.68, 0.78, 0.96) * pow(moonDot, 140.0) * 0.35;
        float moonDisc = smoothstep(0.9985, 0.9991, moonDot);
        nightSky = mix(nightSky, vec3(0.98, 0.97, 0.92), moonDisc);

        vec3 starCell = floor(dir * 260.0);
        float sVal = starHash(starCell);
        float starVis = smoothstep(0.9945, 0.9992, sVal) * smoothstep(0.07, 0.28, h);
        nightSky += vec3(0.86, 0.91, 1.0) * starVis * (0.55 + 0.45 * fract(sVal * 37.0));

        vec3 sky = mix(daySky, nightSky, clamp(uNightMix, 0.0, 1.0));
        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  return {
    mesh,
    uniforms,
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}

/**
 * Biome-specific distant mountains, snowy peaks, green highlands, or desert sandstone mesas
 */
function createMountainBackdrop(
  style: PalaceStyle,
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const mGroup = new THREE.Group();

  const palette =
    style === 'russian'
      ? { base: 0x5b6a7e, mid: 0x9aaec4, snow: 0xf4f8fd }
      : style === 'victorian'
        ? { base: 0x263a2c, mid: 0x3f5b46, snow: 0x627c68 }
        : style === 'mughal'
          ? { base: 0x523c36, mid: 0x8f6655, snow: 0xf7e4d4 }
          : style === 'persian'
            ? { base: 0x8f5938, mid: 0xc98c53, snow: 0xe6be82 }
            : { base: 0x2e2b3d, mid: 0x5b4a59, snow: 0xffe9dc };

  const buildPeak = (
    cx: number,
    cz: number,
    radius: number,
    height: number,
    snowLine: number,
    ridgeFreq: number,
    mesaFlatTop = false,
  ) => {
    const radialSegs = 72;
    const heightSegs = 36;
    const geo = trackGeo(
      new THREE.ConeGeometry(radius, height, radialSegs, heightSegs, true),
    );
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const col = new THREE.Color();

    const baseCol = new THREE.Color(palette.base);
    const midCol = new THREE.Color(palette.mid);
    const snowCol = new THREE.Color(palette.snow);

    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i);
      let vy = pos.getY(i) + height / 2;
      let vz = pos.getZ(i);

      const normY = Math.max(0, Math.min(1, vy / height));
      const ang = Math.atan2(vz, vx);

      const flare = mesaFlatTop
        ? Math.pow(1 - normY * 0.72, 1.05) * radius
        : Math.pow(1 - normY, 1.38) * radius;
      const gully =
        (Math.sin(ang * ridgeFreq + normY * 3.0) * 0.06 +
          Math.cos(ang * (ridgeFreq * 1.7) - normY * 2.0) * 0.035) *
        (1 - normY * 0.65);

      const r = flare * (1 + gully);
      vx = Math.cos(ang) * r;
      vz = Math.sin(ang) * r;

      if (mesaFlatTop && normY > 0.78) {
        vy = height * 0.78 + (normY - 0.78) * height * 0.08;
      } else if (normY > 0.94) {
        vy = height * 0.94 + (normY - 0.94) * height * 0.15;
      }

      pos.setXYZ(i, vx, vy, vz);

      const snowThreshold = snowLine + Math.sin(ang * ridgeFreq) * 0.06;
      if (normY > snowThreshold) {
        const sBlend = Math.min(1, (normY - snowThreshold) / 0.1);
        col.copy(midCol).lerp(snowCol, sBlend);
      } else {
        col.copy(baseCol).lerp(midCol, Math.min(1, normY / Math.max(0.25, snowLine)));
      }
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mats.mountainTerrain);
    mesh.position.set(cx, -2.5, cz);
    mesh.receiveShadow = false;
    mGroup.add(mesh);
  };

  if (style === 'russian') {
    buildPeak(-34, -124, 58, 44, 0.24, 9);
    buildPeak(46, -118, 52, 34, 0.28, 8);
    buildPeak(-88, -108, 46, 30, 0.3, 7);
  } else if (style === 'victorian') {
    buildPeak(-38, -122, 68, 28, 0.7, 4);
    buildPeak(44, -116, 62, 24, 0.72, 5);
    buildPeak(-92, -108, 54, 22, 0.75, 4);
  } else if (style === 'persian') {
    buildPeak(-36, -122, 64, 32, 0.62, 6, true);
    buildPeak(48, -116, 58, 26, 0.58, 5, true);
    buildPeak(-92, -108, 52, 23, 0.65, 5, false);
  } else if (style === 'mughal') {
    buildPeak(-34, -124, 62, 40, 0.72, 7);
    buildPeak(48, -118, 54, 27, 0.85, 5);
    buildPeak(-92, -106, 48, 24, 0.88, 6);
  } else {
    buildPeak(-34, -124, 62, 46, 0.56, 7);
    buildPeak(48, -118, 54, 29, 0.86, 5);
    buildPeak(-92, -106, 48, 25, 0.88, 6);
  }

  return mGroup;
}

/**
 * 1. Japanese Taiko-bashi vermilion lacquered drum bridge
 */
function createJapaneseBridge(
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const bridge = new THREE.Group();
  const span = 6.2;
  const width = 2.2;
  const archHeight = 1.2;

  const abutGeo = trackGeo(new THREE.BoxGeometry(0.95, 0.9, width + 0.5));
  const slabGeo = trackGeo(new THREE.BoxGeometry(1.15, 0.14, width + 0.35));
  for (const sx of [-span / 2 - 0.15, span / 2 + 0.15]) {
    const abut = new THREE.Mesh(abutGeo, mats.ishigakiStone);
    abut.position.set(sx, -0.35, 0);
    abut.castShadow = true;
    abut.receiveShadow = true;
    bridge.add(abut);

    const slab = new THREE.Mesh(slabGeo, mats.steppingStone);
    slab.position.set(sx + Math.sign(sx) * 0.25, 0.07, 0);
    slab.castShadow = true;
    slab.receiveShadow = true;
    bridge.add(slab);
  }

  const stringerPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = THREE.MathUtils.lerp(-span / 2, span / 2, t);
    const y = Math.sin(t * Math.PI) * archHeight;
    stringerPts.push(new THREE.Vector3(x, y, 0));
  }
  const archCurve = new THREE.CatmullRomCurve3(stringerPts);
  const stringerGeo = trackGeo(new THREE.TubeGeometry(archCurve, 24, 0.11, 8, false));
  const crossBeamGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.16, width + 0.16));
  const boltGeo = trackGeo(new THREE.SphereGeometry(0.042, 8, 6));

  for (const sz of [-width / 2 + 0.08, width / 2 - 0.08]) {
    const stringer = new THREE.Mesh(stringerGeo, mats.yakisugiTimber);
    stringer.position.z = sz;
    stringer.castShadow = true;
    bridge.add(stringer);
  }

  for (let bi = 1; bi <= 5; bi++) {
    const t = bi / 6;
    const pt = archCurve.getPoint(t);
    const cb = new THREE.Mesh(crossBeamGeo, mats.yakisugiTimber);
    cb.position.set(pt.x, pt.y - 0.06, 0);
    cb.castShadow = true;
    bridge.add(cb);

    for (const bz of [-width / 2 - 0.02, width / 2 + 0.02]) {
      const bolt = new THREE.Mesh(boltGeo, mats.brushedGold);
      bolt.position.set(pt.x, pt.y, bz);
      bridge.add(bolt);
    }
  }

  const plankCount = 18;
  const plankGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.09, width));
  for (let i = 0; i < plankCount; i++) {
    const t = (i + 0.5) / plankCount;
    const pt = archCurve.getPoint(t);
    const tangent = archCurve.getTangent(t);
    const plank = new THREE.Mesh(plankGeo, mats.hinokiDeck);
    plank.position.set(pt.x, pt.y + 0.09, 0);
    plank.rotation.z = Math.atan2(tangent.y, tangent.x);
    plank.castShadow = true;
    plank.receiveShadow = true;
    bridge.add(plank);
  }

  const railCurvePts = stringerPts.map((p) => new THREE.Vector3(p.x, p.y + 0.78, 0));
  const railCurve = new THREE.CatmullRomCurve3(railCurvePts);
  const railGeo = trackGeo(new THREE.TubeGeometry(railCurve, 24, 0.065, 8, false));
  const postGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.84, 0.11));
  const capGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.08, 0.02),
        new THREE.Vector2(0.09, 0.08),
        new THREE.Vector2(0.04, 0.14),
        new THREE.Vector2(0.07, 0.2),
        new THREE.Vector2(0, 0.28),
      ],
      12,
    ),
  );

  for (const sz of [-width / 2 + 0.08, width / 2 - 0.08]) {
    const rail = new THREE.Mesh(railGeo, mats.vermilionLacquer);
    rail.position.z = sz;
    rail.castShadow = true;
    bridge.add(rail);

    for (let pi = 0; pi <= 4; pi++) {
      const t = pi / 4;
      const pt = archCurve.getPoint(t);
      const post = new THREE.Mesh(postGeo, mats.vermilionLacquer);
      post.position.set(pt.x, pt.y + 0.44, sz);
      post.castShadow = true;
      bridge.add(post);

      if (pi === 0 || pi === 2 || pi === 4) {
        const cap = new THREE.Mesh(capGeo, mats.brushedGold);
        cap.position.set(pt.x, pt.y + 0.86, sz);
        bridge.add(cap);
      }
    }
  }

  return bridge;
}

/**
 * 2. Russian Imperial Neva Granite & Wrought-Iron Filigree Bridge with Obelisk Lamps
 */
function createRussianBridge(
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  lanternLights: THREE.PointLight[],
): THREE.Group {
  const bridge = new THREE.Group();
  const span = 7.4;
  const width = 2.6;
  const camber = 0.58;

  // Heavy stepped granite river piers at both abutments
  const pierBaseGeo = trackGeo(new THREE.BoxGeometry(1.35, 1.35, width + 0.85));
  const pierCapGeo = trackGeo(new THREE.BoxGeometry(1.5, 0.22, width + 0.95));
  for (const sx of [-span / 2 - 0.1, span / 2 + 0.1]) {
    const pier = new THREE.Mesh(pierBaseGeo, mats.graniteStone);
    pier.position.set(sx, -0.42, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    bridge.add(pier);

    const cap = new THREE.Mesh(pierCapGeo, mats.shikkuiPlaster);
    cap.position.set(sx, 0.25, 0);
    cap.receiveShadow = true;
    bridge.add(cap);
  }

  // Gently cambered stone vault & snow-rimmed granite deck
  const deckSegs = 16;
  const slabGeo = trackGeo(new THREE.BoxGeometry(span / deckSegs + 0.08, 0.28, width));
  const curbGeo = trackGeo(new THREE.BoxGeometry(span / deckSegs + 0.06, 0.14, 0.22));
  const archPts: THREE.Vector3[] = [];

  for (let i = 0; i <= deckSegs; i++) {
    const t = i / deckSegs;
    const x = THREE.MathUtils.lerp(-span / 2, span / 2, t);
    const y = Math.sin(t * Math.PI) * camber;
    archPts.push(new THREE.Vector3(x, y, 0));
  }
  const deckCurve = new THREE.CatmullRomCurve3(archPts);

  for (let i = 0; i < deckSegs; i++) {
    const t = (i + 0.5) / deckSegs;
    const pt = deckCurve.getPoint(t);
    const tan = deckCurve.getTangent(t);
    const angle = Math.atan2(tan.y, tan.x);

    const slab = new THREE.Mesh(slabGeo, mats.graniteStone);
    slab.position.set(pt.x, pt.y + 0.08, 0);
    slab.rotation.z = angle;
    slab.castShadow = true;
    slab.receiveShadow = true;
    bridge.add(slab);

    for (const cz of [-width / 2 + 0.1, width / 2 - 0.1]) {
      const snowCurb = new THREE.Mesh(curbGeo, mats.shikkuiPlaster);
      snowCurb.position.set(pt.x, pt.y + 0.24, cz);
      snowCurb.rotation.z = angle;
      bridge.add(snowCurb);
    }
  }

  // Ornate wrought-iron Petersburg railings & gilded balusters
  const railCurve = new THREE.CatmullRomCurve3(
    archPts.map((p) => new THREE.Vector3(p.x, p.y + 0.96, 0)),
  );
  const topRailGeo = trackGeo(new THREE.TubeGeometry(railCurve, 22, 0.055, 8, false));
  const balusterGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6));
  const ringGeo = trackGeo(new THREE.TorusGeometry(0.14, 0.022, 6, 14));

  for (const sz of [-width / 2 + 0.12, width / 2 - 0.12]) {
    const rail = new THREE.Mesh(topRailGeo, mats.wroughtIron);
    rail.position.z = sz;
    rail.castShadow = true;
    bridge.add(rail);

    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      const pt = deckCurve.getPoint(t);
      const bal = new THREE.Mesh(balusterGeo, mats.wroughtIron);
      bal.position.set(pt.x, pt.y + 0.58, sz);
      bridge.add(bal);

      if (i % 2 === 0) {
        const ring = new THREE.Mesh(ringGeo, mats.brushedGold);
        ring.position.set(pt.x, pt.y + 0.58, sz);
        bridge.add(ring);
      }
    }
  }

  // 4 Corner granite obelisk lamp pedestals (2 lit with warm gas lanterns)
  const obeliskGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.26, 1.35, 4));
  const lampPostGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.055, 0.85, 8));
  const lampGlassGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.11, 0.34, 6));
  const lampCapGeo = trackGeo(new THREE.ConeGeometry(0.2, 0.18, 6));

  let litIdx = 0;
  for (const ox of [-span / 2 + 0.15, span / 2 - 0.15]) {
    for (const oz of [-width / 2 - 0.08, width / 2 + 0.08]) {
      const obelisk = new THREE.Mesh(obeliskGeo, mats.graniteStone);
      obelisk.rotation.y = Math.PI / 4;
      obelisk.position.set(ox, 0.92, oz);
      obelisk.castShadow = true;
      bridge.add(obelisk);

      const post = new THREE.Mesh(lampPostGeo, mats.wroughtIron);
      post.position.set(ox, 1.98, oz);
      bridge.add(post);

      const glass = new THREE.Mesh(lampGlassGeo, mats.lanternGlow);
      glass.position.set(ox, 2.52, oz);
      bridge.add(glass);

      const cap = new THREE.Mesh(lampCapGeo, mats.wroughtIron);
      cap.position.set(ox, 2.78, oz);
      bridge.add(cap);

      if (litIdx === 0 || litIdx === 3) {
        const pl = new THREE.PointLight(0xffb55a, 1.4, 9.5, 1.65);
        pl.position.set(ox, 2.52, oz);
        bridge.add(pl);
        lanternLights.push(pl);
      }
      litIdx++;
    }
  }

  return bridge;
}

/**
 * 3. Victorian Gothic Tudor Red-Brick, Limestone & Cast-Iron Spandrel Arch Bridge
 */
function createVictorianBridge(
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  lanternLights: THREE.PointLight[],
): THREE.Group {
  const bridge = new THREE.Group();
  const span = 6.6;
  const width = 2.4;
  const archHeight = 1.05;

  // Castellated brick & stone Gothic bridgehead piers
  const pierGeo = trackGeo(new THREE.BoxGeometry(1.15, 1.25, width + 0.7));
  const merlonGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.34, 0.28));
  for (const sx of [-span / 2 - 0.15, span / 2 + 0.15]) {
    const pier = new THREE.Mesh(pierGeo, mats.victorianBrick);
    pier.position.set(sx, -0.25, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    bridge.add(pier);

    for (const mz of [-width / 2 - 0.18, width / 2 + 0.18]) {
      const cap = new THREE.Mesh(merlonGeo, mats.graniteStone);
      cap.position.set(sx, 0.55, mz);
      cap.castShadow = true;
      bridge.add(cap);
    }
  }

  // Twin curved wrought-iron Gothic arch ribs + stone flag deck
  const archPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const x = THREE.MathUtils.lerp(-span / 2, span / 2, t);
    const y = Math.sin(t * Math.PI) * archHeight;
    archPts.push(new THREE.Vector3(x, y, 0));
  }
  const archCurve = new THREE.CatmullRomCurve3(archPts);
  const ribGeo = trackGeo(new THREE.TubeGeometry(archCurve, 24, 0.11, 8, false));

  for (const rz of [-width / 2 + 0.08, width / 2 - 0.08]) {
    const rib = new THREE.Mesh(ribGeo, mats.wroughtIron);
    rib.position.z = rz;
    rib.castShadow = true;
    bridge.add(rib);
  }

  // Open Gothic spandrel rings tucked between arch rib and roadway
  const spandrelRingGeo = trackGeo(new THREE.TorusGeometry(0.22, 0.032, 6, 14));
  const deckGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.13, width));
  for (let i = 0; i < 16; i++) {
    const t = (i + 0.5) / 16;
    const pt = archCurve.getPoint(t);
    const tan = archCurve.getTangent(t);
    const deck = new THREE.Mesh(deckGeo, mats.steppingStone);
    deck.position.set(pt.x, pt.y + 0.14, 0);
    deck.rotation.z = Math.atan2(tan.y, tan.x);
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridge.add(deck);

    if (i % 2 === 1 && i > 1 && i < 14) {
      for (const rz of [-width / 2 + 0.12, width / 2 - 0.12]) {
        const ring = new THREE.Mesh(spandrelRingGeo, mats.wroughtIron);
        ring.position.set(pt.x, pt.y - 0.18, rz);
        bridge.add(ring);
      }
    }
  }

  // Gothic ironwork railings with pointed trefoil finials + twin mid-span Victorian globe lamps
  const railCurve = new THREE.CatmullRomCurve3(
    archPts.map((p) => new THREE.Vector3(p.x, p.y + 0.94, 0)),
  );
  const railGeo = trackGeo(new THREE.TubeGeometry(railCurve, 24, 0.055, 8, false));
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.055, 0.84, 8));
  const spireGeo = trackGeo(new THREE.ConeGeometry(0.07, 0.22, 6));

  for (const rz of [-width / 2 + 0.1, width / 2 - 0.1]) {
    const rail = new THREE.Mesh(railGeo, mats.wroughtIron);
    rail.position.z = rz;
    bridge.add(rail);

    for (let pi = 0; pi <= 6; pi++) {
      const t = pi / 6;
      const pt = archCurve.getPoint(t);
      const post = new THREE.Mesh(postGeo, mats.wroughtIron);
      post.position.set(pt.x, pt.y + 0.54, rz);
      bridge.add(post);

      if (pi === 3) {
        // Mid-span ornate Victorian globe gas lamp
        const lampStem = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.04, 0.06, 0.95, 8)),
          mats.wroughtIron,
        );
        lampStem.position.set(pt.x, pt.y + 1.38, rz);
        bridge.add(lampStem);

        const globe = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.22, 12, 10)),
          mats.lanternGlow,
        );
        globe.position.set(pt.x, pt.y + 1.98, rz);
        bridge.add(globe);

        const crown = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.18, 0.16, 8)),
          mats.wroughtIron,
        );
        crown.position.set(pt.x, pt.y + 2.22, rz);
        bridge.add(crown);

        const pl = new THREE.PointLight(0xffb55a, 1.5, 10.5, 1.65);
        pl.position.set(pt.x, pt.y + 1.98, rz);
        bridge.add(pl);
        lanternLights.push(pl);
      } else {
        const finial = new THREE.Mesh(spireGeo, mats.wroughtIron);
        finial.position.set(pt.x, pt.y + 1.06, rz);
        bridge.add(finial);
      }
    }
  }

  return bridge;
}

/**
 * 4. Mughal Ceremonial Shahi Sandstone & Makrana-Marble Twin-Arch Bridge with Domed Chhatris
 */
function createMughalBridge(
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const bridge = new THREE.Group();
  const span = 7.2;
  const width = 2.8;

  // Red-sandstone masonry abutment piers & central cutwater pier sitting in canal
  const pierGeo = trackGeo(new THREE.BoxGeometry(1.1, 1.65, width + 0.65));
  for (const px of [-span / 2, 0, span / 2]) {
    const pier = new THREE.Mesh(pierGeo, mats.redSandstone);
    pier.position.set(px, -0.35, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    bridge.add(pier);
  }

  // Twin pointed Mughal masonry arches spanning left & right halves
  for (const halfSign of [-1, 1]) {
    const archSpan = span / 2;
    const archPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const lx = halfSign * (0.3 + t * (archSpan - 0.6));
      const ly = Math.sin(t * Math.PI) * 0.68 - 0.1;
      archPts.push(new THREE.Vector3(lx, ly, 0));
    }
    const archCurve = new THREE.CatmullRomCurve3(archPts);
    const archRibGeo = trackGeo(new THREE.TubeGeometry(archCurve, 16, 0.14, 8, false));
    for (const rz of [-width / 2 + 0.14, width / 2 - 0.14]) {
      const rib = new THREE.Mesh(archRibGeo, mats.makranaMarble);
      rib.position.z = rz;
      bridge.add(rib);
    }
  }

  // Flat ceremonial sandstone roadway + marble border cornice
  const roadway = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(span + 1.6, 0.26, width)),
    mats.redSandstone,
  );
  roadway.position.y = 0.56;
  roadway.castShadow = true;
  roadway.receiveShadow = true;
  bridge.add(roadway);

  // Approach steps at both ends
  for (const sx of [-1, 1]) {
    for (let st = 0; st < 3; st++) {
      const step = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.42, 0.18, width - 0.1)),
        mats.redSandstone,
      );
      step.position.set(sx * (span / 2 + 0.85 + st * 0.38), 0.38 - st * 0.16, 0);
      step.castShadow = true;
      step.receiveShadow = true;
      bridge.add(step);
    }
  }

  // Pierced marble Jaali balustrades along bridge deck
  const jaaliGeo = trackGeo(new THREE.PlaneGeometry(1.55, 0.68));
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 0.85, 8));
  for (const rz of [-width / 2 + 0.12, width / 2 - 0.12]) {
    for (const jx of [-1.8, 0, 1.8]) {
      const screen = new THREE.Mesh(jaaliGeo, mats.jaaliScreen);
      screen.position.set(jx, 1.04, rz);
      screen.castShadow = true;
      bridge.add(screen);
    }
    for (const px of [-2.65, -0.9, 0.9, 2.65]) {
      const post = new THREE.Mesh(postGeo, mats.makranaMarble);
      post.position.set(px, 1.1, rz);
      bridge.add(post);
    }
  }

  // Twin octagonal domed Makrana-marble Chhatri kiosks crowning bridge center-flanks
  const chhatriColGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.08, 1.45, 8));
  const domeGeo = trackGeo(new THREE.SphereGeometry(0.62, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.68));
  const kalashGeo = trackGeo(new THREE.ConeGeometry(0.08, 0.36, 8));

  for (const cz of [-width / 2 - 0.05, width / 2 + 0.05]) {
    const kiosk = new THREE.Group();
    kiosk.position.set(0, 0.68, cz);
    bridge.add(kiosk);

    const plinth = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.75, 0.82, 0.18, 8)),
      mats.makranaMarble,
    );
    plinth.position.y = 0.09;
    kiosk.add(plinth);

    for (let c = 0; c < 4; c++) {
      const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
      const col = new THREE.Mesh(chhatriColGeo, mats.makranaMarble);
      col.position.set(Math.cos(a) * 0.52, 0.9, Math.sin(a) * 0.52);
      col.castShadow = true;
      kiosk.add(col);
    }

    const eave = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.95, 0.22, 8)),
      mats.redSandstone,
    );
    eave.position.y = 1.68;
    kiosk.add(eave);

    const dome = new THREE.Mesh(domeGeo, mats.makranaMarble);
    dome.position.y = 1.85;
    dome.castShadow = true;
    kiosk.add(dome);

    const finial = new THREE.Mesh(kalashGeo, mats.brushedGold);
    finial.position.y = 2.55;
    kiosk.add(finial);
  }

  return bridge;
}

/**
 * 5. Persian Safavid Si-o-se-pol Multi-Arch Ochre-Brick & Turquoise-Tile Bridge
 */
function createPersianBridge(
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const bridge = new THREE.Group();
  const span = 7.4;
  const width = 2.5;

  // Four stepped brick piers supporting three pointed Persian arches
  const pierGeo = trackGeo(new THREE.BoxGeometry(0.68, 1.6, width + 0.45));
  for (const px of [-3.4, -1.15, 1.15, 3.4]) {
    const pier = new THREE.Mesh(pierGeo, mats.ochrePlaster);
    pier.position.set(px, -0.35, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    bridge.add(pier);
  }

  // Three pointed arch vaults with turquoise glazed spandrel bands
  const spandrelGeo = trackGeo(new THREE.BoxGeometry(1.65, 0.42, width + 0.16));
  const tileTrimGeo = trackGeo(new THREE.BoxGeometry(1.72, 0.12, width + 0.22));
  for (const ax of [-2.28, 0, 2.28]) {
    const archPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const lx = ax + THREE.MathUtils.lerp(-0.85, 0.85, t);
      const ly = 0.05 + Math.sin(t * Math.PI) * 0.62;
      archPts.push(new THREE.Vector3(lx, ly, 0));
    }
    const archCurve = new THREE.CatmullRomCurve3(archPts);
    const archGeo = trackGeo(new THREE.TubeGeometry(archCurve, 12, 0.12, 8, false));
    for (const rz of [-width / 2 + 0.1, width / 2 - 0.1]) {
      const arch = new THREE.Mesh(archGeo, mats.turquoiseGlaze);
      arch.position.z = rz;
      bridge.add(arch);
    }

    const spandrel = new THREE.Mesh(spandrelGeo, mats.ochrePlaster);
    spandrel.position.set(ax, 0.68, 0);
    bridge.add(spandrel);

    const trim = new THREE.Mesh(tileTrimGeo, mats.persianTile);
    trim.position.set(ax, 0.92, 0);
    bridge.add(trim);
  }

  // Paved terracotta/ochre bridge walkway
  const deck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(span + 1.1, 0.18, width)),
    mats.ochrePlaster,
  );
  deck.position.y = 0.92;
  deck.castShadow = true;
  deck.receiveShadow = true;
  bridge.add(deck);

  // Recessed arched alcoves & crenellated turquoise-brick parapets along both sides
  const pillarGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.92, 0.22));
  const capGeo = trackGeo(new THREE.SphereGeometry(0.11, 8, 6));
  const copingGeo = trackGeo(new THREE.BoxGeometry(1.55, 0.18, 0.2));

  for (const rz of [-width / 2 + 0.12, width / 2 - 0.12]) {
    for (const px of [-3.3, -1.98, -0.66, 0.66, 1.98, 3.3]) {
      const pillar = new THREE.Mesh(pillarGeo, mats.ochrePlaster);
      pillar.position.set(px, 1.42, rz);
      pillar.castShadow = true;
      bridge.add(pillar);

      const finial = new THREE.Mesh(capGeo, mats.turquoiseGlaze);
      finial.position.set(px, 1.94, rz);
      bridge.add(finial);
    }
    for (const cx of [-2.64, -1.32, 0, 1.32, 2.64]) {
      const rail = new THREE.Mesh(copingGeo, mats.turquoiseGlaze);
      rail.position.set(cx, 1.72, rz);
      bridge.add(rail);
    }
  }

  // End steps connecting bridge walkway down to desert oasis bank
  for (const sx of [-1, 1]) {
    for (let st = 0; st < 4; st++) {
      const step = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.42, 0.22, width - 0.12)),
        mats.ochrePlaster,
      );
      step.position.set(sx * (span / 2 + 0.45 + st * 0.36), 0.72 - st * 0.2, 0);
      step.castShadow = true;
      step.receiveShadow = true;
      bridge.add(step);
    }
  }

  return bridge;
}

function createRegionalBridge(
  style: PalaceStyle,
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  lanternLights: THREE.PointLight[],
): THREE.Group {
  switch (style) {
    case 'russian':
      return createRussianBridge(mats, trackGeo, lanternLights);
    case 'victorian':
      return createVictorianBridge(mats, trackGeo, lanternLights);
    case 'mughal':
      return createMughalBridge(mats, trackGeo);
    case 'persian':
      return createPersianBridge(mats, trackGeo);
    case 'japanese':
    default:
      return createJapaneseBridge(mats, trackGeo);
  }
}

/**
 * Biome-styled garden lantern / wrought-iron gas lamp / Mughal chiragh / Persian brass lamp
 */
function createGardenLamp(
  style: PalaceStyle,
  variant: 'shore' | 'path',
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  lanternLights: THREE.PointLight[],
): THREE.Group {
  const lantern = new THREE.Group();

  const shGeo = trackGeo(new THREE.PlaneGeometry(1.7, 1.7));
  const sh = new THREE.Mesh(shGeo, mats.contactShadowMat);
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  lantern.add(sh);

  if (style === 'victorian' || style === 'russian') {
    const base = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 0.45, 8)),
      mats.wroughtIron,
    );
    base.position.y = 0.22;
    base.castShadow = true;
    lantern.add(base);

    const postH = variant === 'shore' ? 1.55 : 2.1;
    const post = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.06, 0.1, postH, 8)),
      mats.wroughtIron,
    );
    post.position.y = 0.45 + postH / 2;
    post.castShadow = true;
    lantern.add(post);

    const cageY = 0.45 + postH;
    const glass = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.16, 0.42, 6)),
      mats.lanternGlow,
    );
    glass.position.y = cageY + 0.2;
    lantern.add(glass);

    const cap = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.32, 0.26, 6)),
      mats.wroughtIron,
    );
    cap.position.y = cageY + 0.52;
    cap.castShadow = true;
    lantern.add(cap);

    const light = new THREE.PointLight(0xffb55a, 1.5, 11.0, 1.65);
    light.position.set(0, cageY + 0.2, 0);
    lantern.add(light);
    lanternLights.push(light);
    return lantern;
  }

  if (style === 'mughal' || style === 'persian') {
    const stoneMat = style === 'mughal' ? mats.redSandstone : mats.ochrePlaster;
    const capMat = style === 'mughal' ? mats.makranaMarble : mats.turquoiseGlaze;

    const base = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.26, 0.36, 0.25, 8)),
      stoneMat,
    );
    base.position.y = 0.12;
    lantern.add(base);

    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.12, 0.14, 1.15, 8)),
      stoneMat,
    );
    shaft.position.y = 0.82;
    shaft.castShadow = true;
    lantern.add(shaft);

    const glass = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 6)),
      mats.lanternGlow,
    );
    glass.position.y = 1.58;
    lantern.add(glass);

    const dome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6)),
      capMat,
    );
    dome.position.y = 1.76;
    lantern.add(dome);

    const light = new THREE.PointLight(0xffaa4c, 1.5, 10.5, 1.65);
    light.position.set(0, 1.58, 0);
    lantern.add(light);
    lanternLights.push(light);
    return lantern;
  }

  // Japanese Yukimi-doro / Kasuga-doro granite lanterns
  if (variant === 'shore') {
    const legGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 0.56, 8));
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(legGeo, mats.graniteStone);
      leg.position.set(Math.cos(ang) * 0.28, 0.25, Math.sin(ang) * 0.28);
      leg.rotation.z = Math.cos(ang) * 0.28;
      leg.rotation.x = -Math.sin(ang) * 0.28;
      leg.castShadow = true;
      lantern.add(leg);
    }

    const plat = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.42, 0.36, 0.14, 6)),
      mats.graniteStone,
    );
    plat.position.y = 0.56;
    plat.castShadow = true;
    lantern.add(plat);

    const box = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 6)),
      mats.lanternGlow,
    );
    box.position.y = 0.8;
    lantern.add(box);

    const ribGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.38, 0.06));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rib = new THREE.Mesh(ribGeo, mats.graniteStone);
      rib.position.set(Math.cos(a) * 0.24, 0.8, Math.sin(a) * 0.24);
      lantern.add(rib);
    }

    const kasa = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.68, 0.36, 6)),
      mats.graniteStone,
    );
    kasa.position.y = 1.15;
    kasa.castShadow = true;
    lantern.add(kasa);

    const hoju = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.11, 10, 8)),
      mats.graniteStone,
    );
    hoju.position.y = 1.36;
    lantern.add(hoju);

    const light = new THREE.PointLight(0xffa444, 1.5, 10.5, 1.7);
    light.position.set(0, 0.82, 0);
    lantern.add(light);
    lanternLights.push(light);
  } else {
    const base = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.32, 0.42, 0.24, 6)),
      mats.graniteStone,
    );
    base.position.y = 0.12;
    base.castShadow = true;
    lantern.add(base);

    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.14, 0.16, 0.95, 10)),
      mats.graniteStone,
    );
    shaft.position.y = 0.7;
    shaft.castShadow = true;
    lantern.add(shaft);

    const plat = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.36, 0.22, 0.18, 6)),
      mats.graniteStone,
    );
    plat.position.y = 1.25;
    lantern.add(plat);

    const box = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.36, 6)),
      mats.lanternGlow,
    );
    box.position.y = 1.51;
    lantern.add(box);

    const kasa = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.52, 0.34, 6)),
      mats.graniteStone,
    );
    kasa.position.y = 1.84;
    kasa.castShadow = true;
    lantern.add(kasa);

    const hoju = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.1, 10, 8)),
      mats.graniteStone,
    );
    hoju.position.y = 2.04;
    lantern.add(hoju);

    const light = new THREE.PointLight(0xffa444, 1.4, 10.0, 1.7);
    light.position.set(0, 1.52, 0);
    lantern.add(light);
    lanternLights.push(light);
  }

  return lantern;
}

/**
 * Shared composite wooden pier / viewing dock built from pilings, crossbeams, deck planks & bollards
 */
function createWoodenPier(
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  snowDusted = false,
): THREE.Group {
  const pier = new THREE.Group();
  const postMat = mats.yakisugiTimber;
  const deckMat = snowDusted ? mats.graniteStone : mats.hinokiDeck;

  const postGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.13, 1.65, 8));
  for (const px of [-1.2, 0, 1.2]) {
    for (const pz of [-0.85, 0.85]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, -0.35, pz);
      post.castShadow = true;
      pier.add(post);
    }
  }

  const plankGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.08, 2.05));
  for (let i = 0; i < 9; i++) {
    const plank = new THREE.Mesh(plankGeo, deckMat);
    plank.position.set(-1.35 + i * 0.34, 0.16, 0);
    plank.castShadow = true;
    plank.receiveShadow = true;
    pier.add(plank);
  }

  if (snowDusted) {
    const snowCap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.0, 0.05, 1.85)),
      mats.shikkuiPlaster,
    );
    snowCap.position.set(0, 0.22, 0);
    snowCap.receiveShadow = true;
    pier.add(snowCap);
  }

  // Mooring bollard at pier tip
  const bollard = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1, 0.12, 0.48, 8)),
    postMat,
  );
  bollard.position.set(1.32, 0.42, 0.82);
  bollard.castShadow = true;
  pier.add(bollard);

  return pier;
}

/**
 * Shared composite park bench (wrought-iron & oak for Victorian, rustic timber for Russian/Japanese)
 */
function createGardenBench(
  style: PalaceStyle,
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const bench = new THREE.Group();
  const legMat = style === 'victorian' ? mats.wroughtIron : mats.yakisugiTimber;
  const slatMat = mats.hinokiDeck;

  const legGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.5, 0.56));
  const armGeo = trackGeo(new THREE.BoxGeometry(0.07, 0.28, 0.52));
  for (const lx of [-0.9, 0.9]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, 0.25, 0);
    leg.castShadow = true;
    bench.add(leg);

    const arm = new THREE.Mesh(armGeo, legMat);
    arm.position.set(lx, 0.62, 0.02);
    bench.add(arm);
  }

  const slatGeo = trackGeo(new THREE.BoxGeometry(2.05, 0.05, 0.14));
  for (let s = 0; s < 3; s++) {
    const seat = new THREE.Mesh(slatGeo, slatMat);
    seat.position.set(0, 0.46, -0.18 + s * 0.18);
    seat.castShadow = true;
    bench.add(seat);
  }
  for (let b = 0; b < 2; b++) {
    const back = new THREE.Mesh(slatGeo, slatMat);
    back.position.set(0, 0.68 + b * 0.2, -0.25);
    back.rotation.x = 0.22;
    back.castShadow = true;
    bench.add(back);
  }

  return bench;
}

/**
 * Biome-specific pond rims, central fountains, piers, benches, ice-rink props & desert divan
 */
function createBiomeWaterFeatures(
  style: PalaceStyle,
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const features = new THREE.Group();
  const spec = getBiomeWaterSpec(style);

  if (style === 'japanese') {
    // Weathered wooden koi-viewing pier jutting out onto east pond bank
    const dock = createWoodenPier(mats, trackGeo, false);
    dock.position.set(10.2, WATER_LEVEL + 0.12, 11.4);
    dock.rotation.y = Math.PI;
    features.add(dock);

    // Rest bench on the north pond lawn facing Mt Fuji & koi pond
    const bench = createGardenBench('japanese', mats, trackGeo);
    const bx = 5.4;
    const bz = 3.2;
    bench.position.set(bx, groundHeightAt(bx, bz, style), bz);
    bench.rotation.y = 0.22;
    features.add(bench);
    return features;
  }

  if (style === 'russian') {
    // 1. Snow-dusted timber pier projecting onto the frozen glacial basin
    const pier = createWoodenPier(mats, trackGeo, true);
    pier.position.set(11.4, WATER_LEVEL + 0.14, 11.2);
    pier.rotation.y = Math.PI;
    features.add(pier);

    // 2. Ice-skating rink timber boundary posts encircling the pond ice
    const postGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 1.25, 8));
    const finialGeo = trackGeo(new THREE.SphereGeometry(0.11, 8, 6));
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.35;
      const rx = spec.pondCenter.x + Math.cos(ang) * (spec.pondRadiusX * 0.86);
      const rz = spec.pondCenter.z + Math.sin(ang) * (spec.pondRadiusZ * 0.86);
      if (rx < -4.5 && rz < 11) continue; // Keep bridge clearance open

      const pGroup = new THREE.Group();
      pGroup.position.set(rx, WATER_LEVEL, rz);

      const post = new THREE.Mesh(postGeo, mats.yakisugiTimber);
      post.position.y = 0.62;
      post.castShadow = true;
      pGroup.add(post);

      const cap = new THREE.Mesh(finialGeo, mats.brushedGold);
      cap.position.y = 1.28;
      pGroup.add(cap);

      features.add(pGroup);
    }

    // 3. Ice-fishing hole cut into the ice sheet with wooden bucket & camp stool
    const holeGroup = new THREE.Group();
    holeGroup.position.set(-1.6, WATER_LEVEL + 0.02, 12.6);
    features.add(holeGroup);

    const darkHole = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.62, 18)),
      mats.pondBed,
    );
    darkHole.rotation.x = -Math.PI / 2;
    holeGroup.add(darkHole);

    const snowRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.66, 0.12, 8, 18)),
      mats.shikkuiPlaster,
    );
    snowRim.rotation.x = Math.PI / 2;
    snowRim.position.y = 0.04;
    holeGroup.add(snowRim);

    const bucket = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.18, 0.36, 10)),
      mats.hinokiDeck,
    );
    bucket.position.set(1.05, 0.18, 0.25);
    bucket.castShadow = true;
    holeGroup.add(bucket);

    const stoolSeat = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 10)),
      mats.yakisugiTimber,
    );
    stoolSeat.position.set(-0.95, 0.38, -0.35);
    holeGroup.add(stoolSeat);
    for (const sx of [-0.14, 0.14]) {
      const sLeg = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6)),
        mats.yakisugiTimber,
      );
      sLeg.position.set(-0.95 + sx, 0.18, -0.35);
      holeGroup.add(sLeg);
    }

    // 4. Winter shore bench overlooking the frozen skating lake
    const bench = createGardenBench('russian', mats, trackGeo);
    const bx = 5.2;
    const bz = 2.6;
    bench.position.set(bx, groundHeightAt(bx, bz, style), bz);
    bench.rotation.y = 0.18;
    features.add(bench);
    return features;
  }

  if (style === 'victorian') {
    // 1. Dressed limestone lake coping rim encircling the formal oval estate pond
    const rimCount = 36;
    const rimBlockGeo = trackGeo(new THREE.BoxGeometry(1.85, 0.28, 0.44));
    for (let i = 0; i < rimCount; i++) {
      const ang = (i / rimCount) * Math.PI * 2;
      const rx = spec.pondCenter.x + Math.cos(ang) * (spec.pondRadiusX * 0.99);
      const rz = spec.pondCenter.z + Math.sin(ang) * (spec.pondRadiusZ * 0.99);
      // Leave clean opening where stream enters pond
      if (distanceToStream(rx, rz, style).dist < 2.3) continue;

      const block = new THREE.Mesh(rimBlockGeo, mats.graniteStone);
      block.position.set(rx, WATER_LEVEL + 0.12, rz);
      block.rotation.y = -Math.atan2(
        Math.sin(ang) * spec.pondRadiusZ,
        Math.cos(ang) * spec.pondRadiusX,
      ) + Math.PI / 2;
      block.receiveShadow = true;
      features.add(block);
    }

    // 2. Central Multi-Tiered Victorian Carved Limestone Fountain
    const fountain = new THREE.Group();
    fountain.position.set(spec.pondCenter.x, WATER_LEVEL - 0.15, spec.pondCenter.z);
    features.add(fountain);

    const outerBasin = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.15, 2.35, 0.42, 12)),
      mats.graniteStone,
    );
    outerBasin.position.y = 0.21;
    outerBasin.castShadow = true;
    outerBasin.receiveShadow = true;
    fountain.add(outerBasin);

    const innerWater = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.9, 1.9, 0.12, 16)),
      mats.turquoiseGlaze,
    );
    innerWater.position.y = 0.4;
    fountain.add(innerWater);

    const pedestal = new THREE.Mesh(
      trackGeo(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.0, 0.0),
            new THREE.Vector2(0.55, 0.05),
            new THREE.Vector2(0.32, 0.45),
            new THREE.Vector2(0.24, 0.95),
            new THREE.Vector2(0.98, 1.25),
            new THREE.Vector2(1.05, 1.38),
            new THREE.Vector2(0.22, 1.32),
            new THREE.Vector2(0.16, 1.85),
            new THREE.Vector2(0.52, 2.02),
            new THREE.Vector2(0.12, 2.15),
            new THREE.Vector2(0.0, 2.45),
          ],
          16,
        ),
      ),
      mats.graniteStone,
    );
    pedestal.position.y = 0.32;
    pedestal.castShadow = true;
    fountain.add(pedestal);

    // 3. Oak & Granite Rowboat Landing Pier
    const dock = createWoodenPier(mats, trackGeo, false);
    dock.position.set(11.6, WATER_LEVEL + 0.12, 7.6);
    dock.rotation.y = Math.PI * 0.85;
    features.add(dock);

    // 4. Two Wrought-Iron & Oak Victorian Park Benches facing the swan lake
    for (const [bx, bz, rot] of [
      [4.2, 2.6, 0.08],
      [-2.5, 3.2, -0.35],
    ]) {
      const bench = createGardenBench('victorian', mats, trackGeo);
      bench.position.set(bx, groundHeightAt(bx, bz, style), bz);
      bench.rotation.y = rot;
      features.add(bench);
    }

    return features;
  }

  if (style === 'mughal') {
    // 1. Geometric Octagonal Red-Sandstone & Makrana-Marble Charbagh Pool Rim
    const vertices: Array<[number, number]> = [];
    const k = Math.SQRT2 - 1;
    const rx = spec.pondRadiusX * 0.96;
    const rz = spec.pondRadiusZ * 0.96;
    const rawPts: Array<[number, number]> = [
      [rx, rz * k],
      [rx * k, rz],
      [-rx * k, rz],
      [-rx, rz * k],
      [-rx, -rz * k],
      [-rx * k, -rz],
      [rx * k, -rz],
      [rx, -rz * k],
    ];
    for (const [px, pz] of rawPts) {
      vertices.push([spec.pondCenter.x + px, spec.pondCenter.z + pz]);
    }

    for (let i = 0; i < 8; i++) {
      const [ax, az] = vertices[i];
      const [bx, bz] = vertices[(i + 1) % 8];
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      // Leave west canal entry open so water flows under Mughal Shahi bridge directly into pool
      if (i === 4) continue;
      const len = Math.hypot(bx - ax, bz - az);
      const ang = Math.atan2(bz - az, bx - ax);

      const wall = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(len + 0.3, 0.42, 0.56)),
        mats.redSandstone,
      );
      wall.position.set(mx, WATER_LEVEL + 0.14, mz);
      wall.rotation.y = -ang;
      wall.castShadow = true;
      wall.receiveShadow = true;
      features.add(wall);

      const coping = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(len + 0.34, 0.1, 0.64)),
        mats.makranaMarble,
      );
      coping.position.set(mx, WATER_LEVEL + 0.38, mz);
      coping.rotation.y = -ang;
      features.add(coping);
    }

    // 2. Descending Makrana-Marble Ghat Steps on the north edge facing the palace
    for (let st = 0; st < 3; st++) {
      const ghatStep = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.8, 0.18, 0.55)),
        mats.makranaMarble,
      );
      ghatStep.position.set(
        spec.pondCenter.x,
        WATER_LEVEL + 0.25 - st * 0.16,
        spec.pondCenter.z - spec.pondRadiusZ * 0.94 + st * 0.48,
      );
      ghatStep.receiveShadow = true;
      features.add(ghatStep);
    }

    // 3. Central Carved Makrana-Marble Lotus Fountain in middle of Charbagh pool
    const fountain = new THREE.Group();
    fountain.position.set(spec.pondCenter.x, WATER_LEVEL - 0.1, spec.pondCenter.z);
    features.add(fountain);

    const plinth = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.35, 1.55, 0.36, 8)),
      mats.redSandstone,
    );
    plinth.position.y = 0.18;
    fountain.add(plinth);

    const lotusBowl = new THREE.Mesh(
      trackGeo(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.4, 0.08),
            new THREE.Vector2(0.24, 0.45),
            new THREE.Vector2(0.85, 0.68),
            new THREE.Vector2(0.92, 0.78),
            new THREE.Vector2(0.18, 0.72),
            new THREE.Vector2(0.08, 1.15),
            new THREE.Vector2(0, 1.25),
          ],
          12,
        ),
      ),
      mats.makranaMarble,
    );
    lotusBowl.position.y = 0.35;
    lotusBowl.castShadow = true;
    fountain.add(lotusBowl);

    return features;
  }

  // Persian Desert Oasis: Stepped Qanat Aqueduct Spout + Shaded Divan Carpet & Brass Tea Vessels
  // 1. Stepped Stone & Turquoise-Tile Qanat Spout feeding water into northwest oasis bank
  const qanat = new THREE.Group();
  qanat.position.set(-4.2, groundHeightAt(-4.2, 6.2, style), 6.2);
  qanat.rotation.y = 0.75;
  features.add(qanat);

  for (let tier = 0; tier < 2; tier++) {
    const wall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.45, 0.55 - tier * 0.18, 1.85)),
      mats.ochrePlaster,
    );
    wall.position.set(0, 0.25 - tier * 0.22, tier * 1.35);
    wall.castShadow = true;
    wall.receiveShadow = true;
    qanat.add(wall);

    const channel = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.82, 1.75)),
      mats.turquoiseGlaze,
    );
    channel.rotation.x = -Math.PI / 2;
    channel.position.set(0, 0.54 - tier * 0.31, tier * 1.35);
    qanat.add(channel);
  }

  // 2. Shaded Oasis Stone Divan Platform with Crimson/Cobalt Persian Rug & Brass Tea Ewer
  const divan = new THREE.Group();
  const dx = 8.4;
  const dz = 13.4;
  divan.position.set(dx, groundHeightAt(dx, dz, style), dz);
  divan.rotation.y = -0.48;
  features.add(divan);

  const plinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.2, 0.32, 2.3)),
    mats.ochrePlaster,
  );
  plinth.position.y = 0.16;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  divan.add(plinth);

  const rug = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.75, 0.05, 1.9)),
    mats.persianCarpet,
  );
  rug.position.y = 0.34;
  rug.receiveShadow = true;
  divan.add(rug);

  const bolsterGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 1.3, 10));
  bolsterGeo.rotateX(Math.PI / 2);
  for (const bx of [-1.1, 1.1]) {
    const bolster = new THREE.Mesh(bolsterGeo, mats.turquoiseGlaze);
    bolster.position.set(bx, 0.48, 0);
    bolster.castShadow = true;
    divan.add(bolster);
  }

  const tray = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.34, 0.32, 0.04, 14)),
    mats.brushedGold,
  );
  tray.position.set(0, 0.39, 0.1);
  divan.add(tray);

  const ewer = new THREE.Mesh(
    trackGeo(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.09, 0.02),
          new THREE.Vector2(0.14, 0.16),
          new THREE.Vector2(0.05, 0.3),
          new THREE.Vector2(0.09, 0.38),
          new THREE.Vector2(0, 0.44),
        ],
        12,
      ),
    ),
    mats.brushedGold,
  );
  ewer.position.set(0, 0.41, 0.1);
  divan.add(ewer);

  return features;
}

export function buildGardenEnvironment(
  style: PalaceStyle,
  mats: SceneMaterialLibrary,
  sunDir: THREE.Vector3,
): EnvironmentBuildResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const spec = getBiomeWaterSpec(style);

  // 1. Biome Sky Dome
  const sky = createBiomeSkyDome(style, sunDir);
  group.add(sky.mesh);

  // 2. Biome Mountain / Highland / Desert Mesa Backdrop
  const mountains = createMountainBackdrop(style, mats, trackGeo);
  group.add(mountains);

  // 3. Continuous sculpted terrain colored & textured for each biome
  const terrainSize = 180;
  const segs = 128;
  const terrainGeo = trackGeo(new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs));
  terrainGeo.rotateX(-Math.PI / 2);

  const pos = terrainGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();

  const palette =
    style === 'russian'
      ? {
          ground: new THREE.Color(0xf2f6fa),
          courtyard: new THREE.Color(0xc2ccd6),
          bank: new THREE.Color(0xaab8c8),
          bed: new THREE.Color(0x4a6478),
        }
      : style === 'victorian'
        ? {
            ground: new THREE.Color(0x477336),
            courtyard: new THREE.Color(0xa39d90),
            bank: new THREE.Color(0x4b473a),
            bed: new THREE.Color(0x283630),
          }
        : style === 'mughal'
          ? {
              ground: new THREE.Color(0x4d7839),
              courtyard: new THREE.Color(0x9e5946),
              bank: new THREE.Color(0x7d4c3b),
              bed: new THREE.Color(0x2d4440),
            }
          : style === 'persian'
            ? {
                ground: new THREE.Color(0xe3bd7e),
                courtyard: new THREE.Color(0xcba36b),
                bank: new THREE.Color(0x6d7d47),
                bed: new THREE.Color(0x265963),
              }
            : {
                ground: new THREE.Color(0x556c42),
                courtyard: new THREE.Color(0xa69b8a),
                bank: new THREE.Color(0x4b4739),
                bed: new THREE.Color(0x2b3633),
              };

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = groundHeightAt(x, z, style);
    pos.setY(i, y);

    const pf = pondSignedFactor(x, z, style);
    const sd = distanceToStream(x, z, style).dist;
    const inCourtyard = Math.abs(x - 5) < 19 && z > -28 && z < -8;

    if (pf < 1.05 || sd < 2.3) {
      col.copy(palette.bed).lerp(palette.bank, Math.max(0, Math.min(1, (y + 1.1) / 0.9)));
    } else if (style === 'persian' && (pf < 1.32 || sd < 3.6)) {
      col.copy(palette.bank).lerp(palette.ground, 0.35);
    } else if (inCourtyard) {
      col.copy(palette.courtyard);
    } else {
      const tone = 0.89 + 0.11 * Math.sin(x * 0.25 + z * 0.18);
      col.copy(palette.ground).multiplyScalar(tone);
    }

    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const groundMat =
    style === 'russian'
      ? mats.snowGround
      : style === 'persian'
        ? mats.desertSand
        : style === 'victorian' || style === 'mughal'
          ? mats.lushGrass
          : mats.terrainGround;

  const terrainMesh = new THREE.Mesh(terrainGeo, groundMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 4. Pond bed & shimmering water surface (glacial ice sheet in Russian winter)
  const bedGeo = trackGeo(new THREE.CircleGeometry(12.8, 42));
  bedGeo.rotateX(-Math.PI / 2);
  const bedMesh = new THREE.Mesh(bedGeo, mats.pondBed);
  bedMesh.position.set(spec.pondCenter.x, spec.pondFloorY + 0.08, spec.pondCenter.z);
  bedMesh.scale.set(spec.pondRadiusX / 11.2, 1, spec.pondRadiusZ / 10.6);
  bedMesh.receiveShadow = true;
  group.add(bedMesh);

  const waterGeo = trackGeo(new THREE.PlaneGeometry(58, 38, 72, 48));
  waterGeo.rotateX(-Math.PI / 2);
  const waterMesh = new THREE.Mesh(
    waterGeo,
    style === 'russian' ? mats.iceWater : mats.waterSurface,
  );
  waterMesh.position.set(-7.5, WATER_LEVEL, 6.2);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // 5. Biome-colored shoreline boulders / desert sandstone outcrops
  const boulderGeo = trackGeo(new THREE.DodecahedronGeometry(0.55, 1));
  const boulderTransforms: Array<{
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    rot: number;
    shade: number;
  }> = [];

  // Victorian and Mughal have architectural stone rims; other biomes have natural boulder banks
  if (style !== 'victorian' && style !== 'mughal') {
    for (let i = 0; i < 46; i++) {
      const ang = (i / 46) * Math.PI * 2;
      const bx = spec.pondCenter.x + Math.cos(ang) * (spec.pondRadiusX * 1.03);
      const bz = spec.pondCenter.z + Math.sin(ang) * (spec.pondRadiusZ * 1.03);
      if (distanceToStream(bx, bz, style).dist < 2.2) continue;
      if (Math.hypot(bx - spec.bridgePos.x, bz - spec.bridgePos.z) < 3.4) continue;

      boulderTransforms.push({
        x: bx,
        y: groundHeightAt(bx, bz, style) + 0.06,
        z: bz,
        sx: 0.85 + ((i * 17) % 10) * 0.08,
        sy: 0.52 + ((i * 13) % 7) * 0.07,
        sz: 0.85 + ((i * 23) % 10) * 0.07,
        rot: i * 1.1,
        shade: 0.72 + ((i * 7) % 10) * 0.03,
      });
    }
  }

  for (let i = 0; i < 32; i++) {
    const t = i / 31;
    const pts = spec.streamPoints;
    const segF = t * (pts.length - 1);
    const segIdx = Math.min(pts.length - 2, Math.floor(segF));
    const u = segF - segIdx;
    const sx = THREE.MathUtils.lerp(pts[segIdx][0], pts[segIdx + 1][0], u);
    const sz = THREE.MathUtils.lerp(pts[segIdx][1], pts[segIdx + 1][1], u);
    const side = i % 2 === 0 ? 1 : -1;
    const bx = sx + side * (1.85 + (i % 3) * 0.28);
    const bz = sz - side * 1.25;
    if (Math.hypot(bx - spec.bridgePos.x, bz - spec.bridgePos.z) < 3.5) continue;
    if (pondSignedFactor(bx, bz, style) < 1.08) continue;

    boulderTransforms.push({
      x: bx,
      y: groundHeightAt(bx, bz, style) + 0.05,
      z: bz,
      sx: 0.75 + (i % 5) * 0.14,
      sy: 0.48 + (i % 4) * 0.1,
      sz: 0.8 + (i % 3) * 0.15,
      rot: i * 0.8,
      shade: 0.68 + (i % 6) * 0.05,
    });
  }

  const dummy = new THREE.Object3D();
  const cTmp = new THREE.Color();

  if (boulderTransforms.length > 0) {
    const boulderMat =
      style === 'persian'
        ? mats.ochrePlaster
        : style === 'russian'
          ? mats.shikkuiPlaster
          : mats.graniteStone;

    const boulderMesh = new THREE.InstancedMesh(
      boulderGeo,
      boulderMat,
      boulderTransforms.length,
    );
    boulderMesh.castShadow = true;
    boulderMesh.receiveShadow = true;

    boulderTransforms.forEach((b, idx) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0.1, b.rot, 0.08);
      dummy.scale.set(b.sx, b.sy, b.sz);
      dummy.updateMatrix();
      boulderMesh.setMatrixAt(idx, dummy.matrix);
      cTmp.setRGB(b.shade, b.shade * 0.99, b.shade * 0.95);
      boulderMesh.setColorAt(idx, cTmp);
    });
    boulderMesh.instanceMatrix.needsUpdate = true;
    if (boulderMesh.instanceColor) boulderMesh.instanceColor.needsUpdate = true;
    boulderMesh.computeBoundingSphere();
    group.add(boulderMesh);
  }

  const lanternLights: THREE.PointLight[] = [];

  // 6. Regional Bridge Architecture
  const bridge = createRegionalBridge(style, mats, trackGeo, lanternLights);
  bridge.position.set(spec.bridgePos.x, 0.02, spec.bridgePos.z);
  bridge.rotation.y = spec.bridgePos.rotY;
  group.add(bridge);

  // 7. Biome-styled Garden Lamps & Lanterns
  const shoreLampPositions: Array<[number, number]> =
    style === 'mughal'
      ? [
          [-2.8, 4.4],
          [13.4, 7.8],
        ]
      : [
          [-5.6, 8.6],
          [13.2, 8.2],
        ];
  for (const [lx, lz] of shoreLampPositions) {
    const shoreLamp = createGardenLamp(style, 'shore', mats, trackGeo, lanternLights);
    shoreLamp.position.set(lx, groundHeightAt(lx, lz, style), lz);
    group.add(shoreLamp);
  }

  const pathPositions: Array<[number, number]> = [
    [1.8, -7.2],
    [7.2, -7.2],
    [-14.2, 3.8],
    [14.8, -4.5],
  ];
  for (const [lx, lz] of pathPositions) {
    const kl = createGardenLamp(style, 'path', mats, trackGeo, lanternLights);
    kl.position.set(lx, groundHeightAt(lx, lz, style), lz);
    group.add(kl);
  }

  // 8. Textured Stone Cobblestone/Flagstone Garden Pathways & Chiseled Stepping Slabs
  const stonePaletteByStyle: Record<
    PalaceStyle,
    { face: number; verge: number; slab: [number, number, number] }
  > = {
    japanese: { face: 0xa4a99d, verge: 0x6f7a62, slab: [0.84, 0.86, 0.82] },
    russian: { face: 0xb6c1d2, verge: 0xdce6f2, slab: [0.88, 0.92, 0.96] },
    victorian: { face: 0xb8af99, verge: 0x6e785a, slab: [0.92, 0.88, 0.8] },
    mughal: { face: 0xc96e56, verge: 0x9c5541, slab: [0.98, 0.64, 0.52] },
    persian: { face: 0xdfc18a, verge: 0xc8a468, slab: [0.98, 0.88, 0.68] },
  };
  const pal = stonePaletteByStyle[style];
  const faceCol = new THREE.Color(pal.face);
  const vergeCol = new THREE.Color(pal.verge);

  const bridgeCos = Math.cos(spec.bridgePos.rotY);
  const bridgeSin = Math.sin(spec.bridgePos.rotY);
  const westLandX = spec.bridgePos.x - bridgeCos * 4.4;
  const westLandZ = spec.bridgePos.z + bridgeSin * 4.4;
  const eastLandX = spec.bridgePos.x + bridgeCos * 4.4;
  const eastLandZ = spec.bridgePos.z - bridgeSin * 4.4;

  // Build terrain-conforming, crowned stone paver walkway ribbons with seamless world-space UVs
  const buildStonePathRibbon = (
    curve: THREE.CatmullRomCurve3,
    segments: number,
    width: number,
  ) => {
    const pts = curve.getPoints(segments);
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const lateralFracs = [-0.52, -0.38, 0.0, 0.38, 0.52];
    const heightOffsets = [-0.045, 0.048, 0.068, 0.048, -0.045];
    const rowCols = [vergeCol, faceCol, faceCol, faceCol, vergeCol];

    let arcDist = 0;
    let ringIndex = 0;
    let prevValid = false;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i > 0) arcDist += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);

      const safe =
        pondSignedFactor(p.x, p.z, style) >= 1.08 &&
        distanceToStream(p.x, p.z, style).dist >= 2.1;
      if (!safe) {
        prevValid = false;
        continue;
      }

      const prevP = pts[Math.max(0, i - 1)];
      const nextP = pts[Math.min(pts.length - 1, i + 1)];
      let tx = nextP.x - prevP.x;
      let tz = nextP.z - prevP.z;
      const tLen = Math.hypot(tx, tz) || 1;
      tx /= tLen;
      tz /= tLen;
      const nx = -tz;
      const nz = tx;

      for (let c = 0; c < 5; c++) {
        const lat = lateralFracs[c] * width;
        const wx = p.x + nx * lat;
        const wz = p.z + nz * lat;
        const wy = groundHeightAt(wx, wz, style) + heightOffsets[c];
        positions.push(wx, wy, wz);
        normals.push(0, 1, 0);
        uvs.push((lateralFracs[c] + 0.5) * 1.1, arcDist * 0.58);
        colors.push(rowCols[c].r, rowCols[c].g, rowCols[c].b);
      }

      if (prevValid && ringIndex > 0) {
        const r0 = (ringIndex - 1) * 5;
        const r1 = ringIndex * 5;
        for (let c = 0; c < 4; c++) {
          indices.push(r0 + c, r0 + c + 1, r1 + c);
          indices.push(r0 + c + 1, r1 + c + 1, r1 + c);
        }
      }

      ringIndex++;
      prevValid = true;
    }

    if (indices.length === 0) return;
    const geo = trackGeo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const mesh = new THREE.Mesh(geo, mats.stonePathway);
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  // Route 1: West approach into bridge
  buildStonePathRibbon(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(westLandX - 4.2, 0, westLandZ + 4.4),
      new THREE.Vector3(westLandX - 2.1, 0, westLandZ + 2.0),
      new THREE.Vector3(westLandX, 0, westLandZ),
    ]),
    14,
    1.65,
  );

  // Route 2: East bridge landing curving through garden to Palace Gatehouse
  buildStonePathRibbon(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(eastLandX, 0, eastLandZ),
      new THREE.Vector3((eastLandX + 4.4) * 0.5 + 1.5, 0, (eastLandZ - 7.8) * 0.5),
      new THREE.Vector3(4.5, 0, -7.8),
    ]),
    28,
    1.85,
  );

  // Route 3: Courtyard promenade connecting gatehouse terrace to East Garden Pavilion
  buildStonePathRibbon(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.4, 0, -4.6),
      new THREE.Vector3(8.8, 0, -6.2),
      new THREE.Vector3(16.6, 0, -9.6),
    ]),
    24,
    1.75,
  );

  // Sculpted beveled polygonal chiseled flagstone slabs with normalized top UVs
  const slabShape = new THREE.Shape();
  const slabVerts: Array<[number, number]> = [
    [-0.56, -0.38],
    [-0.22, -0.58],
    [0.34, -0.52],
    [0.62, -0.14],
    [0.52, 0.36],
    [0.12, 0.56],
    [-0.44, 0.44],
    [-0.64, 0.04],
  ];
  slabShape.moveTo(slabVerts[0][0], slabVerts[0][1]);
  for (let v = 1; v < slabVerts.length; v++) {
    slabShape.lineTo(slabVerts[v][0], slabVerts[v][1]);
  }
  slabShape.closePath();
  const stepGeo = trackGeo(
    new THREE.ExtrudeGeometry(slabShape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.045,
      bevelSegments: 2,
    }),
  );
  stepGeo.rotateX(-Math.PI / 2);
  // Normalize UVs cleanly across the flagstone slab footprint so the 512x512 texture fits sharply
  const sPos = stepGeo.attributes.position;
  const sUv = stepGeo.attributes.uv;
  for (let i = 0; i < sPos.count; i++) {
    sUv.setXY(i, (sPos.getX(i) + 0.68) / 1.36, (sPos.getZ(i) + 0.62) / 1.24);
  }
  sUv.needsUpdate = true;
  stepGeo.computeBoundingSphere();

  const pathPoints: Array<{ x: number; z: number; sx: number; sz: number; rot: number }> = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    pathPoints.push({
      x: THREE.MathUtils.lerp(westLandX - 3.6, westLandX, t),
      z: THREE.MathUtils.lerp(westLandZ + 3.8, westLandZ, t),
      sx: 0.98 + (i % 2) * 0.14,
      sz: 0.84 + ((i + 1) % 3) * 0.1,
      rot: i * 0.62,
    });
  }
  for (let i = 0; i < 15; i++) {
    const t = i / 14;
    const px = THREE.MathUtils.lerp(eastLandX, 4.4, t) + Math.sin(t * Math.PI) * 1.45;
    const pz = THREE.MathUtils.lerp(eastLandZ, -7.6, t);
    if (pondSignedFactor(px, pz, style) < 1.06) continue;
    pathPoints.push({
      x: px,
      z: pz,
      sx: 0.98 + (i % 3) * 0.12,
      sz: 0.82 + ((i + 1) % 3) * 0.1,
      rot: i * 0.78,
    });
  }
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const px = THREE.MathUtils.lerp(1.8, 16.4, t);
    const pz = THREE.MathUtils.lerp(-4.6, -9.5, t) + Math.sin(t * Math.PI) * 0.85;
    pathPoints.push({
      x: px,
      z: pz,
      sx: 0.92 + (i % 2) * 0.12,
      sz: 0.78 + (i % 3) * 0.08,
      rot: i * 0.92,
    });
  }

  const pathInst = new THREE.InstancedMesh(stepGeo, mats.steppingStone, pathPoints.length);
  pathInst.receiveShadow = true;
  pathInst.castShadow = true;

  pathPoints.forEach((pt, idx) => {
    const py = groundHeightAt(pt.x, pt.z, style);
    dummy.position.set(pt.x, py + 0.032, pt.z);
    dummy.rotation.set(0, pt.rot, 0);
    dummy.scale.set(pt.sx, 1, pt.sz);
    dummy.updateMatrix();
    pathInst.setMatrixAt(idx, dummy.matrix);

    const v = 0.9 + (idx % 4) * 0.04;
    cTmp.setRGB(pal.slab[0] * v, pal.slab[1] * v, pal.slab[2] * v);
    pathInst.setColorAt(idx, cTmp);
  });
  pathInst.instanceMatrix.needsUpdate = true;
  if (pathInst.instanceColor) pathInst.instanceColor.needsUpdate = true;
  pathInst.computeBoundingSphere();
  group.add(pathInst);

  // 9. Biome-specific Water Features, Fountains, Piers & Shore Accents
  group.add(createBiomeWaterFeatures(style, mats, trackGeo));

  // Victorian Tudor manicured boxwood hedges & topiary cones
  if (style === 'victorian') {
    const hedgeBoxGeo = trackGeo(new THREE.BoxGeometry(2.6, 0.85, 0.72));
    const coneGeo = trackGeo(new THREE.ConeGeometry(0.52, 1.55, 10));
    for (const [hx, hz, rot] of [
      [-1.5, -5.8, 0.15],
      [9.5, -5.8, -0.15],
      [14.2, -7.2, 0.25],
      [-5.2, -1.8, -0.55],
    ]) {
      const hy = groundHeightAt(hx, hz, style);
      const hedge = new THREE.Mesh(hedgeBoxGeo, mats.hedgeFoliage);
      hedge.position.set(hx, hy + 0.42, hz);
      hedge.rotation.y = rot;
      hedge.castShadow = true;
      hedge.receiveShadow = true;
      group.add(hedge);

      const topiary = new THREE.Mesh(coneGeo, mats.hedgeFoliage);
      topiary.position.set(hx + 1.5, hy + 0.78, hz);
      topiary.castShadow = true;
      group.add(topiary);
    }
  }

  // Mughal Charbagh red-sandstone axial water channel linking courtyard & octagonal pool
  if (style === 'mughal') {
    const chanRim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.8, 0.2, 11.4)),
      mats.redSandstone,
    );
    chanRim.position.set(4.5, 0.08, -11.2);
    group.add(chanRim);

    const chanWater = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.15, 11.0)),
      mats.turquoiseGlaze,
    );
    chanWater.rotation.x = -Math.PI / 2;
    chanWater.position.set(4.5, 0.19, -11.2);
    group.add(chanWater);
  }

  // Lily pads & multi-petal blooming lotus flowers
  if (style === 'japanese' || style === 'victorian' || style === 'mughal') {
    const padShape = new THREE.Shape();
    padShape.absarc(0, 0, 0.38, 0.24, Math.PI * 2 - 0.24, false);
    padShape.lineTo(0, 0);
    const padGeo = trackGeo(new THREE.ShapeGeometry(padShape, 18));
    padGeo.rotateX(-Math.PI / 2);

    // Sculpted cupped lotus petal geometry (curved longitudinally + dished transversely)
    const petalGeo = trackGeo(new THREE.PlaneGeometry(0.11, 0.23, 2, 5));
    petalGeo.translate(0, 0.115, 0);
    const ptPos = petalGeo.attributes.position;
    for (let k = 0; k < ptPos.count; k++) {
      const px = ptPos.getX(k);
      const py = ptPos.getY(k);
      const t = Math.max(0, Math.min(1, py / 0.23));
      // Taper base and tip into graceful pointed teardrop petal
      const widthScale = Math.sin(Math.pow(t, 0.72) * Math.PI);
      ptPos.setX(k, px * (0.35 + widthScale * 0.95));
      // Cupped dish curvature + gentle upward inward curl
      const cup = (px * px) * 3.8 + Math.pow(t, 1.8) * 0.055;
      ptPos.setZ(k, cup);
    }
    petalGeo.computeVertexNormals();

    const seedPodGeo = trackGeo(new THREE.CylinderGeometry(0.058, 0.032, 0.065, 10));
    const stamenGeo = trackGeo(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 4));

    const createLotusFlower = (petalMat: THREE.Material) => {
      const lotus = new THREE.Group();

      // Golden central seed receptacle pod & stamen crown
      const pod = new THREE.Mesh(seedPodGeo, mats.brushedGold);
      pod.position.y = 0.045;
      lotus.add(pod);

      for (let st = 0; st < 10; st++) {
        const a = (st / 10) * Math.PI * 2;
        const stamen = new THREE.Mesh(stamenGeo, mats.brushedGold);
        stamen.position.set(Math.cos(a) * 0.065, 0.058, Math.sin(a) * 0.065);
        stamen.rotation.z = -Math.cos(a) * 0.35;
        stamen.rotation.x = Math.sin(a) * 0.35;
        lotus.add(stamen);
      }

      // 3 concentric tiers of cupped lotus petals (outer spreading, mid cupped, inner upright)
      const tiers = [
        { count: 8, radius: 0.07, tilt: 1.08, scale: 1.05, rotOff: 0.0 },
        { count: 7, radius: 0.058, tilt: 0.72, scale: 0.92, rotOff: 0.35 },
        { count: 5, radius: 0.042, tilt: 0.36, scale: 0.76, rotOff: 0.68 },
      ];
      for (const tier of tiers) {
        for (let p = 0; p < tier.count; p++) {
          const ang = (p / tier.count) * Math.PI * 2 + tier.rotOff;
          const petalPivot = new THREE.Group();
          petalPivot.rotation.y = ang;
          const petal = new THREE.Mesh(petalGeo, petalMat);
          petal.position.set(0, 0.015, tier.radius);
          petal.rotation.x = tier.tilt;
          petal.scale.setScalar(tier.scale);
          petalPivot.add(petal);
          lotus.add(petalPivot);
        }
      }

      return lotus;
    };

    const padOffsets: Array<[number, number, number]> = [
      [5.8, 2.2, 1.0],
      [5.0, 2.9, 0.78],
      [6.4, 1.6, 0.88],
      [-5.6, 3.2, 0.94],
      [-4.9, 3.8, 0.74],
      [3.6, -3.4, 0.84],
    ];
    for (let i = 0; i < padOffsets.length; i++) {
      const [ox, oz, sc] = padOffsets[i];
      const px = spec.pondCenter.x + ox;
      const pz = spec.pondCenter.z + oz;
      const pad = new THREE.Mesh(padGeo, mats.lilyPad);
      pad.position.set(px, WATER_LEVEL + 0.025, pz);
      pad.rotation.y = i * 1.4;
      pad.scale.setScalar(sc);
      group.add(pad);

      if ((style === 'mughal' && i % 2 === 0) || (style !== 'mughal' && i % 3 === 0)) {
        const flowerMat =
          style === 'victorian' && i === 0 ? mats.swanWhite : mats.lotusPetal;
        const lotus = createLotusFlower(flowerMat);
        lotus.position.set(px, WATER_LEVEL + 0.032, pz);
        lotus.scale.setScalar(0.95 + sc * 0.25);
        group.add(lotus);
      }
    }
  }

  return {
    group,
    skyUniforms: sky.uniforms,
    lanternLights,
    dispose: () => {
      sky.dispose();
      for (const g of geometries) g.dispose();
    },
  };
}
