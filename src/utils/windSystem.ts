import {
  GridCell,
  GRID_SIZE,
  WIND_DIRECTIONS,
  SAIL_DIR_OFFSETS,
  WindField,
  WindCell,
  WIND_SHADOW_DECAY,
  WIND_MAX_SHADOW_LENGTH,
  SAIL_BOOST_MULTIPLIER,
  SAIL_REDIRECT_STRENGTH,
  BLOCKING_BUILDINGS,
} from './constants';

export function createEmptyWindField(globalDirIndex: number = 2, globalStrength: number = 1.0): WindField {
  const cells: WindCell[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: WindCell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({
        x,
        y,
        dirIndex: globalDirIndex,
        strength: globalStrength,
      });
    }
    cells.push(row);
  }
  return { cells, globalDirIndex, globalStrength };
}

export function randomizeWindDirection(currentDir: number): number {
  const offset = Math.floor(Math.random() * 3) - 1;
  return (currentDir + offset + WIND_DIRECTIONS.length) % WIND_DIRECTIONS.length;
}

export function normalizeDirIndex(index: number): number {
  const len = WIND_DIRECTIONS.length;
  return ((index % len) + len) % len;
}

export function computeWindField(grid: GridCell[][], globalDirIndex: number, globalStrength: number): WindField {
  const field = createEmptyWindField(globalDirIndex, globalStrength);
  const { cells } = field;
  const windDir = WIND_DIRECTIONS[globalDirIndex];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      cells[y][x].dirIndex = globalDirIndex;
      cells[y][x].strength = globalStrength;
    }
  }

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (BLOCKING_BUILDINGS.includes(cell.type)) {
        applyWindShadow(cells, x, y, windDir.dx, windDir.dy);
      }
    }
  }

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell.type === 'sail' && !cell.faulty) {
        applySailEffect(cells, grid, x, y, cell.rotation);
      }
    }
  }

  return field;
}

function applyWindShadow(
  cells: WindCell[][],
  startX: number,
  startY: number,
  windDx: number,
  windDy: number
): void {
  for (let step = 1; step <= WIND_MAX_SHADOW_LENGTH; step++) {
    const nx = startX + windDx * step;
    const ny = startY + windDy * step;

    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) break;

    const decay = 1 - WIND_SHADOW_DECAY * step;
    cells[ny][nx].strength = Math.max(0.1, cells[ny][nx].strength * decay);
  }
}

function applySailEffect(
  cells: WindCell[][],
  grid: GridCell[][],
  sailX: number,
  sailY: number,
  sailRotation: number
): void {
  const [sailDx, sailDy] = SAIL_DIR_OFFSETS[sailRotation % 4];
  const sailDirIndex = rotationToWindDirIndex(sailRotation);

  cells[sailY][sailX].dirIndex = sailDirIndex;
  cells[sailY][sailX].strength = Math.min(2.0, cells[sailY][sailX].strength * SAIL_BOOST_MULTIPLIER);

  for (let step = 1; step <= 2; step++) {
    const nx = sailX + sailDx * step;
    const ny = sailY + sailDy * step;

    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) break;

    const cell = grid[ny][nx];
    if (BLOCKING_BUILDINGS.includes(cell.type)) break;

    const distanceFactor = 1 - (step - 1) * 0.25;
    const blendFactor = SAIL_REDIRECT_STRENGTH * distanceFactor;

    cells[ny][nx].dirIndex = sailDirIndex;

    const boost = 1 + (SAIL_BOOST_MULTIPLIER - 1) * distanceFactor;
    cells[ny][nx].strength = Math.min(2.0, cells[ny][nx].strength * boost);
  }

  const oppositeRot = (sailRotation + 2) % 4;
  const [oppDx, oppDy] = SAIL_DIR_OFFSETS[oppositeRot];
  for (let step = 1; step <= 1; step++) {
    const nx = sailX + oppDx * step;
    const ny = sailY + oppDy * step;

    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) break;

    const cell = grid[ny][nx];
    if (BLOCKING_BUILDINGS.includes(cell.type)) break;

    cells[ny][nx].strength = Math.min(2.0, cells[ny][nx].strength * 1.2);
  }
}

function rotationToWindDirIndex(rotation: number): number {
  const mapping = [2, 6, 4, 0];
  return mapping[rotation % 4];
}

export interface WindmillModifierResult {
  multiplier: number;
  isTailwind: boolean;
  isHeadwind: boolean;
  shadowLevel: number;
  sailBoosted: boolean;
}

export function computeWindmillModifier(
  windField: WindField,
  millX: number,
  millY: number
): WindmillModifierResult {
  const windCell = windField.cells[millY]?.[millX];
  if (!windCell) {
    return { multiplier: 1, isTailwind: false, isHeadwind: false, shadowLevel: 0, sailBoosted: false };
  }

  const baseStrength = windField.globalStrength;
  const actualStrength = windCell.strength;

  const strengthRatio = actualStrength / baseStrength;
  const shadowLevel = strengthRatio < 0.95 ? Math.round((1 - strengthRatio) * 5) : 0;

  let directionMultiplier = 1;
  let isTailwind = false;
  let isHeadwind = false;

  const diff = Math.abs(normalizeDirIndex(windCell.dirIndex) - normalizeDirIndex(windField.globalDirIndex));
  const half = WIND_DIRECTIONS.length / 2;
  const dirDiff = diff > half ? WIND_DIRECTIONS.length - diff : diff;

  if (dirDiff === 0 || dirDiff === 1) {
    directionMultiplier = 1.35;
    isTailwind = true;
  } else if (dirDiff === 2 || dirDiff === 3) {
    directionMultiplier = 1.0;
  } else {
    directionMultiplier = 0.7;
    isHeadwind = true;
  }

  const sailBoosted = actualStrength > baseStrength * 1.05 && dirDiff <= 1;

  let multiplier = directionMultiplier * strengthRatio;
  multiplier = Math.max(0.3, Math.min(2.2, multiplier));

  return { multiplier, isTailwind, isHeadwind, shadowLevel, sailBoosted };
}

export function getWindmillModifiedGen(
  baseGen: number,
  modifier: WindmillModifierResult
): number {
  return Math.round(baseGen * modifier.multiplier * 100) / 100;
}
