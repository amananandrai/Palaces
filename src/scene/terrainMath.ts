import type { PalaceStyle } from './types';

// Shared deterministic per-biome terrain elevation and stream/pond distance math
// so palaces, regional bridges, piers, fountains, lanterns, trees, and wildlife remain flush with the ground.

export const WATER_LEVEL = -0.32;
export const POND_CENTER = { x: 2.2, z: 11.2 };

export interface BiomeWaterSpec {
  pondCenter: { x: number; z: number };
  pondRadiusX: number;
  pondRadiusZ: number;
  pondShape: 'organic' | 'broadIce' | 'formalOval' | 'octagon' | 'lagoon';
  pondFloorY: number;
  streamPoints: Array<[number, number]>;
  streamWidthBase: number;
  bridgePos: { x: number; z: number; rotY: number };
  pondCam: { position: [number, number, number]; target: [number, number, number] };
  bridgeCam: { position: [number, number, number]; target: [number, number, number] };
}

export const BIOME_WATER_SPECS: Record<PalaceStyle, BiomeWaterSpec> = {
  japanese: {
    pondCenter: { x: 2.2, z: 11.2 },
    pondRadiusX: 10.2,
    pondRadiusZ: 6.6,
    pondShape: 'organic',
    pondFloorY: -1.25,
    streamPoints: [
      [-34, -8],
      [-24, -3.5],
      [-16.5, 2.2],
      [-10.5, 6.4],
      [-6.2, 9.2],
      [-2.5, 10.6],
    ],
    streamWidthBase: 1.95,
    bridgePos: { x: -10.5, z: 6.4, rotY: 0.62 },
    pondCam: { position: [7.2, 3.6, 19.4], target: [2.2, -0.1, 11.2] },
    bridgeCam: { position: [-2.8, 3.1, 14.5], target: [-10.5, 1.3, 6.4] },
  },
  russian: {
    pondCenter: { x: 1.8, z: 10.8 },
    pondRadiusX: 11.8,
    pondRadiusZ: 7.2,
    pondShape: 'broadIce',
    pondFloorY: -0.95,
    streamPoints: [
      [-32, -4.5],
      [-22, 0.2],
      [-15.2, 4.2],
      [-9.8, 7.2],
      [-5.4, 9.4],
      [-1.5, 10.5],
    ],
    streamWidthBase: 2.35,
    bridgePos: { x: -9.8, z: 7.2, rotY: 0.52 },
    pondCam: { position: [9.4, 4.1, 20.6], target: [1.8, 0.2, 10.8] },
    bridgeCam: { position: [-1.8, 3.4, 15.2], target: [-9.8, 1.5, 7.2] },
  },
  victorian: {
    pondCenter: { x: 3.4, z: 10.8 },
    pondRadiusX: 10.8,
    pondRadiusZ: 7.0,
    pondShape: 'formalOval',
    pondFloorY: -1.28,
    streamPoints: [
      [-33, -7.2],
      [-23, -2.5],
      [-15.5, 2.5],
      [-9.4, 6.6],
      [-4.8, 9.2],
      [-1.2, 10.4],
    ],
    streamWidthBase: 2.05,
    bridgePos: { x: -9.4, z: 6.6, rotY: 0.58 },
    pondCam: { position: [10.2, 4.1, 20.2], target: [3.4, 0.65, 10.8] },
    bridgeCam: { position: [-1.4, 3.3, 14.8], target: [-9.4, 1.45, 6.6] },
  },
  mughal: {
    pondCenter: { x: 4.5, z: 10.6 },
    pondRadiusX: 9.4,
    pondRadiusZ: 7.2,
    pondShape: 'octagon',
    pondFloorY: -1.18,
    streamPoints: [
      [-32, 10.6],
      [-22, 10.6],
      [-14, 10.6],
      [-8.6, 10.6],
      [-4.5, 10.6],
      [-1.0, 10.6],
    ],
    streamWidthBase: 2.15,
    bridgePos: { x: -8.6, z: 10.6, rotY: 0.0 },
    pondCam: { position: [10.8, 4.5, 20.4], target: [4.5, 0.4, 10.6] },
    bridgeCam: { position: [-1.6, 3.8, 18.6], target: [-8.6, 1.75, 10.6] },
  },
  persian: {
    pondCenter: { x: 0.8, z: 11.4 },
    pondRadiusX: 9.2,
    pondRadiusZ: 6.2,
    pondShape: 'lagoon',
    pondFloorY: -1.22,
    streamPoints: [
      [-34, -9.0],
      [-24, -4.2],
      [-15.5, 1.8],
      [-10.2, 5.8],
      [-5.6, 9.0],
      [-2.2, 10.6],
    ],
    streamWidthBase: 1.85,
    bridgePos: { x: -10.2, z: 5.8, rotY: 0.64 },
    pondCam: { position: [8.4, 3.7, 19.8], target: [0.8, 0.25, 11.4] },
    bridgeCam: { position: [-2.2, 3.4, 14.2], target: [-10.2, 1.4, 5.8] },
  },
};

export function getBiomeWaterSpec(style: PalaceStyle = 'japanese'): BiomeWaterSpec {
  return BIOME_WATER_SPECS[style];
}

