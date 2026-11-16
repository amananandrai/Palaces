import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SceneMaterialLibrary } from './materials';
import {
  WATER_LEVEL,
  distanceToStream,
  getBiomeWaterSpec,
  groundHeightAt,
  pondSignedFactor,
} from './terrainMath';
import { PETAL_COUNTS, type PalaceStyle, type SakuraDensity } from './types';

export interface NatureBuildResult {
  group: THREE.Group;
  update: (elapsed: number, delta: number, density: SakuraDensity, windStrength: number) => void;
  dispose: () => void;
}

// Pre-allocated scratch math helpers — zero GC inside the 60fps animation loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface FloatingParticle {
  x: number;
  y: number;
  z: number;
  vy: number;
  phase: number;
  spinSpeedX: number;
  spinSpeedY: number;
  swayAmp: number;
  scale: number;
}

interface KoiActor {
  group: THREE.Group;
  tailPivot: THREE.Group;
  leftFin: THREE.Mesh;
  rightFin: THREE.Mesh;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  depthY: number;
  speed: number;
  phase: number;
  dir: number;
}

interface SwanActor {
  group: THREE.Group;
  neckPivot: THREE.Group;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  speed: number;
  phase: number;
  dir: number;
}

interface CamelActor {
  group: THREE.Group;
  neckGroup: THREE.Group;
  legs: THREE.Group[];
  tail: THREE.Mesh;
  walkCenter?: { x: number; z: number; rx: number; rz: number };
  speed: number;
  phase: number;
  isWalking: boolean;
}

interface BobbingBoat {
  group: THREE.Group;
  baseY: number;
  phase: number;
}

interface FountainJet {
  group: THREE.Group;
  drops: THREE.Mesh[];
  baseY: number;
  maxH: number;
}

function createCrossedClusterGeometry(size = 0.95): THREE.BufferGeometry {
  const makeCurvedCard = (rotY: number, tiltX: number) => {
    const g = new THREE.PlaneGeometry(size, size, 2, 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, -(x * x + y * y) * 0.28);
    }
    g.computeVertexNormals();
    g.rotateX(tiltX);
    g.rotateY(rotY);
    return g;
  };

  const c1 = makeCurvedCard(0, 0.18);
  const c2 = makeCurvedCard(Math.PI / 2, -0.18);
  const c3 = makeCurvedCard(Math.PI / 4, Math.PI / 2 - 0.25);
  const merged = mergeGeometries([c1, c2, c3]);
  c1.dispose();
  c2.dispose();
  c3.dispose();
  return merged;
}

function createCurvedLeafGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(0.38, 0.58, 2, 4);
  g.translate(0, 0.29, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, y / 0.58));
    const vFold = Math.abs(x) * 0.22;
    const arch = -Math.pow(t, 1.8) * 0.16;
    pos.setZ(i, vFold + arch);
  }
  g.computeVertexNormals();
  return g;
}

function createKoiActor(
  mat: THREE.MeshPhysicalMaterial,
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  scaleFactor: number,
): { group: THREE.Group; tailPivot: THREE.Group; leftFin: THREE.Mesh; rightFin: THREE.Mesh } {
  const koi = new THREE.Group();

  // Fusiform sculpted Koi body with distinct head-to-shoulder taper & tail peduncle
  const profile = [
    new THREE.Vector2(0.0, 0.37),
    new THREE.Vector2(0.044, 0.34),
    new THREE.Vector2(0.072, 0.26),
    new THREE.Vector2(0.096, 0.16),
    new THREE.Vector2(0.092, 0.04),
    new THREE.Vector2(0.068, -0.11),
    new THREE.Vector2(0.036, -0.24),
    new THREE.Vector2(0.022, -0.31),
    new THREE.Vector2(0.0, -0.32),
  ];
  const bodyGeo = trackGeo(new THREE.LatheGeometry(profile, 16));
  bodyGeo.rotateX(Math.PI / 2);
  bodyGeo.scale(0.84, 1.0, 1.0);
  const body = new THREE.Mesh(bodyGeo, mat);
  koi.add(body);

  // Subtle gill operculum collar arcs behind the eyes
  const gillGeo = trackGeo(new THREE.TorusGeometry(0.064, 0.008, 6, 12, Math.PI * 0.72));
  for (const side of [-1, 1]) {
    const gill = new THREE.Mesh(gillGeo, mats.brushedGold);
    gill.position.set(side * 0.022, 0.0, 0.21);
    gill.rotation.y = side * 0.55;
    gill.rotation.z = Math.PI * 0.15;
    koi.add(gill);
  }

  // Glossy dark eyes with pale gold sclera rings
  const scleraGeo = trackGeo(new THREE.SphereGeometry(0.017, 8, 6));
  const pupilGeo = trackGeo(new THREE.SphereGeometry(0.011, 8, 6));
  for (const side of [-1, 1]) {
    const sclera = new THREE.Mesh(scleraGeo, mats.brushedGold);
    sclera.position.set(side * 0.046, 0.026, 0.275);
    koi.add(sclera);

    const pupil = new THREE.Mesh(pupilGeo, mats.wroughtIron);
    pupil.position.set(side * 0.053, 0.028, 0.28);
    koi.add(pupil);
  }

  // Twin delicate Koi whisker barbels (hige) curving from mouth corners
  const barbelGeo = trackGeo(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.028, -0.014, 0.025),
        new THREE.Vector3(0.052, -0.026, -0.01),
      ]),
      6,
      0.0045,
      5,
      false,
    ),
  );
  for (const side of [-1, 1]) {
    const barbel = new THREE.Mesh(barbelGeo, mats.brushedGold);
    barbel.position.set(side * 0.026, -0.012, 0.34);
    barbel.scale.x = side;
    koi.add(barbel);
  }

  // Volumetric scalloped dorsal ridge fin (ExtrudeGeometry)
  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(0, 0);
  dorsalShape.quadraticCurveTo(-0.04, 0.085, -0.1, 0.075);
  dorsalShape.quadraticCurveTo(-0.18, 0.068, -0.23, 0.045);
  dorsalShape.lineTo(-0.21, 0);
  dorsalShape.closePath();
  const dorsalGeo = trackGeo(
    new THREE.ExtrudeGeometry(dorsalShape, {
      depth: 0.01,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 1,
    }),
  );
  dorsalGeo.translate(0, 0, -0.005);
  dorsalGeo.rotateY(Math.PI / 2);
  const dorsal = new THREE.Mesh(dorsalGeo, mat);
  dorsal.position.set(0, 0.078, 0.06);
  koi.add(dorsal);

  // Volumetric ribbed pectoral fan fins
  const pecShape = new THREE.Shape();
  pecShape.moveTo(0, 0);
  pecShape.quadraticCurveTo(0.08, 0.045, 0.155, -0.04);
  pecShape.quadraticCurveTo(0.11, -0.1, 0.02, -0.05);
  pecShape.closePath();
  const pecGeo = trackGeo(
    new THREE.ExtrudeGeometry(pecShape, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 1,
    }),
  );
  pecGeo.translate(0, 0, -0.004);
  pecGeo.rotateX(-Math.PI / 2);

  const leftFin = new THREE.Mesh(pecGeo, mat);
  leftFin.position.set(0.056, -0.024, 0.14);
  leftFin.rotation.z = -0.18;
  koi.add(leftFin);

  const rightFin = new THREE.Mesh(pecGeo, mat);
  rightFin.position.set(-0.056, -0.024, 0.14);
  rightFin.scale.x = -1;
  rightFin.rotation.z = 0.18;
  koi.add(rightFin);

  // Pair of ventral pelvic fins + rear anal fin underneath belly
  const pelvicGeo = trackGeo(new THREE.ConeGeometry(0.026, 0.08, 5));
  pelvicGeo.rotateX(Math.PI * 0.68);
  for (const side of [-1, 1]) {
    const pel = new THREE.Mesh(pelvicGeo, mat);
    pel.position.set(side * 0.036, -0.068, -0.02);
    pel.rotation.z = -side * 0.35;
    koi.add(pel);
  }
  const analFin = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.02, 0.075, 5)), mat);
  analFin.rotation.x = Math.PI * 0.65;
  analFin.position.set(0, -0.048, -0.18);
  koi.add(analFin);

  // Articulated caudal peduncle & flowing forked Koi tail fin
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0, -0.29);
  koi.add(tailPivot);

  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0.018);
  tailShape.quadraticCurveTo(-0.07, 0.125, -0.2, 0.145);
  tailShape.quadraticCurveTo(-0.14, 0.035, -0.115, 0.0);
  tailShape.quadraticCurveTo(-0.14, -0.035, -0.2, -0.145);
  tailShape.quadraticCurveTo(-0.07, -0.125, 0, -0.018);
  tailShape.closePath();
  const tailGeo = trackGeo(
    new THREE.ExtrudeGeometry(tailShape, {
      depth: 0.009,
      bevelEnabled: true,
      bevelThickness: 0.0025,
      bevelSize: 0.0025,
      bevelSegments: 1,
    }),
  );
  tailGeo.translate(0, 0, -0.0045);
  tailGeo.rotateY(Math.PI / 2);
  const tailMesh = new THREE.Mesh(tailGeo, mat);
  tailPivot.add(tailMesh);

  koi.scale.setScalar(scaleFactor);
  return { group: koi, tailPivot, leftFin, rightFin };
}

/**
 * Composite graceful Swan with sculpted keel breast, layered arched wing feathers,
 * fanned tail plumage, S-curved neck, eyes, loral mask, and two-part beak
 */
