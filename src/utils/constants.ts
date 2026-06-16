export type CellType = 'empty' | 'windmill' | 'house' | 'factory' | 'battery' | 'wire' | 'sail';

export type ToolType = CellType | 'remove';

export interface GridCell {
  x: number;
  y: number;
  type: CellType;
  rotation: number;
  powered: boolean;
  faulty: boolean;
}

export const GRID_SIZE = 8;

export const BUILDING_STATS = {
  windmill: { dayGen: 5, nightGen: 1, consumption: 0, name: '风车', emoji: '🌀' },
  house: { dayGen: 0, nightGen: 0, consumption: 2, name: '住房', emoji: '🏠' },
  factory: { dayGen: 0, nightGen: 0, consumption: 4, name: '工坊', emoji: '🏭' },
  battery: { dayGen: 0, nightGen: 0, consumption: 0, storage: 20, name: '蓄电池', emoji: '🔋' },
  wire: { dayGen: 0, nightGen: 0, consumption: 0, name: '电线', emoji: '⚡' },
  sail: { dayGen: 0, nightGen: 0, consumption: 0, name: '导风帆', emoji: '⛵' },
} as const;

export const WIRE_CONNECTIONS: Record<number, [boolean, boolean, boolean, boolean]> = {
  0: [true, false, true, false],
  1: [false, true, false, true],
  2: [true, true, false, false],
  3: [true, false, false, true],
  4: [false, true, true, false],
  5: [false, false, true, true],
};

export const DIR_OFFSETS: Array<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const WIND_DIRECTIONS: Array<{ dx: number; dy: number; name: string; angle: number }> = [
  { dx: 0, dy: -1, name: '北', angle: 270 },
  { dx: 1, dy: -1, name: '东北', angle: 315 },
  { dx: 1, dy: 0, name: '东', angle: 0 },
  { dx: 1, dy: 1, name: '东南', angle: 45 },
  { dx: 0, dy: 1, name: '南', angle: 90 },
  { dx: -1, dy: 1, name: '西南', angle: 135 },
  { dx: -1, dy: 0, name: '西', angle: 180 },
  { dx: -1, dy: -1, name: '西北', angle: 225 },
];

export const SAIL_DIR_OFFSETS: Array<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const SAIL_ROTATION_NAMES = ['朝上↑', '朝右→', '朝下↓', '朝左←'];

export interface WindCell {
  x: number;
  y: number;
  dirIndex: number;
  strength: number;
}

export interface WindField {
  cells: WindCell[][];
  globalDirIndex: number;
  globalStrength: number;
}

export const WIND_CHANGE_CHANCE = 0.02;
export const WIND_SHADOW_DECAY = 0.25;
export const WIND_MAX_SHADOW_LENGTH = 3;
export const SAIL_BOOST_MULTIPLIER = 1.6;
export const SAIL_REDIRECT_STRENGTH = 0.9;

export const BLOCKING_BUILDINGS: CellType[] = ['house', 'factory', 'battery'];

export const TOOLS: Array<{ type: ToolType; name: string; emoji: string; description: string }> = [
  { type: 'windmill', name: '风车', emoji: '🌀', description: '白天+5电，夜晚+1电，顺风加成' },
  { type: 'sail', name: '导风帆', emoji: '⛵', description: '引导风向，增强风车发电' },
  { type: 'house', name: '住房', emoji: '🏠', description: '消耗2电，提供满意度' },
  { type: 'factory', name: '工坊', emoji: '🏭', description: '消耗4电，生产物资' },
  { type: 'battery', name: '蓄电池', emoji: '🔋', description: '存储20电量' },
  { type: 'wire', name: '电线', emoji: '⚡', description: '传导电力，右键/R旋转' },
  { type: 'remove', name: '拆除', emoji: '🗑️', description: '移除建筑或电线' },
];

export const DAY_LENGTH = 100;
export const DAY_THRESHOLD = 50;
export const TICK_INTERVAL = 300;
export const FAULT_CHANCE = 0.002;
