import { useCallback, useEffect, useRef, useState } from 'react';
import { SanctuaryAudioEngine } from './audio/ambientAudio';
import { ControlDock } from './components/ControlDock';
import { Navbar } from './components/Navbar';
import { PalaceViewport } from './components/PalaceViewport';
import {
  PALACE_OPTIONS,
  type CameraPresetId,
  type PalaceSceneHandle,
  type PalaceStyle,
  type SakuraDensity,
  type TimeOfDay,
} from './scene/types';

export default function App() {
  const viewportRef = useRef<PalaceSceneHandle | null>(null);
  const audioRef = useRef<SanctuaryAudioEngine | null>(null);

  const [palaceStyle, setPalaceStyle] = useState<PalaceStyle>('japanese');
  const [activePreset, setActivePreset] = useState<CameraPresetId | null>('grand');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('golden');
  const [petalDensity, setPetalDensity] = useState<SakuraDensity>('breeze');
  const [windStrength, setWindStrength] = useState<number>(0.9);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(0.55);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [snapshotSaved, setSnapshotSaved] = useState<boolean>(false);

  const activePalaceMeta =
    PALACE_OPTIONS.find((p) => p.id === palaceStyle) ?? PALACE_OPTIONS[0];

  // Keyboard shortcut 'H' to toggle Zen Mode / HUD visibility
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Clean up Web Audio context on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  const handleSelectPreset = useCallback((id: CameraPresetId) => {
    setActivePreset(id);
    viewportRef.current?.applyPreset(id);
  }, []);

  const handleUserOrbit = useCallback(() => {
    setActivePreset(null);
  }, []);

  const handleToggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      if (next) {
        if (!audioRef.current) {
          audioRef.current = new SanctuaryAudioEngine();
        }
        void audioRef.current.start(audioVolume, windStrength);
      } else {
        audioRef.current?.stop();
      }
      return next;
    });
  }, [audioVolume, windStrength]);

  const handleChangeVolume = useCallback((vol: number) => {
    setAudioVolume(vol);
    audioRef.current?.setVolume(vol);
  }, []);

  const handleChangeWind = useCallback((wind: number) => {
    setWindStrength(wind);
    audioRef.current?.setWindStrength(wind);
  }, []);

  const handleCaptureImage = useCallback(() => {
    const dataUrl = viewportRef.current?.captureSnapshot();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `palace-${palaceStyle}-${timeOfDay}.png`;
    link.click();
    setSnapshotSaved(true);
    window.setTimeout(() => setSnapshotSaved(false), 2400);
  }, [palaceStyle, timeOfDay]);

  const handleSelectPalace = useCallback(
    (style: PalaceStyle) => {
      setPalaceStyle(style);
      if (activePreset === 'koi' || activePreset === 'bridge') {
        window.setTimeout(() => {
          viewportRef.current?.applyPreset(activePreset);
        }, 20);
      }
    },
    [activePreset],
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#161312] select-none">
      {/* Full-bleed 3D WebGL Scene */}
      <PalaceViewport
        ref={viewportRef}
        initialPreset="grand"
        config={{ palaceStyle, petalDensity, windStrength, timeOfDay }}
        onUserOrbit={handleUserOrbit}
      />

      {/* Top 3-Zone Navigation Bar for Palace Selection */}
      <Navbar
        activePalace={palaceStyle}
        onSelectPalace={handleSelectPalace}
        onCaptureImage={handleCaptureImage}
      />

      {/* Quiet Unboxed Active Palace Architectural Caption */}
      <div className="pointer-events-none fixed top-16 left-6 z-20 max-w-md">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#f5efe6] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
          {activePalaceMeta.title}
        </h1>
        <p className="mt-0.5 text-xs text-[#e5d8c8]/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)]">
          {activePalaceMeta.subtitle}
        </p>
      </div>

      {/* Brief Snapshot Confirmation Notice */}
      {snapshotSaved && (
        <div
          role="status"
          className="pointer-events-none fixed top-16 right-6 z-30 rounded-md border border-[#f5efe6]/15 px-3 py-1.5 text-xs font-medium text-[#f5efe6]"
          style={{ backgroundColor: 'rgba(22, 19, 18, 0.90)' }}
        >
          Snapshot saved
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock */}
      <ControlDock
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        timeOfDay={timeOfDay}
        onChangeTimeOfDay={setTimeOfDay}
        petalDensity={petalDensity}
        onChangeDensity={setPetalDensity}
        windStrength={windStrength}
        onChangeWind={handleChangeWind}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        audioVolume={audioVolume}
        onChangeVolume={handleChangeVolume}
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((prev) => !prev)}
        particleLabel={activePalaceMeta.particleLabel}
      />
    </main>
  );
}