function createSwanActor(
  featherMat: THREE.MeshPhysicalMaterial,
  beakMat: THREE.Material,
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  isBlackSwan: boolean,
  scale = 1.0,
): { group: THREE.Group; neckPivot: THREE.Group } {
  const swan = new THREE.Group();

  // Buoyant tear-drop sculpted swan body (LatheGeometry)
  const bodyProfile = [
    new THREE.Vector2(0.0, 0.44),
    new THREE.Vector2(0.14, 0.38),
    new THREE.Vector2(0.24, 0.22),
    new THREE.Vector2(0.27, 0.02),
    new THREE.Vector2(0.22, -0.18),
    new THREE.Vector2(0.11, -0.38),
    new THREE.Vector2(0.0, -0.48),
  ];
  const bodyGeo = trackGeo(new THREE.LatheGeometry(bodyProfile, 16));
  bodyGeo.rotateX(Math.PI / 2);
  bodyGeo.scale(1.0, 0.72, 1.0);
  const body = new THREE.Mesh(bodyGeo, featherMat);
  body.position.set(0, 0.14, 0);
  body.castShadow = true;
  swan.add(body);

  // Layered folded wing plumage (3 overlapping curved feather tiers per side)
  const primaryWingGeo = trackGeo(new THREE.SphereGeometry(0.22, 10, 8));
  const featherBladeGeo = trackGeo(new THREE.ConeGeometry(0.075, 0.38, 6));
  featherBladeGeo.rotateX(-Math.PI * 0.48);
  for (const side of [-1, 1]) {
    const wingCover = new THREE.Mesh(primaryWingGeo, featherMat);
    wingCover.scale.set(0.42, 0.68, 1.38);
    wingCover.position.set(side * 0.19, 0.23, -0.02);
    wingCover.rotation.z = -side * 0.26;
    wingCover.rotation.x = 0.16;
    wingCover.castShadow = true;
    swan.add(wingCover);

    for (let f = 0; f < 3; f++) {
      const feather = new THREE.Mesh(featherBladeGeo, featherMat);
      feather.scale.set(0.65, 1.0 - f * 0.12, 0.35);
      feather.position.set(
        side * (0.2 - f * 0.028),
        0.24 + f * 0.036,
        -0.16 - f * 0.075,
      );
      feather.rotation.y = side * (0.14 - f * 0.04);
      feather.rotation.x = 0.24 + f * 0.08;
      feather.castShadow = true;
      swan.add(feather);
    }
  }

  // Fanned upturned tail feathers (3 overlapping plumes)
  const tailGeo = trackGeo(new THREE.ConeGeometry(0.085, 0.32, 6));
  for (let t = -1; t <= 1; t++) {
    const tail = new THREE.Mesh(tailGeo, featherMat);
    tail.scale.set(0.95, 1.0, 0.45);
    tail.rotation.x = -Math.PI * 0.35;
    tail.rotation.z = t * 0.22;
    tail.position.set(t * 0.045, 0.24, -0.46);
    swan.add(tail);
  }

  // Articulated S-curved neck + head + loral mask + eyes + two-part beak
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.2, 0.28);
  swan.add(neckPivot);

  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.22, 0.15),
    new THREE.Vector3(0, 0.49, 0.04),
    new THREE.Vector3(0, 0.68, 0.16),
  ]);
  const neck = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(neckCurve, 14, 0.056, 10, false)),
    featherMat,
  );
  neck.castShadow = true;
  neckPivot.add(neck);

  const head = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.084, 12, 10)),
    featherMat,
  );
  head.scale.set(0.84, 0.86, 1.24);
  head.position.set(0, 0.69, 0.19);
  neckPivot.add(head);

  // Dark glossy bead eyes
  const eyeGeo = trackGeo(new THREE.SphereGeometry(0.015, 8, 6));
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, mats.wroughtIron);
    eye.position.set(side * 0.062, 0.705, 0.23);
    neckPivot.add(eye);
  }

  // Basal knob / loral mask between eye and bill
  const loralKnob = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.032, 8, 6)),
    mats.wroughtIron,
  );
  loralKnob.scale.set(1.15, 0.85, 1.1);
  loralKnob.position.set(0, 0.695, 0.268);
  neckPivot.add(loralKnob);

  // Upper & lower sculpted mandibles + dark beak nail tip (or pale band on Black Swan)
  const upperBill = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.036, 0.135, 8)),
    beakMat,
  );
  upperBill.scale.set(1.0, 1.0, 0.62);
  upperBill.rotation.x = Math.PI * 0.54;
  upperBill.position.set(0, 0.675, 0.32);
  neckPivot.add(upperBill);

  const lowerBill = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.028, 0.115, 8)),
    beakMat,
  );
  lowerBill.scale.set(0.95, 1.0, 0.45);
  lowerBill.rotation.x = Math.PI * 0.57;
  lowerBill.position.set(0, 0.658, 0.312);
  neckPivot.add(lowerBill);

  if (isBlackSwan) {
    // Characteristic pale white sub-terminal ring on Black Swan bill
    const ringBand = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.02, 0.024, 0.022, 8)),
      mats.swanWhite,
    );
    ringBand.scale.set(1.0, 1.0, 0.6);
    ringBand.rotation.x = Math.PI * 0.54;
    ringBand.position.set(0, 0.668, 0.355);
    neckPivot.add(ringBand);
  }

  const nailTip = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.013, 6, 6)),
    mats.wroughtIron,
  );
  nailTip.position.set(0, 0.662, 0.386);
  neckPivot.add(nailTip);

  swan.scale.setScalar(scale);
  return { group: swan, neckPivot };
}

/**
 * Composite wooden rowboat / skiff built from curved hull, gunwale rails, thwarts & oars
 */
function createWoodenRowboat(
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  hasCanopyBundle = false,
): THREE.Group {
  const boat = new THREE.Group();

  // Tapered boat hull constructed from extruded almond/canoe shape
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 1.35);
  hullShape.quadraticCurveTo(0.62, 0.45, 0.56, -0.85);
  hullShape.lineTo(0.32, -1.25);
  hullShape.lineTo(-0.32, -1.25);
  hullShape.lineTo(-0.56, -0.85);
  hullShape.quadraticCurveTo(-0.62, 0.45, 0, 1.35);

  const hullGeo = trackGeo(
    new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.38,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 2,
    }),
  );
  hullGeo.rotateX(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, mats.yakisugiTimber);
  hull.position.y = 0.24;
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  // Inner deck floor
  const floor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.74, 0.05, 1.8)),
    mats.hinokiDeck,
  );
  floor.position.set(0, 0.24, -0.05);
  boat.add(floor);

  // Two wooden rowing benches (thwarts)
  const benchGeo = trackGeo(new THREE.BoxGeometry(0.98, 0.06, 0.24));
  for (const bz of [-0.45, 0.28]) {
    const bench = new THREE.Mesh(benchGeo, mats.hinokiDeck);
    bench.position.set(0, 0.34, bz);
    bench.castShadow = true;
    boat.add(bench);
  }

  // Pair of wooden oars resting along gunwales
  const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.025, 1.75, 6));
  shaftGeo.rotateX(Math.PI / 2);
  const bladeGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.025, 0.42));

  for (const side of [-1, 1]) {
    const oar = new THREE.Group();
    oar.position.set(side * 0.48, 0.38, -0.05);
    oar.rotation.y = side * 0.14;
    oar.rotation.x = 0.06;

    const shaft = new THREE.Mesh(shaftGeo, mats.hinokiDeck);
    oar.add(shaft);

    const blade = new THREE.Mesh(bladeGeo, mats.hinokiDeck);
    blade.position.z = -0.82;
    oar.add(blade);
    boat.add(oar);
  }

  if (hasCanopyBundle) {
    // Persian rolled woven fabric bundle & brass lantern at bow
    const bundle = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.65, 10)),
      mats.persianCarpet,
    );
    bundle.rotation.z = Math.PI / 2;
    bundle.position.set(0, 0.42, 0.48);
    boat.add(bundle);
  }

  return boat;
}

/**
 * Japanese Bamboo Shishi-odoshi (rocking water clacker beside stone water basin)
 */
function createShishiOdoshi(
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): { group: THREE.Group; rockerPivot: THREE.Group } {
  const shishi = new THREE.Group();

  // Carved granite catch basin
  const basin = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.42, 0.34, 0.28, 10)),
    mats.graniteStone,
  );
  basin.position.set(0.35, 0.14, 0);
  basin.castShadow = true;
  basin.receiveShadow = true;
  shishi.add(basin);

  const waterPool = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.32, 12)),
    mats.waterSurface,
  );
  waterPool.rotation.x = -Math.PI / 2;
  waterPool.position.set(0.35, 0.29, 0);
  shishi.add(waterPool);

  // Twin forked bamboo upright supports + crossbar
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.048, 0.72, 8));
  for (const pz of [-0.18, 0.18]) {
    const post = new THREE.Mesh(postGeo, mats.bambooGreen);
    post.position.set(0, 0.36, pz);
    post.castShadow = true;
    shishi.add(post);
  }

  // Pivoted rocking bamboo spout tube
  const rockerPivot = new THREE.Group();
  rockerPivot.position.set(0, 0.58, 0);
  shishi.add(rockerPivot);

  const tube = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.058, 0.058, 0.92, 10)),
    mats.bambooGreen,
  );
  tube.rotation.z = Math.PI / 2;
  tube.position.x = 0.06;
  tube.castShadow = true;
  rockerPivot.add(tube);

  // Tall bamboo water feed pipe behind rocker
  const feedPost = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.045, 0.05, 0.96, 8)),
    mats.bambooGreen,
  );
  feedPost.position.set(-0.46, 0.48, 0);
  feedPost.castShadow = true;
  shishi.add(feedPost);

  const spout = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.025, 0.03, 0.34, 8)),
    mats.bambooGreen,
  );
  spout.rotation.z = Math.PI / 2.4;
  spout.position.set(-0.34, 0.88, 0);
  shishi.add(spout);

  return { group: shishi, rockerPivot };
}

/**
 * Multi-part desert dromedary camel with sculpted anatomical torso & chest brisket,
 * contoured hump, shaggy throat mane, fringed Persian saddle cloth & brass bell,
 * Roman-nosed muzzle/brow/halter, articulated knee-joint legs with splayed footpads, and tufted tail.
 */
