import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { WindCell, WIND_DIRECTIONS, GRID_SIZE, WindField } from '../utils/constants';

interface WindOverlayProps {
  cellSize?: number;
}

export const WindOverlay: React.FC<WindOverlayProps> = ({ cellSize = 56 }) => {
  const windField = useGameStore((state) => state.windField);
  const grid = useGameStore((state) => state.grid);

  if (!windField) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {windField.cells.map((row, y) =>
        row.map((windCell, x) => {
          const gridCell = grid[y]?.[x];
          if (!gridCell) return null;
          if (gridCell.type !== 'empty') return null;

          return (
            <WindArrow
              key={`${x}-${y}`}
              windCell={windCell}
              windField={windField}
              x={x}
              y={y}
              cellSize={cellSize}
            />
          );
        })
      )}
    </div>
  );
};

interface WindArrowProps {
  windCell: WindCell;
  windField: WindField;
  x: number;
  y: number;
  cellSize: number;
}

const WindArrow: React.FC<WindArrowProps> = ({ windCell, windField, x, y, cellSize }) => {
  const windDir = WIND_DIRECTIONS[windCell.dirIndex % WIND_DIRECTIONS.length];
  const angle = windDir.angle;

  const baseStrength = windField.globalStrength;
  const strengthRatio = windCell.strength / baseStrength;

  let arrowColor = getWindColor(strengthRatio, windCell, windField);
  let arrowOpacity = Math.min(1, 0.3 + strengthRatio * 0.5);
  let arrowSize = 12 + Math.min(12, strengthRatio * 12);
  let animateSpeed = strengthRatio > 1.1 ? 'animate-pulse' : '';

  const isSailModified = windCell.dirIndex !== windField.globalDirIndex;
  if (isSailModified) {
    arrowSize *= 1.1;
  }

  return (
    <div
      className={`absolute flex items-center justify-center ${animateSpeed}`}
      style={{
        left: x * cellSize,
        top: y * cellSize,
        width: cellSize,
        height: cellSize,
      }}
    >
      <div
        className="transition-all duration-300"
        style={{
          transform: `rotate(${angle}deg)`,
          opacity: arrowOpacity,
        }}
      >
        <svg
          width={arrowSize * 1.6}
          height={arrowSize}
          viewBox="0 0 32 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 10 H24 M24 10 L16 3 M24 10 L16 17"
            stroke={arrowColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: `drop-shadow(0 0 3px ${arrowColor}66)`,
            }}
          />
        </svg>
      </div>
    </div>
  );
};

function getWindColor(
  strengthRatio: number,
  windCell: WindCell,
  windField: WindField
): string {
  const isSailRedirected = windCell.dirIndex !== windField.globalDirIndex;

  if (isSailRedirected && strengthRatio > 1.05) {
    return '#A855F7';
  }

  if (strengthRatio >= 1.3) {
    return '#22C55E';
  }
  if (strengthRatio >= 1.1) {
    return '#10B981';
  }
  if (strengthRatio >= 0.95) {
    return '#06B6D4';
  }
  if (strengthRatio >= 0.75) {
    return '#F59E0B';
  }
  if (strengthRatio >= 0.5) {
    return '#F97316';
  }
  return '#EF4444';
}

interface WindInfoPanelProps {
  isNight?: boolean;
}

export const WindInfoPanel: React.FC<WindInfoPanelProps> = ({ isNight }) => {
  const windField = useGameStore((state) => state.windField);

  if (!windField) return null;

  const globalWindDir = WIND_DIRECTIONS[windField.globalDirIndex % WIND_DIRECTIONS.length];
  const strengthPercent = Math.round(windField.globalStrength * 100);

  let strengthLabel = '微风';
  let strengthEmoji = '🍃';
  if (windField.globalStrength >= 1.3) {
    strengthLabel = '强风';
    strengthEmoji = '💨';
  } else if (windField.globalStrength >= 1.1) {
    strengthLabel = '清风';
    strengthEmoji = '🌬️';
  } else if (windField.globalStrength >= 0.8) {
    strengthLabel = '微风';
    strengthEmoji = '🍃';
  } else if (windField.globalStrength >= 0.6) {
    strengthLabel = '弱风';
    strengthEmoji = '🌫️';
  }

  return (
    <div
      className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md ${
        isNight
          ? 'bg-slate-800/80 border-slate-700 text-slate-200'
          : 'bg-white/90 border-white/50 text-gray-700'
      }`}
    >
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        🧭 实时风向
      </h3>

      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center"
        >
          <div
          style={{
            transform: `rotate(${globalWindDir.angle}deg)`,
          }}
        >
          <span className="text-2xl">➡️</span>
        </div>
      </div>
        <div>
          <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
            风向
          </p>
          <p className="text-lg font-bold">{globalWindDir.name}风</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className={`text-xs ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
            {strengthEmoji} 风力
          </span>
          <span className="text-xs font-semibold">{strengthLabel}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, strengthPercent)}%`,
              background:
                windField.globalStrength >= 1.1
                  ? 'linear-gradient(90deg, #06B6D4, #22C55E)'
                  : windField.globalStrength >= 0.8
                  ? 'linear-gradient(90deg, #F59E0B, #06B6D4)'
                  : 'linear-gradient(90deg, #F97316, #F59E0B)',
            }}
          />
        </div>
      </div>

      <div className={`mt-3 pt-3 border-t ${isNight ? 'border-slate-700' : 'border-gray-200'}`}>
        <h4 className={`text-xs font-semibold mb-2 ${isNight ? 'text-slate-300' : 'text-gray-600'}`}>
          💡 风向提示
        </h4>
        <ul className={`text-[10px] space-y-1 ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
          <li>• 顺风风车发电量 <span className="text-green-500 font-bold">+35%</span></li>
          <li>• 逆风风车发电量 <span className="text-red-500 font-bold">-30%</span></li>
          <li>• 建筑会形成风影，降低后向风力</li>
          <li>• 导风帆可改变局部风向，强化风车</li>
        </ul>
      </div>
    </div>
  );
};

interface WindLegendProps {
  isNight?: boolean;
}

export const WindLegend: React.FC<WindLegendProps> = ({ isNight }) => {
  const legendItems = [
    { color: '#22C55E', label: '强风 (+30%以上)', emoji: '💨' },
    { color: '#06B6D4', label: '正常风力', emoji: '🌬️' },
    { color: '#F59E0B', label: '风影减弱', emoji: '🏠' },
    { color: '#EF4444', label: '严重遮挡', emoji: '⚠️' },
    { color: '#A855F7', label: '导风帆引导', emoji: '⛵' },
  ];

  return (
    <div
      className={`rounded-2xl p-3 shadow-xl border backdrop-blur-md ${
        isNight
          ? 'bg-slate-800/80 border-slate-700 text-slate-200'
          : 'bg-white/90 border-white/50 text-gray-700'
      }`}
    >
      <h4 className={`text-xs font-bold mb-2 ${isNight ? 'text-slate-300' : 'text-gray-600'}`}>
        🎨 箭头图例
      </h4>
      <ul className="space-y-1">
        {legendItems.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className={`text-[10px] ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
              {item.emoji} {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
