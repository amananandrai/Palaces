import { Camera } from 'lucide-react';
import { PALACE_OPTIONS, type PalaceStyle } from '../scene/types';

interface NavbarProps {
  activePalace: PalaceStyle;
  onSelectPalace: (style: PalaceStyle) => void;
  onCaptureImage: () => void;
}

export function Navbar({ activePalace, onSelectPalace, onCaptureImage }: NavbarProps) {
  return (
    <header
      className="fixed top-0 right-0 left-0 z-30 flex items-center justify-between gap-8 border-b border-[#f5efe6]/12 px-5 py-2.5 sm:px-6"
      style={{ backgroundColor: 'rgba(22, 19, 18, 0.88)' }}
    >
      {/* Zone 1: Single-line Brand Wordmark */}
      <span className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[#f5efe6] whitespace-nowrap shrink-0">
        Imperial Palaces
      </span>

      {/* Zone 2: Clean Single-Line Architectural Style Links */}
      <nav
        aria-label="Palace styles"
        className="flex items-center gap-4 sm:gap-6 overflow-x-auto"
      >
        {PALACE_OPTIONS.map((palace) => {
          const isActive = activePalace === palace.id;
          return (
            <button
              key={palace.id}
              type="button"
              onClick={() => onSelectPalace(palace.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`border-b-2 py-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#d98a4e] ${
                isActive
                  ? 'border-[#d98a4e] text-[#f5efe6]'
                  : 'border-transparent text-[#b8afa6] hover:border-[#f5efe6]/30 hover:text-[#f5efe6]'
              }`}
            >
              {palace.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single Primary Action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onCaptureImage}
          title="Download PNG snapshot of current 3D view"
          className="inline-flex items-center gap-1.5 rounded-md border border-[#f5efe6]/16 bg-[#f5efe6]/10 px-3 py-1.5 text-xs font-medium text-[#f5efe6] transition-colors hover:bg-[#f5efe6]/18 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#d98a4e]"
        >
          <Camera className="h-3.5 w-3.5 text-[#d98a4e]" aria-hidden="true" />
          <span>Snapshot</span>
        </button>
      </div>
    </header>
  );
}