function createCamelMesh(
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  scale = 1.0,
): { group: THREE.Group; neckGroup: THREE.Group; legs: THREE.Group[]; tail: THREE.Mesh } {
  const camel = new THREE.Group();

  const sh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.7, 1.6)), mats.contactShadowMat);
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.03;
  camel.add(sh);

  // Sculpted anatomical barrel torso (deep chest brisket tapering to tucked flanks)
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.86),
    new THREE.Vector2(0.32, 0.72),
    new THREE.Vector2(0.46, 0.42),
    new THREE.Vector2(0.49, 0.04),
    new THREE.Vector2(0.42, -0.36),
    new THREE.Vector2(0.34, -0.68),
    new THREE.Vector2(0.0, -0.82),
  ];
  const torsoGeo = trackGeo(new THREE.LatheGeometry(torsoProfile, 16));
  torsoGeo.rotateX(Math.PI / 2);
  torsoGeo.scale(0.84, 1.05, 1.0);
  const torso = new THREE.Mesh(torsoGeo, mats.camelCoat);
  torso.position.set(0, 1.34, 0);
  torso.castShadow = true;
  camel.add(torso);

  // Deep chest brisket & wooly dark chest ruff
  const brisket = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.36, 12, 10)),
    mats.camelCoat,
  );
  brisket.scale.set(0.82, 1.08, 1.05);
  brisket.position.set(0, 1.24, 0.56);
  brisket.castShadow = true;
  camel.add(brisket);

  const chestTuft = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.22, 0.34, 8)),
    mats.camelDarkFur,
  );
  chestTuft.rotation.x = Math.PI;
  chestTuft.position.set(0, 0.94, 0.68);
  camel.add(chestTuft);

  // Contoured single dromedary hump blending smoothly into back
  const hump = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.42, 14, 10)),
    mats.camelCoat,
  );
  hump.scale.set(0.78, 1.18, 1.05);
  hump.position.set(0, 1.84, -0.06);
  hump.castShadow = true;
  camel.add(hump);

  // Shaggy hump crown tuft
  const humpMane = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.24, 10, 8)),
    mats.camelDarkFur,
  );
  humpMane.scale.set(0.68, 0.85, 1.15);
  humpMane.position.set(0, 2.22, -0.06);
  camel.add(humpMane);

  // Persian woven saddle blanket + girth strap + hanging brass camel bell
  const blanket = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.47, 0.54, 0.78, 14, 1, false, -Math.PI * 0.65, Math.PI * 1.3)),
    mats.saddleCloth,
  );
  blanket.rotation.z = Math.PI / 2;
  blanket.rotation.y = Math.PI / 2;
  blanket.position.set(0, 1.68, -0.06);
  camel.add(blanket);

  const girthStrap = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.45, 0.032, 6, 18)),
    mats.vermilionLacquer,
  );
  girthStrap.scale.set(0.84, 1.08, 1.0);
  girthStrap.position.set(0, 1.36, 0.14);
  camel.add(girthStrap);

  const bell = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.065, 0.11, 8)),
    mats.brushedGold,
  );
  bell.position.set(0, 0.84, 0.24);
  camel.add(bell);

  // S-curved neck + shaggy underside mane + sculpted Roman-nosed head + halter
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 1.36, 0.64);
  camel.add(neckGroup);

  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -0.18, 0.36),
    new THREE.Vector3(0, 0.38, 0.68),
    new THREE.Vector3(0, 0.78, 0.72),
  ]);
  const neckMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(neckCurve, 14, 0.145, 10, false)),
    mats.camelCoat,
  );
  neckMesh.castShadow = true;
  neckGroup.add(neckMesh);

  // Shaggy dark throat mane tufts curving under the U-bend of the neck
  const maneGeo = trackGeo(new THREE.SphereGeometry(0.11, 8, 6));
  for (let m = 0; m < 4; m++) {
    const mt = 0.22 + m * 0.18;
    const pt = neckCurve.getPoint(mt);
    const mane = new THREE.Mesh(maneGeo, mats.camelDarkFur);
    mane.scale.set(0.75, 1.25, 1.15);
    mane.position.set(0, pt.y - 0.11, pt.z + 0.05);
    neckGroup.add(mane);
  }

  // Cranium + prominent brow ridges + Roman-nosed tapered muzzle + split lower jaw
  const cranium = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.175, 12, 10)),
    mats.camelCoat,
  );
  cranium.scale.set(0.84, 0.88, 1.15);
  cranium.position.set(0, 0.81, 0.78);
  cranium.castShadow = true;
  neckGroup.add(cranium);

  const snout = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.092, 0.138, 0.3, 10)),
    mats.camelCoat,
  );
  snout.scale.set(0.82, 1.0, 0.88);
  snout.rotation.x = Math.PI * 0.56;
  snout.position.set(0, 0.75, 0.98);
  snout.castShadow = true;
  neckGroup.add(snout);

  const upperLip = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.088, 8, 6)),
    mats.camelDarkFur,
  );
  upperLip.scale.set(0.85, 0.72, 1.1);
  upperLip.position.set(0, 0.73, 1.12);
  neckGroup.add(upperLip);

  const lowerJaw = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.072, 8, 6)),
    mats.camelCoat,
  );
  lowerJaw.scale.set(0.75, 0.55, 1.35);
  lowerJaw.position.set(0, 0.67, 1.01);
  neckGroup.add(lowerJaw);

  // Heavy desert brow ridges & glossy dark camel eyes
  const browGeo = trackGeo(new THREE.BoxGeometry(0.065, 0.032, 0.085));
  const eyeGeo = trackGeo(new THREE.SphereGeometry(0.025, 8, 6));
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(browGeo, mats.camelCoat);
    brow.position.set(side * 0.115, 0.86, 0.84);
    brow.rotation.z = -side * 0.22;
    neckGroup.add(brow);

    const eye = new THREE.Mesh(eyeGeo, mats.wroughtIron);
    eye.position.set(side * 0.125, 0.825, 0.845);
    neckGroup.add(eye);
  }

  // Rounded furry camel ears
  const earGeo = trackGeo(new THREE.SphereGeometry(0.048, 8, 6));
  for (const ex of [-0.115, 0.115]) {
    const ear = new THREE.Mesh(earGeo, mats.camelDarkFur);
    ear.scale.set(0.65, 1.45, 0.6);
    ear.position.set(ex, 0.96, 0.71);
    ear.rotation.z = -Math.sign(ex) * 0.35;
    neckGroup.add(ear);
  }

  // Crimson woven headstall halter strap & noseband
  const noseBand = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.11, 0.015, 6, 14)),
    mats.vermilionLacquer,
  );
  noseBand.scale.set(0.84, 1.0, 1.0);
  noseBand.rotation.x = 0.2;
  noseBand.position.set(0, 0.745, 0.97);
  neckGroup.add(noseBand);

  const cheekBand = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.16, 0.014, 6, 14)),
    mats.vermilionLacquer,
  );
  cheekBand.rotation.y = Math.PI / 2;
  cheekBand.position.set(0, 0.79, 0.8);
  neckGroup.add(cheekBand);

  // Articulated two-segment camel legs (muscular thigh/forearm + knee joint + cannon + splayed footpad)
  const legs: THREE.Group[] = [];
  const upperLegGeo = trackGeo(new THREE.CylinderGeometry(0.115, 0.072, 0.58, 9));
  const kneeGeo = trackGeo(new THREE.SphereGeometry(0.082, 8, 6));
  const lowerLegGeo = trackGeo(new THREE.CylinderGeometry(0.062, 0.052, 0.56, 8));
  const footPadGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.125, 0.1, 10));
  const legCoords: Array<[number, number]> = [
    [-0.23, 0.45],
    [0.23, 0.45],
    [-0.23, -0.46],
    [0.23, -0.46],
  ];
  for (const [lx, lz] of legCoords) {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, 1.14, lz);

    const upper = new THREE.Mesh(upperLegGeo, mats.camelCoat);
    upper.position.y = -0.27;
    upper.castShadow = true;
    legPivot.add(upper);

    const knee = new THREE.Mesh(kneeGeo, mats.camelDarkFur);
    knee.position.set(0, -0.56, lz > 0 ? 0.025 : -0.025);
    legPivot.add(knee);

    const lower = new THREE.Mesh(lowerLegGeo, mats.camelCoat);
    lower.position.y = -0.84;
    lower.castShadow = true;
    legPivot.add(lower);

    const foot = new THREE.Mesh(footPadGeo, mats.camelDarkFur);
    foot.scale.set(0.95, 1.0, 1.25);
    foot.position.set(0, -1.1, 0.02);
    legPivot.add(foot);

    camel.add(legPivot);
    legs.push(legPivot);
  }

  // Tufted camel tail
  const tail = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.032, 0.022, 0.56, 6)),
    mats.camelCoat,
  );
  tail.position.set(0, 1.15, -0.78);
  tail.rotation.x = 0.24;

  const tailTuft = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.068, 0.2, 7)),
    mats.camelDarkFur,
  );
  tailTuft.position.set(0, -0.32, 0);
  tail.add(tailTuft);
  camel.add(tail);

  camel.scale.setScalar(scale);
  return { group: camel, neckGroup, legs, tail };
}

/**
 * Shoreline reeds & cattail clusters anchored along water edge per biome
 */
