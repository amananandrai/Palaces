export type PalaceStyle =
  | 'japanese'
  | 'russian'
  | 'victorian'
  | 'mughal'
  | 'persian';

export interface PalaceOption {
  id: PalaceStyle;
  label: string;
  title: string;
  subtitle: string;
  particleLabel: string;
}

export const PALACE_OPTIONS: PalaceOption[] = [
  {
    id: 'japanese',
    label: 'Japanese',
    title: 'Edo Sanctuary',
    subtitle: 'Taiko-bashi Bridge · Koi Pond, Viewing Pier & Bamboo Clacker',
    particleLabel: 'Sakura petal density',
  },
  {
    id: 'russian',
    label: 'Russian',
    title: 'Winter Terem Kremlin',
    subtitle: 'Neva Granite Bridge · Frozen Rink, Pier, Ice Fishing & Pines',
    particleLabel: 'Snowfall density',
  },
  {
    id: 'victorian',
    label: 'Victorian',
    title: 'Gothic Tudor Manor',
    subtitle: 'Cast-Iron Arch Bridge · Swan Fountain Lake, Rowboat & Oak Pier',
    particleLabel: 'Twilight mote density',
  },
  {
    id: 'mughal',
    label: 'Mughal',
    title: 'Diwan-i-Khas',
    subtitle: 'Chhatri Stone Bridge · Octagonal Charbagh Pool, Lotus & Fountain',
    particleLabel: 'Blossom breeze density',
  },
  {
    id: 'persian',
    label: 'Persian',
    title: 'Safavid Desert Oasis',
    subtitle: 'Triple-Arch Tile Bridge · Qanat Lagoon, Divan Rug & Camels',
    particleLabel: 'Desert breeze density',
  },
];

export type CameraPresetId =
  | 'grand'
  | 'koi'
  | 'bridge'
  | 'keep'
  | 'mountain';

export type SakuraDensity = 'calm' | 'breeze' | 'flurry';

export type TimeOfDay = 'golden' | 'night';

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface SceneConfig {
  palaceStyle: PalaceStyle;
  petalDensity: SakuraDensity;
  windStrength: number; // 0.2 to 2.0
  timeOfDay: TimeOfDay;
}

export interface PalaceSceneHandle {
  applyPreset: (presetId: CameraPresetId) => void;
  captureSnapshot: () => string | null;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'grand',
    label: 'Grand Vista',
    position: [13, 8.2, 26.5],
    target: [0.5, 4.8, -6],
  },
  {
    id: 'koi',
    label: 'Pond View',
    position: [6.8, 3.6, 19.2],
    target: [1.5, -0.3, 10.5],
  },
  {
    id: 'bridge',
    label: 'Bridge View',
    position: [-2.8, 3.1, 14.5],
    target: [-10.2, 1.3, 6.2],
  },
  {
    id: 'keep',
    label: 'Palace View',
    position: [15.5, 9.5, 1.5],
    target: [5.5, 10.2, -21],
  },
  {
    id: 'mountain',
    label: 'Horizon View',
    position: [18, 6.8, 18.5],
    target: [-24, 10.5, -65],
  },
];

export const PETAL_COUNTS: Record<SakuraDensity, number> = {
  calm: 240,
  breeze: 640,
  flurry: 1200,
};
