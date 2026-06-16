import React from 'react';
import { GridCell, BUILDING_STATS, WIRE_CONNECTIONS, SAIL_ROTATION_NAMES } from '../utils/constants';
import { useGameStore } from '../store/useGameStore';
import { WindmillModifierResult } from '../utils/windSystem';

interface BuildingProps {
  cell: GridCell;
}

export const Building: React.FC<BuildingProps> = ({ cell }) => {
  const windmillModifier = useGameStore((state) =>
    state.windmillModifiers.get(`${cell.x},${cell.y}`)
  );
  const windmillActualGen = useGameStore((state) =>
    state.windmillActualGens.get(`${cell.x},${cell.y}`)
  );

  if (cell.type === 'empty') return null;

  if (cell.type === 'wire') {
    return <WireVisual rotation={cell.rotation} powered={cell.powered} faulty={cell.faulty} />;
  }

  if (cell.type === 'sail') {
    return <SailVisual rotation={cell.rotation} faulty={cell.faulty} />;
  }

  const stats = BUILDING_STATS[cell.type];
  const isRotating = cell.type === 'windmill' && cell.powered && !cell.faulty;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className={`text-3xl transition-all duration-200 ${
          cell.powered && !cell.faulty ? 'scale-100 drop-shadow-lg' : 'opacity-60 scale-95'
        } ${isRotating ? 'animate-[spin_3s_linear_infinite]' : ''}`}
        style={{
          filter: cell.faulty
            ? 'hue-rotate(-50deg) saturate(2)'
            : cell.powered
            ? 'none'
            : 'grayscale(50%)',
        }}
      >
        {stats.emoji}
      </div>
      {cell.type === 'windmill' && windmillModifier && windmillActualGen !== undefined && (
        <WindmillBadge modifier={windmillModifier} actualGen={windmillActualGen} faulty={cell.faulty} />
      )}
      {cell.faulty && (
        <div className="absolute -top-1 -right-1 text-sm animate-pulse">⚠️</div>
      )}
      {cell.type === 'battery' && !cell.faulty && (
        <div className="absolute bottom-0 left-1 right-1 h-1.5 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500"
            style={{ width: `${Math.min(100, cell.powered ? 80 : 30)}%` }}
          />
        </div>
      )}
    </div>
  );
};

interface WindmillBadgeProps {
  modifier: WindmillModifierResult;
  actualGen: number;
  faulty: boolean;
}

const WindmillBadge: React.FC<WindmillBadgeProps> = ({ modifier, actualGen, faulty }) => {
  if (faulty) return null;

  const percent = Math.round((modifier.multiplier - 1) * 100);
  const sign = percent >= 0 ? '+' : '';

  let bgColor = 'bg-gray-500';
  let textColor = 'text-white';
  let label = `${sign}${percent}%`;

  if (modifier.sailBoosted) {
    bgColor = 'bg-purple-500';
    label = `⛵${sign}${percent}%`;
  } else if (modifier.isTailwind && modifier.shadowLevel === 0) {
    bgColor = 'bg-green-500';
    label = `顺风${sign}${percent}%`;
  } else if (modifier.isTailwind && modifier.shadowLevel > 0) {
    bgColor = 'bg-yellow-500';
    label = `顺风${sign}${percent}%`;
  } else if (modifier.isHeadwind) {
    bgColor = 'bg-red-500';
    label = `逆风${sign}${percent}%`;
  } else if (modifier.shadowLevel > 0) {
    bgColor = 'bg-orange-500';
    label = `遮挡${sign}${percent}%`;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none">
      <div
        className={`px-1 py-0.5 rounded-t-md text-[9px] font-bold ${bgColor} ${textColor} shadow-md whitespace-nowrap`}
      >
        {label} · {actualGen.toFixed(1)}⚡
      </div>
    </div>
  );
};

interface SailVisualProps {
  rotation: number;
  faulty: boolean;
}

const SailVisual: React.FC<SailVisualProps> = ({ rotation, faulty }) => {
  const rotations = ['rotate-0', 'rotate-90', 'rotate-180', '-rotate-90'];
  const normalizedRot = ((rotation % 4) + 4) % 4;
  const rotationClass = rotations[normalizedRot];
  const rotationName = SAIL_ROTATION_NAMES[normalizedRot];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className={`text-3xl transition-all duration-300 ${rotationClass} ${
          faulty ? 'opacity-60' : ''
        }`}
        style={{
          filter: faulty ? 'hue-rotate(-50deg) saturate(2)' : 'drop-shadow-lg',
        }}
      >
        ⛵
      </div>
      {faulty && <div className="absolute -top-1 -right-1 text-xs animate-pulse">⚠️</div>}
      <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none">
        <span className="text-[8px] bg-cyan-500/90 text-white px-1 rounded-b-md font-bold shadow">
          {rotationName}
        </span>
      </div>
    </div>
  );
};

interface WireVisualProps {
  rotation: number;
  powered: boolean;
  faulty: boolean;
}

const WireVisual: React.FC<WireVisualProps> = ({ rotation, powered, faulty }) => {
  const connections = WIRE_CONNECTIONS[rotation % 6] || [true, false, true, false];
  const [top, right, bottom, left] = connections;

  const baseColor = faulty
    ? '#EF4444'
    : powered
    ? '#3B82F6'
    : '#9CA3AF';
  const glowColor = faulty
    ? 'rgba(239, 68, 68, 0.6)'
    : powered
    ? 'rgba(59, 130, 246, 0.5)'
    : 'transparent';

  const lineStyle: React.CSSProperties = {
    backgroundColor: baseColor,
    boxShadow: powered || faulty ? `0 0 8px ${glowColor}` : 'none',
    transition: 'all 0.3s ease',
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {top && (
        <div
          className="absolute left-1/2 top-0 w-1.5 h-1/2 -translate-x-1/2 rounded-full"
          style={lineStyle}
        />
      )}
      {right && (
        <div
          className="absolute right-0 top-1/2 w-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={lineStyle}
        />
      )}
      {bottom && (
        <div
          className="absolute left-1/2 bottom-0 w-1.5 h-1/2 -translate-x-1/2 rounded-full"
          style={lineStyle}
        />
      )}
      {left && (
        <div
          className="absolute left-0 top-1/2 w-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={lineStyle}
        />
      )}
      <div
        className={`absolute left-1/2 top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
          powered && !faulty ? 'animate-pulse' : ''
        }`}
        style={{
          backgroundColor: baseColor,
          boxShadow: powered || faulty ? `0 0 10px ${glowColor}` : 'none',
        }}
      />
      {faulty && (
        <div className="absolute -top-1 -right-1 text-xs animate-pulse">⚠️</div>
      )}
    </div>
  );
};