function createShorelineReeds(
  style: PalaceStyle,
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  rand: () => number,
): THREE.Group {
  const reedGroup = new THREE.Group();
  if (style === 'mughal') return reedGroup; // Mughal has formal sandstone/marble coping & lotus pads

  const spec = getBiomeWaterSpec(style);
  const clumps: Array<[number, number]> = [];

  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2 + 0.18;
    const rx = spec.pondCenter.x + Math.cos(ang) * (spec.pondRadiusX * 0.96);
    const rz = spec.pondCenter.z + Math.sin(ang) * (spec.pondRadiusZ * 0.96);
    if (Math.hypot(rx - spec.bridgePos.x, rz - spec.bridgePos.z) < 3.5) continue;
    if (style === 'victorian' && rx > 8.5 && rz < 9.5) continue; // Keep dock clear
    if (style === 'persian' && rx > 6.2 && rz > 11.0) continue; // Keep divan clear
    if (i % 2 === 0 || style === 'persian') clumps.push([rx, rz]);
  }

  if (clumps.length === 0) return reedGroup;

  const bladeGeo = trackGeo(new THREE.PlaneGeometry(0.08, 1.05, 1, 4));
  bladeGeo.translate(0, 0.525, 0);
  const bPos = bladeGeo.attributes.position;
  for (let i = 0; i < bPos.count; i++) {
    const y = bPos.getY(i);
    const t = Math.max(0, Math.min(1, y / 1.05));
    bPos.setX(i, bPos.getX(i) * (1 - t * 0.85));
    bPos.setZ(i, Math.pow(t, 1.8) * 0.22);
  }
  bladeGeo.computeVertexNormals();

  const bladesPerClump = 10;
  const bladeInst = new THREE.InstancedMesh(
    bladeGeo,
    mats.reedCattail,
    clumps.length * bladesPerClump,
  );
  bladeInst.castShadow = true;

  const reedTone =
    style === 'russian'
      ? new THREE.Color(0xb8a378) // Frost-dried golden winter marsh reeds
      : style === 'persian'
        ? new THREE.Color(0x528f48) // Bright desert oasis papyrus
        : new THREE.Color(0x5b823f);
  const cTmp = new THREE.Color();

  let bIdx = 0;
  const spikeTransforms: Array<{ x: number; y: number; z: number; tilt: number; rot: number }> = [];

  for (const [cx, cz] of clumps) {
    const cy = Math.max(WATER_LEVEL - 0.14, groundHeightAt(cx, cz, style));
    for (let k = 0; k < bladesPerClump; k++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 0.42;
      const bx = cx + Math.cos(a) * r;
      const bz = cz + Math.sin(a) * r;
      _vec3A.set(bx, cy, bz);
      _euler.set(0.1 + rand() * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.18);
      _quat.setFromEuler(_euler);
      _scale.setScalar(0.75 + rand() * 0.6);
      _mat4.compose(_vec3A, _quat, _scale);
      bladeInst.setMatrixAt(bIdx, _mat4);
      cTmp.copy(reedTone).multiplyScalar(0.85 + rand() * 0.3);
      bladeInst.setColorAt(bIdx, cTmp);
      bIdx++;

      if (k < 2 && style !== 'persian') {
        spikeTransforms.push({
          x: bx,
          y: cy + 0.82,
          z: bz,
          tilt: (rand() - 0.5) * 0.14,
          rot: rand() * Math.PI * 2,
        });
      }
    }
  }
  bladeInst.instanceMatrix.needsUpdate = true;
  if (bladeInst.instanceColor) bladeInst.instanceColor.needsUpdate = true;
  bladeInst.computeBoundingSphere();
  reedGroup.add(bladeInst);

  if (spikeTransforms.length > 0) {
    const spikeGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.26, 7));
    const spikeInst = new THREE.InstancedMesh(spikeGeo, mats.cattailHead, spikeTransforms.length);
    spikeTransforms.forEach((sp, idx) => {
      _vec3A.set(sp.x, sp.y, sp.z);
      _euler.set(sp.tilt, sp.rot, 0);
      _quat.setFromEuler(_euler);
      _scale.setScalar(1);
      _mat4.compose(_vec3A, _quat, _scale);
      spikeInst.setMatrixAt(idx, _mat4);
    });
    spikeInst.instanceMatrix.needsUpdate = true;
    spikeInst.computeBoundingSphere();
    reedGroup.add(spikeInst);
  }

  return reedGroup;
}

