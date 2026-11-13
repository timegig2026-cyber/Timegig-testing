import React, { useMemo } from 'react';
import {
  Wrench,
  Hammer,
  Paintbrush,
  Scissors,
  Ruler,
  HardHat,
  Briefcase,
  PenTool,
  Settings,
  Compass,
  Key,
  Layers,
} from 'lucide-react';

const TOOL_ICONS = [
  Wrench,
  Hammer,
  Paintbrush,
  Scissors,
  Ruler,
  HardHat,
  Briefcase,
  PenTool,
  Settings,
  Compass,
  Key,
  Layers,
];

const TINTS = [
  'text-blue-600/[0.13]',
  'text-emerald-600/[0.13]',
  'text-amber-600/[0.14]',
  'text-slate-600/[0.12]',
  'text-indigo-600/[0.12]',
];

const ANIMATIONS = [
  'animate-float-tool-a',
  'animate-float-tool-b',
  'animate-float-tool-c',
];

const SIZES = ['w-6 h-6', 'w-7 h-7', 'w-8 h-8', 'w-9 h-9', 'w-10 h-10'];

interface ToolSprite {
  id: number;
  Icon: React.ElementType;
  topPct: number;
  leftPct: number;
  sizeClass: string;
  tintClass: string;
  animClass: string;
  delaySec: string;
  durationSec: string;
  baseRotateDeg: number;
}

export function FloatingToolsWallpaper({ className = '' }: { className?: string }) {
  const sprites = useMemo<ToolSprite[]>(() => {
    const cols = 4;
    const rows = 5;
    const items: ToolSprite[] = [];
    let id = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const Icon = TOOL_ICONS[Math.floor(Math.random() * TOOL_ICONS.length)];
        const cellTop = (r / rows) * 92 + 3;
        const cellLeft = (c / cols) * 90 + 4;
        const jitterTop = (Math.random() - 0.5) * 12;
        const jitterLeft = (Math.random() - 0.5) * 14;

        items.push({
          id: id++,
          Icon,
          topPct: Math.min(94, Math.max(2, cellTop + jitterTop)),
          leftPct: Math.min(93, Math.max(2, cellLeft + jitterLeft)),
          sizeClass: SIZES[Math.floor(Math.random() * SIZES.length)],
          tintClass: TINTS[Math.floor(Math.random() * TINTS.length)],
          animClass: ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)],
          delaySec: `${(Math.random() * 4).toFixed(2)}s`,
          durationSec: `${(5.5 + Math.random() * 4.5).toFixed(2)}s`,
          baseRotateDeg: Math.floor(Math.random() * 50) - 25,
        });
      }
    }

    return items;
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}
    >
      {sprites.map(({ id, Icon, topPct, leftPct, sizeClass, tintClass, animClass, delaySec, durationSec, baseRotateDeg }) => (
        <div
          key={id}
          className={`absolute ${tintClass}`}
          style={{
            top: `${topPct.toFixed(1)}%`,
            left: `${leftPct.toFixed(1)}%`,
            transform: `rotate(${baseRotateDeg}deg)`,
          }}
        >
          <Icon
            className={`${sizeClass} ${animClass}`}
            style={{
              animationDelay: delaySec,
              animationDuration: durationSec,
            }}
          />
        </div>
      ))}
    </div>
  );
}