export function distanceToStream(
  x: number,
  z: number,
  style: PalaceStyle = 'japanese',
): { dist: number; t: number } {
  const pts = BIOME_WATER_SPECS[style].streamPoints;
  let minDist = Infinity;
  let bestT = 0;
  const segCount = pts.length - 1;

  for (let i = 0; i < segCount; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const abx = bx - ax;
    const abz = bz - az;
    const lenSq = abx * abx + abz * abz;
    const u = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / lenSq));
    const px = ax + abx * u;
    const pz = az + abz * u;
    const d = Math.hypot(x - px, z - pz);
    if (d < minDist) {
      minDist = d;
      bestT = (i + u) / segCount;
    }
  }
  return { dist: minDist, t: bestT };
}

export function pondSignedFactor(
  x: number,
  z: number,
  style: PalaceStyle = 'japanese',
): number {
  const spec = BIOME_WATER_SPECS[style];
  const dx = (x - spec.pondCenter.x) / spec.pondRadiusX;
  const dz = (z - spec.pondCenter.z) / spec.pondRadiusZ;

  if (spec.pondShape === 'octagon') {
    // Crisp regular octagonal distance metric for Mughal Charbagh pool
    const ax = Math.abs(dx);
    const az = Math.abs(dz);
    return Math.max(ax, az, (ax + az) * 0.70710678);
  }

  if (spec.pondShape === 'formalOval') {
    // Smooth symmetrical English estate lake
    return Math.hypot(dx, dz);
  }

  const angle = Math.atan2(dz, dx);
  if (spec.pondShape === 'broadIce') {
    const lobe = 1 + 0.07 * Math.sin(angle * 2 + 0.4) + 0.04 * Math.cos(angle * 3 - 0.3);
    return Math.hypot(dx, dz) / lobe;
  }

  if (spec.pondShape === 'lagoon') {
    const lobe = 1 + 0.14 * Math.sin(angle * 3 - 0.5) + 0.09 * Math.cos(angle * 2 + 1.1);
    return Math.hypot(dx, dz) / lobe;
  }

  // Japanese asymmetric organic koi pond
  const lobe =
    1 +
    0.12 * Math.sin(angle * 3 + 0.6) +
    0.07 * Math.cos(angle * 2 - 0.8);
  return Math.hypot(dx, dz) / lobe;
}

export function groundHeightAt(
  x: number,
  z: number,
  style: PalaceStyle = 'japanese',
): number {
  const spec = BIOME_WATER_SPECS[style];
  let h = 0;

  // Gentle rolling garden mounds or sculpted desert sand dunes outside central courtyard
  const distFromCenter = Math.hypot(x * 0.8, z * 0.85);
  if (distFromCenter > 21) {
    const hillBlend = Math.min(1, (distFromCenter - 21) / 34);
    if (style === 'persian') {
      const dune =
        Math.sin(x * 0.11 + z * 0.07) * 2.1 +
        Math.cos(x * 0.055 - z * 0.095) * 1.45;
      h += hillBlend * Math.max(0, dune + 1.05);
    } else {
      const undulation =
        Math.sin(x * 0.085) * Math.cos(z * 0.075) * 1.9 +
        Math.sin(x * 0.04 - z * 0.05) * 1.4;
      h += hillBlend * Math.max(0, undulation + 0.8);
    }
  }

  // Slight natural rise behind palace keep for foothills feel
  if (z < -30) {
    h += Math.min(9.5, ((-z - 30) / 38) * 5.2) * (0.65 + 0.35 * Math.sin(x * 0.07));
  }

  // Flatten courtyard terrace cleanly so palace, pavilions, and wall sit flush
  const courtyardMaskX = Math.max(0, 1 - Math.max(0, Math.abs(x - 5) - 22) / 10);
  const courtyardMaskZ = Math.max(0, 1 - Math.max(0, Math.abs(z + 18) - 10) / 8);
  const courtyardFlat = courtyardMaskX * courtyardMaskZ;
  h *= 1 - courtyardFlat;

  // Carve foreground pond basin
  const pf = pondSignedFactor(x, z, style);
  const edgeSpan = spec.pondShape === 'octagon' || spec.pondShape === 'formalOval' ? 0.22 : 0.42;
  const outer = 1.0 + edgeSpan * 0.6;
  if (pf < outer) {
    const t = Math.max(0, Math.min(1, (outer - pf) / edgeSpan));
    const smooth = t * t * (3 - 2 * t);
    h = h * (1 - smooth) + spec.pondFloorY * smooth;
  }

  // Carve feeding stream / canal / aqueduct channel
  const stream = distanceToStream(x, z, style);
  const streamWidth = spec.streamWidthBase + 0.45 * stream.t;
  if (stream.dist < streamWidth + 1.35) {
    const st = Math.max(0, Math.min(1, (streamWidth + 1.35 - stream.dist) / 1.45));
    const smooth = st * st * (3 - 2 * st);
    const streamFloor = -0.82 - stream.t * 0.32;
    h = Math.min(h, h * (1 - smooth) + streamFloor * smooth);
  }

  return h;
}