export function buildSakuraAndKoi(
  style: PalaceStyle,
  mats: SceneMaterialLibrary,
): NatureBuildResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const rand = seeded(2026);
  const spec = getBiomeWaterSpec(style);

  const rawTreeSpecs: Array<{ x: number; z: number; scale: number; rot: number }> = [
    { x: -16.5, z: 14.8, scale: 1.12, rot: 0.4 },
    { x: -17.0, z: 1.5, scale: 1.0, rot: 1.8 },
    { x: -6.2, z: -12.0, scale: 1.05, rot: 2.5 },
    { x: 16.5, z: 4.5, scale: 1.18, rot: 0.9 },
    { x: 18.8, z: 13.8, scale: 0.96, rot: 3.7 },
    { x: -22.5, z: 6.2, scale: 1.08, rot: 4.1 },
    { x: 24.5, z: -4.2, scale: 1.14, rot: 5.2 },
    { x: -24.5, z: -15.5, scale: 1.25, rot: 1.2 },
    { x: 17.0, z: -22.5, scale: 1.2, rot: 2.9 },
    { x: -13.5, z: -28.0, scale: 1.28, rot: 0.3 },
    { x: 0.5, z: -31.5, scale: 1.22, rot: 4.6 },
    { x: -9.5, z: 19.6, scale: 0.92, rot: 2.1 },
    { x: 13.8, z: 19.4, scale: 0.95, rot: 5.5 },
    { x: -3.2, z: -3.8, scale: 0.88, rot: 1.1 },
  ];

  // Keep every tree strictly out of water basins, canals, and bridge landings
  const treeSpecs = rawTreeSpecs.filter(
    (s) =>
      pondSignedFactor(s.x, s.z, style) >= 1.22 &&
      distanceToStream(s.x, s.z, style).dist >= 3.0 &&
      Math.hypot(s.x - spec.bridgePos.x, s.z - spec.bridgePos.z) >= 4.4,
  );

  // =========================================================================
  // 1. BIOME-SPECIFIC TREES
  // =========================================================================
  if (style === 'japanese' || style === 'victorian') {
    const isSakura = style === 'japanese';
    const foliageAnchors: Array<{ pos: THREE.Vector3; radius: number }> = [];

    for (const tSpec of treeSpecs) {
      const ty = groundHeightAt(tSpec.x, tSpec.z, style);
      const tree = new THREE.Group();
      tree.position.set(tSpec.x, ty, tSpec.z);
      tree.rotation.y = tSpec.rot;
      tree.scale.setScalar(tSpec.scale);
      group.add(tree);

      const sh = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(7.2, 7.2)),
        mats.contactShadowMat,
      );
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.04;
      tree.add(sh);

      const barkMat = isSakura ? mats.sakuraBark : mats.yakisugiTimber;

      const root = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.28, 0.52, 0.58, 9)),
        barkMat,
      );
      root.position.y = 0.25;
      root.castShadow = true;
      tree.add(root);

      for (let r = 0; r < 3; r++) {
        const ra = (r / 3) * Math.PI * 2 + rand() * 0.5;
        const rootSpurCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(Math.cos(ra) * 0.16, 0.45, Math.sin(ra) * 0.16),
          new THREE.Vector3(Math.cos(ra) * 0.48, 0.14, Math.sin(ra) * 0.48),
          new THREE.Vector3(Math.cos(ra) * 0.85, -0.02, Math.sin(ra) * 0.85),
        ]);
        const spur = new THREE.Mesh(
          trackGeo(new THREE.TubeGeometry(rootSpurCurve, 6, 0.1, 6, false)),
          barkMat,
        );
        spur.castShadow = true;
        tree.add(spur);
      }

      const leanX = (rand() - 0.5) * 1.15;
      const leanZ = (rand() - 0.5) * 1.15;
      const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(leanX * 0.35, 1.3, leanZ * 0.35),
        new THREE.Vector3(leanX * 0.8, 2.7, leanZ * 0.8),
        new THREE.Vector3(leanX, 3.85, leanZ),
      ]);
      const trunk = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(trunkCurve, 14, 0.25, 8, false)),
        barkMat,
      );
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      tree.add(trunk);

      tree.updateMatrixWorld(true);

      const branchCount = 5;
      for (let b = 0; b < branchCount; b++) {
        const ang = (b / branchCount) * Math.PI * 2 + rand() * 0.42;
        const reach = 2.0 + rand() * 1.15;
        const endY = 4.1 + rand() * 1.3;
        const startPt = trunkCurve.getPoint(0.58 + (b % 3) * 0.14);
        const midPt = new THREE.Vector3(
          startPt.x + Math.cos(ang) * reach * 0.52,
          startPt.y + 0.82,
          startPt.z + Math.sin(ang) * reach * 0.52,
        );
        const tipPt = new THREE.Vector3(
          startPt.x + Math.cos(ang) * reach,
          endY,
          startPt.z + Math.sin(ang) * reach,
        );

        const brCurve = new THREE.CatmullRomCurve3([startPt, midPt, tipPt]);
        const br = new THREE.Mesh(
          trackGeo(new THREE.TubeGeometry(brCurve, 10, 0.105, 6, false)),
          barkMat,
        );
        br.castShadow = true;
        tree.add(br);

        for (let tw = 0; tw < 2; tw++) {
          const twigOrigin = brCurve.getPoint(0.55 + tw * 0.28);
          const twigAng = ang + (tw === 0 ? 0.52 : -0.52) + (rand() - 0.5) * 0.25;
          const twigLen = 1.05 + rand() * 0.55;
          const twigEnd = new THREE.Vector3(
            twigOrigin.x + Math.cos(twigAng) * twigLen,
            twigOrigin.y + 0.45 + rand() * 0.5,
            twigOrigin.z + Math.sin(twigAng) * twigLen,
          );
          const twigCurve = new THREE.CatmullRomCurve3([
            twigOrigin,
            twigOrigin.clone().lerp(twigEnd, 0.5).add(new THREE.Vector3(0, 0.16, 0)),
            twigEnd,
          ]);
          const twigMesh = new THREE.Mesh(
            trackGeo(new THREE.TubeGeometry(twigCurve, 6, 0.048, 5, false)),
            barkMat,
          );
          twigMesh.castShadow = true;
          tree.add(twigMesh);

          foliageAnchors.push({
            pos: twigEnd.clone().applyMatrix4(tree.matrixWorld),
            radius: 1.18 * tSpec.scale,
          });
        }

        foliageAnchors.push({
          pos: tipPt.clone().applyMatrix4(tree.matrixWorld),
          radius: 1.34 * tSpec.scale,
        });
      }

      foliageAnchors.push({
        pos: new THREE.Vector3(leanX, 4.95, leanZ).applyMatrix4(tree.matrixWorld),
        radius: 1.6 * tSpec.scale,
      });
    }

    if (isSakura) {
      const sprigsPerAnchor = 10;
      const blossomGeo = trackGeo(createCrossedClusterGeometry(0.95));
      const blossomInst = new THREE.InstancedMesh(
        blossomGeo,
        mats.sakuraBlossom,
        foliageAnchors.length * sprigsPerAnchor,
      );
      blossomInst.castShadow = true;
      blossomInst.receiveShadow = true;

      const leavesPerAnchor = 11;
      const leafGeo = trackGeo(createCurvedLeafGeometry());
      const leafInst = new THREE.InstancedMesh(
        leafGeo,
        mats.sakuraLeaf,
        foliageAnchors.length * leavesPerAnchor,
      );
      leafInst.castShadow = true;
      leafInst.receiveShadow = true;

      const blossomPalette = [
        new THREE.Color(0xffffff),
        new THREE.Color(0xffdae7),
        new THREE.Color(0xffc2d7),
        new THREE.Color(0xfff1f6),
      ];
      const leafPalette = [
        new THREE.Color(0xdcf0c0),
        new THREE.Color(0xc5e4a5),
        new THREE.Color(0xe6d6b0),
        new THREE.Color(0xb2d896),
      ];
      const colorTmp = new THREE.Color();

      let sIdx = 0;
      let lIdx = 0;
      for (const anchor of foliageAnchors) {
        for (let i = 0; i < sprigsPerAnchor; i++) {
          const theta = rand() * Math.PI * 2;
          const phi = Math.acos(2 * rand() - 1);
          const r = Math.pow(rand(), 0.55) * anchor.radius;
          _vec3A.set(
            anchor.pos.x + r * Math.sin(phi) * Math.cos(theta),
            anchor.pos.y + r * Math.cos(phi) * 0.56,
            anchor.pos.z + r * Math.sin(phi) * Math.sin(theta),
          );
          _euler.set((rand() - 0.5) * 0.8, rand() * Math.PI * 2, (rand() - 0.5) * 0.8);
          _quat.setFromEuler(_euler);
          _scale.setScalar(0.72 + rand() * 0.52);
          _mat4.compose(_vec3A, _quat, _scale);
          blossomInst.setMatrixAt(sIdx, _mat4);
          colorTmp.copy(blossomPalette[Math.floor(rand() * blossomPalette.length)]);
          blossomInst.setColorAt(sIdx, colorTmp);
          sIdx++;
        }

        for (let j = 0; j < leavesPerAnchor; j++) {
          const theta = rand() * Math.PI * 2;
          const r = (0.18 + Math.pow(rand(), 0.65) * 0.88) * anchor.radius;
          const yOff = (rand() - 0.45) * anchor.radius * 0.68;
          _vec3A.set(
            anchor.pos.x + Math.cos(theta) * r,
            anchor.pos.y + yOff,
            anchor.pos.z + Math.sin(theta) * r,
          );
          _euler.set(0.45 + rand() * 0.85, theta + (rand() - 0.5) * 0.8, (rand() - 0.5) * 0.6);
          _quat.setFromEuler(_euler);
          _scale.setScalar(0.75 + rand() * 0.55);
          _mat4.compose(_vec3A, _quat, _scale);
          leafInst.setMatrixAt(lIdx, _mat4);
          colorTmp.copy(leafPalette[Math.floor(rand() * leafPalette.length)]);
          leafInst.setColorAt(lIdx, colorTmp);
          lIdx++;
        }
      }
      blossomInst.instanceMatrix.needsUpdate = true;
      if (blossomInst.instanceColor) blossomInst.instanceColor.needsUpdate = true;
      blossomInst.computeBoundingSphere();
      group.add(blossomInst);

      leafInst.instanceMatrix.needsUpdate = true;
      if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true;
      leafInst.computeBoundingSphere();
      group.add(leafInst);
    } else {
      const clustersPerAnchor = 13;
      const canopyGeo = trackGeo(createCrossedClusterGeometry(1.18));
      const canopyInst = new THREE.InstancedMesh(
        canopyGeo,
        mats.greenCanopy,
        foliageAnchors.length * clustersPerAnchor,
      );
      canopyInst.castShadow = true;
      canopyInst.receiveShadow = true;

      const oakGreens = [
        new THREE.Color(0xc5e6a5),
        new THREE.Color(0x9fd07e),
        new THREE.Color(0x88be66),
        new THREE.Color(0xd7eca8),
      ];
      const colorTmp = new THREE.Color();

      let idx = 0;
      for (const anchor of foliageAnchors) {
        for (let i = 0; i < clustersPerAnchor; i++) {
          const theta = rand() * Math.PI * 2;
          const phi = Math.acos(2 * rand() - 1);
          const r = Math.pow(rand(), 0.5) * anchor.radius;
          _vec3A.set(
            anchor.pos.x + r * Math.sin(phi) * Math.cos(theta),
            anchor.pos.y + r * Math.cos(phi) * 0.62,
            anchor.pos.z + r * Math.sin(phi) * Math.sin(theta),
          );
          _euler.set((rand() - 0.5) * 0.9, rand() * Math.PI * 2, (rand() - 0.5) * 0.9);
          _quat.setFromEuler(_euler);
          _scale.setScalar(0.8 + rand() * 0.52);
          _mat4.compose(_vec3A, _quat, _scale);
          canopyInst.setMatrixAt(idx, _mat4);
          colorTmp.copy(oakGreens[Math.floor(rand() * oakGreens.length)]);
          canopyInst.setColorAt(idx, colorTmp);
          idx++;
        }
      }
      canopyInst.instanceMatrix.needsUpdate = true;
      if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
      canopyInst.computeBoundingSphere();
      group.add(canopyInst);
    }
  } else if (style === 'russian') {
    const pineTierGeos = [
      trackGeo(new THREE.ConeGeometry(2.25, 2.2, 9)),
      trackGeo(new THREE.ConeGeometry(1.85, 2.0, 9)),
      trackGeo(new THREE.ConeGeometry(1.42, 1.8, 9)),
      trackGeo(new THREE.ConeGeometry(1.02, 1.55, 9)),
      trackGeo(new THREE.ConeGeometry(0.62, 1.25, 9)),
    ];
    const snowCapGeos = [
      trackGeo(new THREE.ConeGeometry(2.05, 0.88, 9)),
      trackGeo(new THREE.ConeGeometry(1.66, 0.82, 9)),
      trackGeo(new THREE.ConeGeometry(1.26, 0.74, 9)),
      trackGeo(new THREE.ConeGeometry(0.88, 0.65, 9)),
      trackGeo(new THREE.ConeGeometry(0.52, 0.56, 9)),
    ];

    treeSpecs.forEach((tSpec, idx) => {
      const ty = groundHeightAt(tSpec.x, tSpec.z, style);
      const tree = new THREE.Group();
      tree.position.set(tSpec.x, ty, tSpec.z);
      tree.rotation.y = tSpec.rot;
      tree.scale.setScalar(tSpec.scale);
      group.add(tree);

      const sh = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(6.0, 6.0)),
        mats.contactShadowMat,
      );
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.04;
      tree.add(sh);

      if (idx % 3 !== 0) {
        const trunk = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.18, 0.36, 2.3, 8)),
          mats.yakisugiTimber,
        );
        trunk.position.y = 1.15;
        trunk.castShadow = true;
        tree.add(trunk);

        const heights = [2.25, 3.25, 4.2, 5.1, 5.95];
        for (let t = 0; t < 5; t++) {
          const rotOff = (t % 2) * (Math.PI / 9);
          const bough = new THREE.Mesh(pineTierGeos[t], mats.pineNeedle);
          bough.position.y = heights[t];
          bough.rotation.y = rotOff;
          bough.castShadow = true;
          tree.add(bough);

          const cap = new THREE.Mesh(snowCapGeos[t], mats.shikkuiPlaster);
          cap.position.y = heights[t] + 0.52;
          cap.rotation.y = rotOff;
          cap.castShadow = true;
          tree.add(cap);
        }
      } else {
        const trunk = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.12, 0.28, 4.7, 10)),
          mats.birchBark,
        );
        trunk.position.y = 2.35;
        trunk.castShadow = true;
        tree.add(trunk);

        const limbGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.085, 2.3, 6));
        const twigGeo = trackGeo(new THREE.CylinderGeometry(0.014, 0.028, 1.25, 5));
        const catkinGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.014, 0.32, 5));
        for (let b = 0; b < 6; b++) {
          const a = (b / 6) * Math.PI * 2 + 0.3;
          const ly = 3.9 + (b % 3) * 0.42;
          const limb = new THREE.Mesh(limbGeo, mats.birchBark);
          limb.position.set(Math.cos(a) * 0.65, ly, Math.sin(a) * 0.65);
          limb.rotation.z = -Math.cos(a) * 0.66;
          limb.rotation.x = Math.sin(a) * 0.66;
          limb.castShadow = true;
          tree.add(limb);

          // Delicate drooping birch branchlets & golden winter catkins
          for (const side of [-0.35, 0.35]) {
            const ta = a + side;
            const twig = new THREE.Mesh(twigGeo, mats.yakisugiTimber);
            twig.position.set(Math.cos(ta) * 1.38, ly + 0.28, Math.sin(ta) * 1.38);
            twig.rotation.z = -Math.cos(ta) * 1.18;
            twig.rotation.x = Math.sin(ta) * 1.18;
            tree.add(twig);

            const catkin = new THREE.Mesh(catkinGeo, mats.brushedGold);
            catkin.position.set(Math.cos(ta) * 1.72, ly - 0.14, Math.sin(ta) * 1.72);
            tree.add(catkin);
          }
        }
      }
    });
  } else if (style === 'mughal') {
    const banyanAnchors: Array<{ pos: THREE.Vector3; radius: number }> = [];
    const propRootGeo = trackGeo(new THREE.CylinderGeometry(0.03, 0.052, 3.15, 6));

    treeSpecs.forEach((tSpec, idx) => {
      const ty = groundHeightAt(tSpec.x, tSpec.z, style);
      const tree = new THREE.Group();
      tree.position.set(tSpec.x, ty, tSpec.z);
      tree.rotation.y = tSpec.rot;
      tree.scale.setScalar(tSpec.scale);
      group.add(tree);

      const sh = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(5.6, 5.6)),
        mats.contactShadowMat,
      );
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.04;
      tree.add(sh);

      if (idx % 2 === 0) {
        // Sculpted multi-whorl Mughal Charbagh Sarv Cypress
        const trunk = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.12, 0.22, 1.5, 8)),
          mats.yakisugiTimber,
        );
        trunk.position.y = 0.75;
        tree.add(trunk);

        const cBase = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.95, 10, 8)),
          mats.pineNeedle,
        );
        cBase.scale.set(1.0, 2.0, 1.0);
        cBase.position.y = 2.45;
        cBase.castShadow = true;
        tree.add(cBase);

        const cMid = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.76, 10, 8)),
          mats.pineNeedle,
        );
        cMid.scale.set(1.0, 2.2, 1.0);
        cMid.position.y = 4.15;
        cMid.castShadow = true;
        tree.add(cMid);

        const cTip = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.62, 2.4, 10)),
          mats.pineNeedle,
        );
        cTip.position.y = 5.75;
        cTip.castShadow = true;
        tree.add(cTip);
      } else {
        // Spreading Mughal Banyan with hanging aerial prop roots
        const trunk = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.28, 0.48, 3.3, 9)),
          mats.yakisugiTimber,
        );
        trunk.position.y = 1.65;
        trunk.castShadow = true;
        tree.add(trunk);

        tree.updateMatrixWorld(true);
        for (let b = 0; b < 4; b++) {
          const a = (b / 4) * Math.PI * 2 + 0.4;
          const bough = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(0.09, 0.15, 2.35, 6)),
            mats.yakisugiTimber,
          );
          bough.position.set(Math.cos(a) * 0.85, 3.35, Math.sin(a) * 0.85);
          bough.rotation.z = -Math.cos(a) * 0.72;
          bough.rotation.x = Math.sin(a) * 0.72;
          tree.add(bough);

          // Aerial prop root descending from bough into earth
          const prop = new THREE.Mesh(propRootGeo, mats.yakisugiTimber);
          prop.position.set(Math.cos(a) * 1.48, 1.55, Math.sin(a) * 1.48);
          prop.castShadow = true;
          tree.add(prop);

          banyanAnchors.push({
            pos: new THREE.Vector3(Math.cos(a) * 1.75, 4.1, Math.sin(a) * 1.75).applyMatrix4(
              tree.matrixWorld,
            ),
            radius: 1.55 * tSpec.scale,
          });
        }
        banyanAnchors.push({
          pos: new THREE.Vector3(0, 4.65, 0).applyMatrix4(tree.matrixWorld),
          radius: 1.8 * tSpec.scale,
        });
      }
    });

    if (banyanAnchors.length > 0) {
      const perAnchor = 13;
      const canopyGeo = trackGeo(createCrossedClusterGeometry(1.15));
      const canopyInst = new THREE.InstancedMesh(
        canopyGeo,
        mats.greenCanopy,
        banyanAnchors.length * perAnchor,
      );
      canopyInst.castShadow = true;
      const greens = [
        new THREE.Color(0xc5e6a5),
        new THREE.Color(0x9fd07e),
        new THREE.Color(0xb6de92),
      ];
      const cTmp = new THREE.Color();
      let idx = 0;
      for (const anchor of banyanAnchors) {
        for (let i = 0; i < perAnchor; i++) {
          const theta = rand() * Math.PI * 2;
          const r = Math.pow(rand(), 0.55) * anchor.radius;
          _vec3A.set(
            anchor.pos.x + Math.cos(theta) * r,
            anchor.pos.y + (rand() - 0.5) * anchor.radius * 0.7,
            anchor.pos.z + Math.sin(theta) * r,
          );
          _euler.set((rand() - 0.5) * 0.8, rand() * Math.PI * 2, (rand() - 0.5) * 0.8);
          _quat.setFromEuler(_euler);
          _scale.setScalar(0.8 + rand() * 0.5);
          _mat4.compose(_vec3A, _quat, _scale);
          canopyInst.setMatrixAt(idx, _mat4);
          cTmp.copy(greens[Math.floor(rand() * greens.length)]);
          canopyInst.setColorAt(idx, cTmp);
          idx++;
        }
      }
      canopyInst.instanceMatrix.needsUpdate = true;
      if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
      canopyInst.computeBoundingSphere();
      group.add(canopyInst);
    }
  } else {
    // Persian Desert Oasis Date Palms + Sculpted Sarv Cypresses + Juvenile Fan Palms
    // V-folded arched pinnate frond geometry for natural 3D depth from every angle
    const frondGeo = trackGeo(new THREE.PlaneGeometry(1.48, 3.25, 2, 8));
    frondGeo.translate(0, 1.625, 0);
    const fPos = frondGeo.attributes.position;
    for (let i = 0; i < fPos.count; i++) {
      const x = fPos.getX(i);
      const y = fPos.getY(i);
      const t = Math.max(0, Math.min(1, y / 3.25));
      const vFold = Math.abs(x) * 0.24;
      const arch = Math.pow(t, 1.72) * 1.48;
      fPos.setZ(i, arch + vFold);
      // Taper tip slightly for natural palm frond silhouette
      fPos.setX(i, x * (1 - Math.pow(t, 2.2) * 0.48));
    }
    frondGeo.computeVertexNormals();

    const collarGeo = trackGeo(new THREE.CylinderGeometry(0.29, 0.21, 0.26, 9, 1, false));
    const rootMoundGeo = trackGeo(new THREE.ConeGeometry(0.46, 0.58, 10));
    const crownShaftGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.24, 0.65, 10));
    const dateStalkGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.018, 0.72, 5));
    const dateDrupeGeo = trackGeo(new THREE.SphereGeometry(0.075, 7, 6));

    const palmCrowns: Array<{ pos: THREE.Vector3; scale: number }> = [];

    treeSpecs.forEach((tSpec, idx) => {
      const ty = groundHeightAt(tSpec.x, tSpec.z, style);
      const tree = new THREE.Group();
      tree.position.set(tSpec.x, ty, tSpec.z);
      tree.rotation.y = tSpec.rot;
      tree.scale.setScalar(tSpec.scale);
      group.add(tree);

      const sh = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(5.6, 5.6)),
        mats.contactShadowMat,
      );
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.04;
      tree.add(sh);

      if (idx % 4 === 3) {
        // Multi-whorl Persian Sarv Garden Cypress
        const cTrunk = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.12, 0.2, 1.3, 8)),
          mats.yakisugiTimber,
        );
        cTrunk.position.y = 0.65;
        tree.add(cTrunk);

        const c1 = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.88, 10, 8)),
          mats.pineNeedle,
        );
        c1.scale.set(1, 2.0, 1);
        c1.position.y = 2.4;
        c1.castShadow = true;
        tree.add(c1);

        const c2 = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.7, 10, 8)),
          mats.pineNeedle,
        );
        c2.scale.set(1, 2.1, 1);
        c2.position.y = 4.1;
        c2.castShadow = true;
        tree.add(c2);

        const c3 = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.54, 2.1, 10)),
          mats.pineNeedle,
        );
        c3.position.y = 5.6;
        c3.castShadow = true;
        tree.add(c3);
      } else {
        const leanX = (rand() - 0.5) * 1.55;
        const leanZ = (rand() - 0.5) * 1.55;
        const trunkH = 6.2 + (rand() - 0.5) * 0.7;
        const trunkCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(leanX * 0.35, trunkH * 0.34, leanZ * 0.35),
          new THREE.Vector3(leanX * 0.86, trunkH * 0.72, leanZ * 0.86),
          new THREE.Vector3(leanX, trunkH, leanZ),
        ]);
        const trunk = new THREE.Mesh(
          trackGeo(new THREE.TubeGeometry(trunkCurve, 14, 0.22, 9, false)),
          mats.palmBark,
        );
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Flared fibrous root collar at desert floor
        const rootMound = new THREE.Mesh(rootMoundGeo, mats.palmBark);
        rootMound.position.y = 0.28;
        tree.add(rootMound);

        // Overlapping sculpted leaf-scar boot rings up the trunk
        const ringCount = 15;
        const upVec = new THREE.Vector3(0, 1, 0);
        for (let r = 1; r <= ringCount; r++) {
          const rt = r / (ringCount + 1);
          const pt = trunkCurve.getPoint(rt);
          const tan = trunkCurve.getTangent(rt).normalize();
          const collar = new THREE.Mesh(collarGeo, mats.palmBark);
          collar.position.copy(pt);
          collar.quaternion.setFromUnitVectors(upVec, tan);
          collar.rotateY(r * 0.7);
          const taper = 1.06 - rt * 0.24;
          collar.scale.set(taper, 1, taper);
          collar.castShadow = true;
          tree.add(collar);
        }

        // Fibrous swollen crownshaft neck beneath the fronds
        const crownShaft = new THREE.Mesh(crownShaftGeo, mats.palmBark);
        crownShaft.position.set(leanX, trunkH - 0.12, leanZ);
        tree.add(crownShaft);

        // 4 compound hanging golden-amber & mahogany date-fruit panicles
        for (let d = 0; d < 4; d++) {
          const da = (d / 4) * Math.PI * 2 + idx * 0.4;
          const stalk = new THREE.Mesh(dateStalkGeo, mats.brushedGold);
          stalk.position.set(
            leanX + Math.cos(da) * 0.42,
            trunkH - 0.35,
            leanZ + Math.sin(da) * 0.42,
          );
          stalk.rotation.z = -Math.cos(da) * 0.48;
          stalk.rotation.x = Math.sin(da) * 0.48;
          tree.add(stalk);

          for (let f = 0; f < 6; f++) {
            const fa = (f / 6) * Math.PI * 2;
            const fy = trunkH - 0.56 - (f % 3) * 0.14;
            const drupe = new THREE.Mesh(
              dateDrupeGeo,
              f % 2 === 0 ? mats.brushedGold : mats.camelCoat,
            );
            drupe.scale.set(0.75, 1.45, 0.75);
            drupe.position.set(
              leanX + Math.cos(da) * 0.58 + Math.cos(fa) * 0.1,
              fy,
              leanZ + Math.sin(da) * 0.58 + Math.sin(fa) * 0.1,
            );
            tree.add(drupe);
          }
        }

        tree.updateMatrixWorld(true);
        palmCrowns.push({
          pos: new THREE.Vector3(leanX, trunkH + 0.08, leanZ).applyMatrix4(tree.matrixWorld),
          scale: tSpec.scale,
        });
      }
    });

    // Juvenile ground-level oasis fan palms around shoreline & terrace approaches
    const juvenileCoords: Array<[number, number, number]> = [
      [-10.2, 6.2, 0.44],
      [-14.8, 12.6, 0.5],
      [15.4, 9.8, 0.46],
      [18.2, -3.5, 0.48],
      [-5.8, -6.5, 0.42],
    ];
    for (const [jx, jz, jScale] of juvenileCoords) {
      const jy = groundHeightAt(jx, jz, style);
      const jGrp = new THREE.Group();
      jGrp.position.set(jx, jy, jz);
      group.add(jGrp);

      const jBulb = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.24, 0.36, 0.55, 8)),
        mats.palmBark,
      );
      jBulb.position.y = 0.25;
      jGrp.add(jBulb);

      jGrp.updateMatrixWorld(true);
      palmCrowns.push({
        pos: new THREE.Vector3(0, 0.42, 0).applyMatrix4(jGrp.matrixWorld),
        scale: jScale,
      });
    }

    // 3-tier lush crown (6 drooping skirt fronds + 8 spreading mid fronds + 4 upright spears = 18/crown)
    const frondsPerCrown = 18;
    const frondInst = new THREE.InstancedMesh(
      frondGeo,
      mats.palmFrond,
      palmCrowns.length * frondsPerCrown,
    );
    frondInst.castShadow = true;
    frondInst.receiveShadow = true;
    const frondColors = [
      new THREE.Color(0xdcf0b8),
      new THREE.Color(0xbce08e),
      new THREE.Color(0xe6d394),
      new THREE.Color(0xcde8a0),
    ];
    const cTmp = new THREE.Color();
    let fIdx = 0;

    for (const crown of palmCrowns) {
      for (let i = 0; i < frondsPerCrown; i++) {
        let tierTilt: number;
        let ang: number;
        let fScale: number;
        let col: THREE.Color;
        if (i < 6) {
          // Lower arching/drooping mature fronds
          ang = (i / 6) * Math.PI * 2 + (rand() - 0.5) * 0.25;
          tierTilt = 1.24 + rand() * 0.28;
          fScale = (0.95 + rand() * 0.22) * crown.scale;
          col = frondColors[2];
        } else if (i < 14) {
          // Mid spreading crown fronds
          const k = i - 6;
          ang = (k / 8) * Math.PI * 2 + 0.22 + (rand() - 0.5) * 0.2;
          tierTilt = 0.76 + rand() * 0.24;
          fScale = (1.02 + rand() * 0.26) * crown.scale;
          col = frondColors[k % 2];
        } else {
          // Upright young central spear fronds
          const k = i - 14;
          ang = (k / 4) * Math.PI * 2 + 0.45;
          tierTilt = 0.3 + rand() * 0.16;
          fScale = (0.78 + rand() * 0.18) * crown.scale;
          col = frondColors[3];
        }
        _vec3A.copy(crown.pos);
        _euler.set(tierTilt, ang, (rand() - 0.5) * 0.14, 'YXZ');
        _quat.setFromEuler(_euler);
        _scale.setScalar(fScale);
        _mat4.compose(_vec3A, _quat, _scale);
        frondInst.setMatrixAt(fIdx, _mat4);
        cTmp.copy(col);
        frondInst.setColorAt(fIdx, cTmp);
        fIdx++;
      }
    }
    frondInst.instanceMatrix.needsUpdate = true;
    if (frondInst.instanceColor) frondInst.instanceColor.needsUpdate = true;
    frondInst.computeBoundingSphere();
    group.add(frondInst);
  }

  // =========================================================================
  // 2. BIOME SHORELINE REEDS & CATTAILS
  // =========================================================================
  group.add(createShorelineReeds(style, mats, trackGeo, rand));

  // =========================================================================
  // 3. BIOME FALLING / DRIFTING ATMOSPHERIC PARTICLES
  // =========================================================================
  const maxParticles = PETAL_COUNTS.flurry;
  const particleGeo = trackGeo(
    style === 'japanese' || style === 'mughal'
      ? new THREE.PlaneGeometry(0.18, 0.22, 2, 2)
      : new THREE.OctahedronGeometry(0.08, 0),
  );
  if (style === 'japanese' || style === 'mughal') {
    const pPos = particleGeo.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      const px = pPos.getX(i);
      const py = pPos.getY(i);
      pPos.setZ(i, (px * px + py * py) * 1.8);
    }
    particleGeo.computeVertexNormals();
  }

  const particleMat =
    style === 'japanese'
      ? mats.sakuraPetal
      : style === 'russian'
        ? mats.shikkuiPlaster
        : style === 'persian'
          ? mats.ochrePlaster
          : mats.brushedGold;

  const particleInst = new THREE.InstancedMesh(particleGeo, particleMat, maxParticles);
  particleInst.frustumCulled = false;
  group.add(particleInst);

  const particles: FloatingParticle[] = [];
  for (let i = 0; i < maxParticles; i++) {
    particles.push({
      x: (rand() - 0.5) * 54,
      y: 0.4 + rand() * 14,
      z: (rand() - 0.5) * 48 + 2,
      vy: style === 'persian' ? 0.15 + rand() * 0.25 : 0.52 + rand() * 0.62,
      phase: rand() * Math.PI * 2,
      spinSpeedX: 1.1 + rand() * 2.0,
      spinSpeedY: 0.8 + rand() * 1.7,
      swayAmp: 0.6 + rand() * 1.1,
      scale: style === 'russian' ? 0.65 + rand() * 0.55 : 0.75 + rand() * 0.6,
    });
  }

  // =========================================================================
  // 4. POND KOI FISH (Japanese, Mughal) & BIOME SHORELINE PROPS / WILDLIFE
  // =========================================================================
  const koiActors: KoiActor[] = [];
  if (style === 'japanese' || style === 'mughal') {
    const koiCount = 12;
    for (let i = 0; i < koiCount; i++) {
      const mat = mats.koiMaterials[i % mats.koiMaterials.length];
      const scaleFactor = 1.05 + (i % 4) * 0.16;
      const built = createKoiActor(mat, mats, trackGeo, scaleFactor);
      group.add(built.group);

      const minRadius = style === 'mughal' ? 2.6 : 1.8;
      koiActors.push({
        ...built,
        centerX: spec.pondCenter.x + (style === 'mughal' ? 0 : (rand() - 0.5) * 5.2),
        centerZ: spec.pondCenter.z + (style === 'mughal' ? 0 : (rand() - 0.5) * 3.0),
        radiusX: minRadius + rand() * 3.2,
        radiusZ: minRadius * 0.72 + rand() * 1.9,
        depthY: WATER_LEVEL - 0.24 - (i % 3) * 0.11,
        speed: 0.34 + rand() * 0.22,
        phase: rand() * Math.PI * 2,
        dir: i % 2 === 0 ? 1 : -1,
      });
    }
  }

  // Japanese bamboo Shishi-odoshi clacker beside shore boulders
  let shishiRocker: THREE.Group | null = null;
  if (style === 'japanese') {
    const shishi = createShishiOdoshi(mats, trackGeo);
    const sx = -4.2;
    const sz = 9.4;
    shishi.group.position.set(sx, groundHeightAt(sx, sz, style), sz);
    shishi.group.rotation.y = 0.45;
    group.add(shishi.group);
    shishiRocker = shishi.rockerPivot;
  }

  // Russian winter moored skiff pulled onto snowy bank by pier
  const bobbingBoats: BobbingBoat[] = [];
  if (style === 'russian') {
    const skiff = createWoodenRowboat(mats, trackGeo, false);
    const rx = 9.6;
    const rz = 13.8;
    skiff.position.set(rx, groundHeightAt(rx, rz, style) + 0.04, rz);
    skiff.rotation.set(-0.08, -2.35, 0.12);
    group.add(skiff);
  }

  // Victorian Swans, Moored Rowboat by Oak Dock, and Fountain Water Plume
  const swanActors: SwanActor[] = [];
  const fountainJets: FountainJet[] = [];
  if (style === 'victorian') {
    const swanSpecs: Array<{
      isBlack: boolean;
      rx: number;
      rz: number;
      speed: number;
      phase: number;
      dir: number;
      scale: number;
    }> = [
      { isBlack: false, rx: 5.4, rz: 3.4, speed: 0.18, phase: 0.2, dir: 1, scale: 1.05 },
      { isBlack: false, rx: 4.6, rz: 3.8, speed: 0.16, phase: 1.9, dir: -1, scale: 0.96 },
      { isBlack: false, rx: 6.1, rz: 2.9, speed: 0.14, phase: 3.8, dir: 1, scale: 1.0 },
      { isBlack: true, rx: 4.9, rz: 4.2, speed: 0.17, phase: 5.1, dir: -1, scale: 1.02 },
    ];
    for (const sp of swanSpecs) {
      const featherMat = sp.isBlack ? mats.swanBlack : mats.swanWhite;
      const beakMat = sp.isBlack ? mats.vermilionLacquer : mats.swanBeakOrange;
      const built = createSwanActor(featherMat, beakMat, mats, trackGeo, sp.isBlack, sp.scale);
      group.add(built.group);
      swanActors.push({
        ...built,
        centerX: spec.pondCenter.x,
        centerZ: spec.pondCenter.z,
        radiusX: sp.rx,
        radiusZ: sp.rz,
        speed: sp.speed,
        phase: sp.phase,
        dir: sp.dir,
      });
    }

    const victorianBoat = createWoodenRowboat(mats, trackGeo, false);
    victorianBoat.position.set(9.4, WATER_LEVEL - 0.14, 8.5);
    victorianBoat.rotation.y = 2.42;
    group.add(victorianBoat);
    bobbingBoats.push({ group: victorianBoat, baseY: WATER_LEVEL - 0.14, phase: 0.4 });
  }

  // Animated water jet droplets for Victorian & Mughal fountains
  if (style === 'victorian' || style === 'mughal') {
    const jetGroup = new THREE.Group();
    const baseY = style === 'victorian' ? WATER_LEVEL + 2.25 : WATER_LEVEL + 1.15;
    jetGroup.position.set(spec.pondCenter.x, baseY, spec.pondCenter.z);
    group.add(jetGroup);

    const dropGeo = trackGeo(new THREE.SphereGeometry(0.08, 6, 6));
    const drops: THREE.Mesh[] = [];
    for (let i = 0; i < 16; i++) {
      const drop = new THREE.Mesh(dropGeo, mats.waterSurface);
      jetGroup.add(drop);
      drops.push(drop);
    }
    fountainJets.push({
      group: jetGroup,
      drops,
      baseY,
      maxH: style === 'victorian' ? 1.15 : 0.85,
    });
  }

  // Persian Oasis moored wooden skiff + 5 Desert Caravan & Grazing Camels
  const camels: CamelActor[] = [];
  if (style === 'persian') {
    const oasisSkiff = createWoodenRowboat(mats, trackGeo, true);
    oasisSkiff.position.set(-2.4, WATER_LEVEL - 0.14, 12.6);
    oasisSkiff.rotation.y = 0.88;
    group.add(oasisSkiff);
    bobbingBoats.push({ group: oasisSkiff, baseY: WATER_LEVEL - 0.14, phase: 1.7 });

    const standingSpecs: Array<{ x: number; z: number; rotY: number; scale: number }> = [
      { x: 15.8, z: 3.4, rotY: -0.9, scale: 1.05 },
      { x: 17.5, z: 5.1, rotY: -1.35, scale: 0.92 },
      { x: -18.2, z: 11.4, rotY: 0.65, scale: 1.02 },
    ];
    standingSpecs.forEach((sp, idx) => {
      const built = createCamelMesh(mats, trackGeo, sp.scale);
      built.group.position.set(sp.x, groundHeightAt(sp.x, sp.z, style), sp.z);
      built.group.rotation.y = sp.rotY;
      group.add(built.group);
      camels.push({ ...built, speed: 0.6, phase: idx * 2.1, isWalking: false });
    });

    const walkingSpecs: Array<{
      cx: number;
      cz: number;
      rx: number;
      rz: number;
      scale: number;
      phase: number;
    }> = [
      { cx: -3.5, cz: 21.4, rx: 11.0, rz: 2.2, scale: 1.08, phase: 0.2 },
      { cx: -3.5, cz: 21.4, rx: 11.0, rz: 2.2, scale: 0.96, phase: 0.65 },
    ];
    walkingSpecs.forEach((sp) => {
      const built = createCamelMesh(mats, trackGeo, sp.scale);
      group.add(built.group);
      camels.push({
        ...built,
        walkCenter: { x: sp.cx, z: sp.cz, rx: sp.rx, rz: sp.rz },
        speed: 0.14,
        phase: sp.phase,
        isWalking: true,
      });
    });
  }

  // =========================================================================
  // 5. PER-FRAME ZERO-GC ANIMATION UPDATE
  // =========================================================================
  const update = (
    elapsed: number,
    delta: number,
    density: SakuraDensity,
    windStrength: number,
  ) => {
    mats.waterUniforms.uTime.value = elapsed;
    mats.foliageUniforms.uTime.value = elapsed;
    mats.foliageUniforms.uWind.value = windStrength;

    const activeCount = PETAL_COUNTS[density];
    particleInst.count = activeCount;
    const dt = Math.min(delta, 0.05);

    for (let i = 0; i < activeCount; i++) {
      const p = particles[i];
      p.y -= p.vy * dt;
      p.x += (windStrength * 1.45 + Math.sin(elapsed * 1.3 + p.phase) * p.swayAmp) * dt;
      p.z += (windStrength * 0.35 + Math.cos(elapsed * 1.05 + p.phase) * p.swayAmp * 0.6) * dt;

      if (p.y < -0.25 || p.x > 30) {
        p.y = 10 + (i % 5) * 1.4;
        p.x = -26 + ((i * 7) % 50);
        p.z = -18 + ((i * 13) % 42);
      }

      _vec3A.set(p.x, p.y, p.z);
      _euler.set(
        elapsed * p.spinSpeedX + p.phase,
        elapsed * p.spinSpeedY + p.phase,
        Math.sin(elapsed * 1.8 + p.phase) * 0.8,
      );
      _quat.setFromEuler(_euler);
      _scale.setScalar(p.scale);
      _mat4.compose(_vec3A, _quat, _scale);
      particleInst.setMatrixAt(i, _mat4);
    }
    particleInst.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < koiActors.length; i++) {
      const k = koiActors[i];
      const t = elapsed * k.speed * k.dir + k.phase;
      const nextT = t + 0.02 * k.dir;

      const x = k.centerX + Math.cos(t) * k.radiusX;
      const z = k.centerZ + Math.sin(t * 2) * k.radiusZ * 0.55;
      const nx = k.centerX + Math.cos(nextT) * k.radiusX;
      const nz = k.centerZ + Math.sin(nextT * 2) * k.radiusZ * 0.55;

      _vec3A.set(x, k.depthY + Math.sin(elapsed * 1.4 + k.phase) * 0.025, z);
      _vec3B.set(nx - x, 0, nz - z);
      k.group.position.copy(_vec3A);
      k.group.rotation.y = Math.atan2(_vec3B.x, _vec3B.z);

      const swimCycle = elapsed * (5.8 + k.speed * 4.5) + k.phase;
      k.tailPivot.rotation.y = Math.sin(swimCycle) * 0.36;
      k.leftFin.rotation.y = 0.2 + Math.sin(swimCycle * 0.7) * 0.25;
      k.rightFin.rotation.y = -0.2 - Math.sin(swimCycle * 0.7) * 0.25;
    }

    for (let i = 0; i < swanActors.length; i++) {
      const sw = swanActors[i];
      const t = elapsed * sw.speed * sw.dir + sw.phase;
      const nextT = t + 0.02 * sw.dir;

      const x = sw.centerX + Math.cos(t) * sw.radiusX;
      const z = sw.centerZ + Math.sin(t) * sw.radiusZ;
      const nx = sw.centerX + Math.cos(nextT) * sw.radiusX;
      const nz = sw.centerZ + Math.sin(nextT) * sw.radiusZ;

      sw.group.position.set(
        x,
        WATER_LEVEL - 0.05 + Math.sin(elapsed * 1.6 + sw.phase) * 0.018,
        z,
      );
      sw.group.rotation.y = Math.atan2(nx - x, nz - z);
      sw.neckPivot.rotation.x = Math.sin(elapsed * 1.1 + sw.phase) * 0.11;
    }

    for (let i = 0; i < bobbingBoats.length; i++) {
      const b = bobbingBoats[i];
      b.group.position.y = b.baseY + Math.sin(elapsed * 1.4 + b.phase) * 0.032;
      b.group.rotation.z = Math.sin(elapsed * 1.1 + b.phase) * 0.035;
      b.group.rotation.x = Math.cos(elapsed * 0.9 + b.phase) * 0.025;
    }

    if (shishiRocker) {
      // Smooth periodic bamboo tilt: slowly loads, dips sharply, rocks back
      const cycle = (elapsed * 0.45) % 1;
      const tilt =
        cycle < 0.72
          ? THREE.MathUtils.lerp(0.24, -0.05, cycle / 0.72)
          : cycle < 0.84
            ? THREE.MathUtils.lerp(-0.05, -0.58, (cycle - 0.72) / 0.12)
            : THREE.MathUtils.lerp(-0.58, 0.24, (cycle - 0.84) / 0.16);
      shishiRocker.rotation.z = tilt;
    }

    for (let f = 0; f < fountainJets.length; f++) {
      const fj = fountainJets[f];
      for (let d = 0; d < fj.drops.length; d++) {
        const phase = (elapsed * 1.25 + d / fj.drops.length) % 1;
        const arcY = 4 * phase * (1 - phase) * fj.maxH;
        const ang = (d / fj.drops.length) * Math.PI * 2 + elapsed * 0.5;
        const spread = phase * 0.65;
        fj.drops[d].position.set(Math.cos(ang) * spread, arcY, Math.sin(ang) * spread);
        fj.drops[d].scale.setScalar(0.6 + (1 - Math.abs(phase - 0.5) * 2) * 0.55);
      }
    }

    for (let i = 0; i < camels.length; i++) {
      const c = camels[i];
      if (c.isWalking && c.walkCenter) {
        const t = elapsed * c.speed + c.phase;
        const nt = t + 0.02;
        const x = c.walkCenter.x + Math.cos(t) * c.walkCenter.rx;
        const z = c.walkCenter.z + Math.sin(t) * c.walkCenter.rz;
        const nx = c.walkCenter.x + Math.cos(nt) * c.walkCenter.rx;
        const nz = c.walkCenter.z + Math.sin(nt) * c.walkCenter.rz;

        c.group.position.set(x, groundHeightAt(x, z, style), z);
        c.group.rotation.y = Math.atan2(nx - x, nz - z);

        const stride = elapsed * 2.8 + c.phase * 4;
        c.legs[0].rotation.x = Math.sin(stride) * 0.32;
        c.legs[1].rotation.x = -Math.sin(stride) * 0.32;
        c.legs[2].rotation.x = -Math.sin(stride) * 0.28;
        c.legs[3].rotation.x = Math.sin(stride) * 0.28;
        c.neckGroup.rotation.x = Math.sin(stride * 2) * 0.06;
        c.tail.rotation.z = Math.sin(stride * 1.5) * 0.14;
      } else {
        c.neckGroup.rotation.x = Math.sin(elapsed * 0.9 + c.phase) * 0.08;
        c.tail.rotation.z = Math.sin(elapsed * 1.7 + c.phase) * 0.12;
      }
    }
  };

  return {
    group,
    update,
    dispose: () => {
      for (const g of geometries) g.dispose();
    },
  };
}
