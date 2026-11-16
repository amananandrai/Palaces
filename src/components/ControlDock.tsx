import { ChevronDown, ChevronUp, Moon, Sun, Volume2, VolumeX, Wind } from 'lucide-react';
import {
  CAMERA_PRESETS,
  type CameraPresetId,
  type SakuraDensity,
  type TimeOfDay,
} from '../scene/types';

interface ControlDockProps {
  activePreset: CameraPresetId | null;
  onSelectPreset: (id: CameraPresetId) => void;
  timeOfDay: TimeOfDay;
  onChangeTimeOfDay: (timeOfDay: TimeOfDay) => void;
  petalDensity: SakuraDensity;
  onChangeDensity: (density: SakuraDensity) => void;
  windStrength: number;
  onChangeWind: (wind: number) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  audioVolume: number;
  onChangeVolume: (vol: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  particleLabel?: string;
}

const DENSITY_OPTIONS: Array<{ id: SakuraDensity; label: string }> = [
  { id: 'calm', label: 'Calm' },
  { id: 'breeze', label: 'Breeze' },
  { id: 'flurry', label: 'Flurry' },
];

export function ControlDock({
  activePreset,
  onSelectPreset,
  timeOfDay,
  onChangeTimeOfDay,
  petalDensity,
  onChangeDensity,
  windStrength,
  onChangeWind,
  audioEnabled,
  onToggleAudio,
  audioVolume,
  onChangeVolume,
  collapsed,
  onToggleCollapse,
  particleLabel = 'Atmospheric particle density',
}: ControlDockProps) {
  return (
    <div
      className={`pointer-events-none fixed bottom-4 left-1/2 z-30 w-[min(1080px,96vw)] -translate-x-1/2 transition-transform duration-300 ease-out ${
        collapsed ? 'translate-y-[calc(100%-34px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Zen Mode Handle */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          title="Toggle controls (H)"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-[#f5efe6]/15 bg-[#161312]/90 px-3.5 py-1 text-xs font-medium text-[#d6cdc3] transition-colors hover:text-[#f5efe6] focus-visible:outline-2 focus-visible:outline-[#d98a4e] whitespace-nowrap shrink-0 cursor-pointer"
        >
          {collapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      {/* Unified Horizontal Bottom Control Dock (solid/rgba surface — no backdrop-filter over WebGL) */}
      <div
        className="pointer-events-auto rounded-xl border border-[#f5efe6]/14 px-3.5 py-2.5 shadow-2xl"
        style={{ backgroundColor: 'rgba(22, 19, 18, 0.90)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Camera Presets */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Camera views">
            {CAMERA_PRESETS.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#d98a4e] ${
                    isActive
                      ? 'bg-[#d98a4e] text-[#161312]'
                      : 'bg-[#f5efe6]/6 text-[#d6cdc3] hover:bg-[#f5efe6]/12 hover:text-[#f5efe6]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Time of Day Toggle & Sakura Density */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-0.5 rounded-md bg-[#f5efe6]/5 p-0.5" role="group" aria-label="Time of day">
              <button
                type="button"
                onClick={() => onChangeTimeOfDay('golden')}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#d98a4e] ${
                  timeOfDay === 'golden'
                    ? 'bg-[#d98a4e] text-[#161312]'
                    : 'text-[#a89f96] hover:text-[#f5efe6]'
                }`}
              >
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Golden Hour</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeTimeOfDay('night')}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#d98a4e] ${
                  timeOfDay === 'night'
                    ? 'bg-[#3c568f] text-[#f5efe6]'
                    : 'text-[#a89f96] hover:text-[#f5efe6]'
                }`}
              >
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Moonlit Night</span>
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-md bg-[#f5efe6]/5 p-0.5" role="group" aria-label={particleLabel}>
              {DENSITY_OPTIONS.map((opt) => {
                const active = petalDensity === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeDensity(opt.id)}
                    className={`rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#d98a4e] ${
                      active
                        ? 'bg-[#f5efe6]/18 text-[#f5efe6]'
                        : 'text-[#a89f96] hover:text-[#f5efe6]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <label className="hidden xl:flex items-center gap-1.5 text-xs text-[#a89f96]" title="Garden breeze">
              <Wind className="h-3.5 w-3.5 text-[#d98a4e]" aria-hidden="true" />
              <input
                type="range"
                min={0.2}
                max={2.0}
                step={0.1}
                value={windStrength}
                onChange={(e) => onChangeWind(parseFloat(e.target.value))}
                aria-label="Wind strength"
                className="sanctuary-slider w-14"
              />
            </label>
          </div>

          {/* Ambient Audio */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleAudio}
              aria-pressed={audioEnabled}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#d98a4e] ${
                audioEnabled
                  ? 'border-[#d98a4e]/50 bg-[#d98a4e]/15 text-[#f5efe6]'
                  : 'border-[#f5efe6]/12 bg-[#f5efe6]/5 text-[#d6cdc3] hover:bg-[#f5efe6]/10'
              }`}
            >
              {audioEnabled ? (
                <Volume2 className="h-3.5 w-3.5 text-[#d98a4e]" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-[#a89f96]" aria-hidden="true" />
              )}
              <span>{audioEnabled ? 'Sound On' : 'Sound Off'}</span>
            </button>

            {audioEnabled && (
              <input
                type="range"
                min={0.05}
                max={1.0}
                step={0.05}
                value={audioVolume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                aria-label="Ambient sound volume"
                className="sanctuary-slider hidden md:block w-14"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
