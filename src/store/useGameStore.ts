import { create } from 'zustand';
import {
  GridCell,
  ToolType,
  GRID_SIZE,
  DAY_LENGTH,
  FAULT_CHANCE,
  BUILDING_STATS,
  DAY_THRESHOLD,
  WindField,
  WIND_CHANGE_CHANCE,
  WIND_DIRECTIONS,
} from '../utils/constants';
import { calculatePowerNetwork, countPoweredBuildings } from '../utils/powerCalculator';
import {
  createEmptyWindField,
  randomizeWindDirection,
  computeWindField,
} from '../utils/windSystem';
import { WindmillModifierResult } from '../utils/windSystem';

const STORAGE_KEY = 'floating-island-grid-game-save';

interface PersistedState {
  grid: GridCell[][];
  dayTime: number;
  storedPower: number;
  satisfaction: number;
  windDirIndex: number;
  windStrength: number;
}

interface GameState {
  grid: GridCell[][];
  dayTime: number;
  storedPower: number;
  maxStorage: number;
  satisfaction: number;
  selectedTool: ToolType;
  poweredCells: Set<string>;
  totalGeneration: number;
  totalConsumption: number;
  showSettlement: boolean;
  windField: WindField;
  windmillModifiers: Map<string, WindmillModifierResult>;
  windmillActualGens: Map<string, number>;
  setSelectedTool: (tool: ToolType) => void;
  placeOrRemove: (x: number, y: number) => void;
  rotateCell: (x: number, y: number) => void;
  repairCell: (x: number, y: number) => void;
  tick: () => void;
  resetGame: () => void;
  openSettlement: () => void;
  closeSettlement: () => void;
}

function createEmptyGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({
        x,
        y,
        type: 'empty',
        rotation: 0,
        powered: false,
        faulty: false,
      });
    }
    grid.push(row);
  }
  return grid;
}

function saveToLocalStorage(state: PersistedState): void {
  try {
    const data = JSON.stringify({
      grid: state.grid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
      windDirIndex: state.windDirIndex,
      windStrength: state.windStrength,
    });
    localStorage.setItem(STORAGE_KEY, data);
  } catch {
    // ignore storage errors
  }
}

function loadFromLocalStorage(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.grid && Array.isArray(data.grid)) {
      return {
        grid: data.grid,
        dayTime: data.dayTime ?? 20,
        storedPower: data.storedPower ?? 10,
        satisfaction: data.satisfaction ?? 50,
        windDirIndex: data.windDirIndex ?? 2,
        windStrength: data.windStrength ?? 1.0,
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function recalcGrid(
  grid: GridCell[][],
  dayTime: number,
  storedPower: number,
  globalDirIndex: number,
  globalStrength: number
) {
  const windField = computeWindField(grid, globalDirIndex, globalStrength);
  const {
    poweredCells,
    totalGeneration,
    totalConsumption,
    batteryCapacity,
    windmillModifiers,
    windmillActualGens,
  } = calculatePowerNetwork(grid, dayTime, storedPower, windField);

  const newGrid = grid.map((row) => row.map((c) => ({ ...c })));
  for (let yy = 0; yy < GRID_SIZE; yy++) {
    for (let xx = 0; xx < GRID_SIZE; xx++) {
      newGrid[yy][xx].powered = poweredCells.has(`${xx},${yy}`);
    }
  }

  return {
    newGrid,
    poweredCells,
    totalGeneration,
    totalConsumption,
    batteryCapacity,
    windField,
    windmillModifiers,
    windmillActualGens,
  };
}

function initGame(): Omit<GameState, keyof GameStateActions> {
  const saved = loadFromLocalStorage();
  const grid = saved ? saved.grid : createEmptyGrid();
  const dayTime = saved ? saved.dayTime : 20;
  const storedPower = saved ? saved.storedPower : 10;
  const satisfaction = saved ? saved.satisfaction : 50;
  const windDirIndex = saved ? saved.windDirIndex : 2;
  const windStrength = saved ? saved.windStrength : 1.0;

  const result = recalcGrid(grid, dayTime, storedPower, windDirIndex, windStrength);

  return {
    grid: result.newGrid,
    dayTime,
    storedPower,
    maxStorage: result.batteryCapacity,
    satisfaction,
    selectedTool: 'windmill',
    poweredCells: result.poweredCells,
    totalGeneration: result.totalGeneration,
    totalConsumption: result.totalConsumption,
    showSettlement: false,
    windField: result.windField,
    windmillModifiers: result.windmillModifiers,
    windmillActualGens: result.windmillActualGens,
  };
}

type GameStateActions = Pick<
  GameState,
  | 'setSelectedTool'
  | 'placeOrRemove'
  | 'rotateCell'
  | 'repairCell'
  | 'tick'
  | 'resetGame'
  | 'openSettlement'
  | 'closeSettlement'
>;

export const useGameStore = create<GameState>((set, get) => ({
  ...initGame(),

  setSelectedTool: (tool) => set({ selectedTool: tool }),

  placeOrRemove: (x, y) => {
    const state = get();
    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));
    const cell = newGrid[y][x];
    const tool = state.selectedTool;

    if (tool === 'remove') {
      if (cell.type !== 'empty') {
        newGrid[y][x] = {
          ...cell,
          type: 'empty',
          rotation: 0,
          powered: false,
          faulty: false,
        };
      }
    } else {
      newGrid[y][x] = {
        ...cell,
        type: tool,
        rotation: tool === 'wire' ? cell.rotation % 6 : tool === 'sail' ? cell.rotation % 4 : 0,
        powered: false,
        faulty: false,
      };
    }

    const result = recalcGrid(
      newGrid,
      state.dayTime,
      state.storedPower,
      state.windField.globalDirIndex,
      state.windField.globalStrength
    );

    const nextState = {
      grid: result.newGrid,
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      maxStorage: result.batteryCapacity,
      windField: result.windField,
      windmillModifiers: result.windmillModifiers,
      windmillActualGens: result.windmillActualGens,
    };

    saveToLocalStorage({
      grid: result.newGrid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
      windDirIndex: state.windField.globalDirIndex,
      windStrength: state.windField.globalStrength,
    });

    set(nextState);
  },

  rotateCell: (x, y) => {
    const state = get();
    const cell = state.grid[y][x];
    if (cell.type !== 'wire' && cell.type !== 'sail') return;

    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));
    if (cell.type === 'wire') {
      newGrid[y][x].rotation = (cell.rotation + 1) % 6;
    } else if (cell.type === 'sail') {
      newGrid[y][x].rotation = (cell.rotation + 1) % 4;
    }

    const result = recalcGrid(
      newGrid,
      state.dayTime,
      state.storedPower,
      state.windField.globalDirIndex,
      state.windField.globalStrength
    );

    const nextState = {
      grid: result.newGrid,
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      maxStorage: result.batteryCapacity,
      windField: result.windField,
      windmillModifiers: result.windmillModifiers,
      windmillActualGens: result.windmillActualGens,
    };

    saveToLocalStorage({
      grid: result.newGrid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
      windDirIndex: state.windField.globalDirIndex,
      windStrength: state.windField.globalStrength,
    });

    set(nextState);
  },

  repairCell: (x, y) => {
    const state = get();
    const cell = state.grid[y][x];
    if (!cell.faulty) return;

    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));
    newGrid[y][x].faulty = false;

    const result = recalcGrid(
      newGrid,
      state.dayTime,
      state.storedPower,
      state.windField.globalDirIndex,
      state.windField.globalStrength
    );

    const nextState = {
      grid: result.newGrid,
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      maxStorage: result.batteryCapacity,
      windField: result.windField,
      windmillModifiers: result.windmillModifiers,
      windmillActualGens: result.windmillActualGens,
    };

    saveToLocalStorage({
      grid: result.newGrid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
      windDirIndex: state.windField.globalDirIndex,
      windStrength: state.windField.globalStrength,
    });

    set(nextState);
  },

  tick: () => {
    const state = get();
    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = newGrid[y][x];
        if (cell.type !== 'empty' && !cell.faulty && Math.random() < FAULT_CHANCE) {
          newGrid[y][x].faulty = true;
        }
      }
    }

    const newDayTime = (state.dayTime + 0.5) % DAY_LENGTH;

    let newWindDirIndex = state.windField.globalDirIndex;
    let newWindStrength = state.windField.globalStrength;

    if (Math.random() < WIND_CHANGE_CHANCE) {
      newWindDirIndex = randomizeWindDirection(newWindDirIndex);
    }
    if (Math.random() < 0.01) {
      const delta = (Math.random() - 0.5) * 0.1;
      newWindStrength = Math.max(0.6, Math.min(1.4, newWindStrength + delta));
    }

    const {
      poweredCells,
      totalGeneration,
      totalConsumption,
      batteryCapacity,
      windField,
      windmillModifiers,
      windmillActualGens,
    } = calculatePowerNetworkWithWind(
      newGrid,
      newDayTime,
      state.storedPower,
      newWindDirIndex,
      newWindStrength
    );

    for (let yy = 0; yy < GRID_SIZE; yy++) {
      for (let xx = 0; xx < GRID_SIZE; xx++) {
        newGrid[yy][xx].powered = poweredCells.has(`${xx},${yy}`);
      }
    }

    const netPower = totalGeneration - totalConsumption;
    let newStoredPower = state.storedPower;
    const isDay = newDayTime < DAY_THRESHOLD;

    if (batteryCapacity > 0) {
      if (netPower > 0) {
        newStoredPower = Math.min(batteryCapacity, state.storedPower + netPower * 0.3);
      } else if (netPower < 0 && !isDay) {
        const deficit = -netPower;
        const discharge = Math.min(state.storedPower, deficit * 0.5);
        newStoredPower = Math.max(0, state.storedPower - discharge);
      }
    }

    const { houses, poweredHouses, factories, poweredFactories } = countPoweredBuildings(
      newGrid,
      poweredCells
    );
    const totalBuildings = houses + factories;
    const totalPowered = poweredHouses + poweredFactories;
    let coverage = totalBuildings > 0 ? totalPowered / totalBuildings : 1;

    let newSatisfaction = state.satisfaction;
    if (coverage >= 0.8) {
      newSatisfaction = Math.min(100, state.satisfaction + 0.2);
    } else if (coverage >= 0.5) {
      newSatisfaction = Math.min(100, state.satisfaction + 0.05);
    } else {
      newSatisfaction = Math.max(0, state.satisfaction - 0.3);
    }

    saveToLocalStorage({
      grid: newGrid,
      dayTime: newDayTime,
      storedPower: newStoredPower,
      satisfaction: newSatisfaction,
      windDirIndex: newWindDirIndex,
      windStrength: newWindStrength,
    });

    set({
      grid: newGrid,
      dayTime: newDayTime,
      storedPower: newStoredPower,
      maxStorage: batteryCapacity,
      satisfaction: newSatisfaction,
      poweredCells,
      totalGeneration,
      totalConsumption,
      windField,
      windmillModifiers,
      windmillActualGens,
    });
  },

  resetGame: () => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = createEmptyGrid();
    const result = recalcGrid(fresh, 20, 10, 2, 1.0);
    set({
      grid: result.newGrid,
      dayTime: 20,
      storedPower: 10,
      maxStorage: result.batteryCapacity,
      satisfaction: 50,
      selectedTool: 'windmill',
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      showSettlement: false,
      windField: result.windField,
      windmillModifiers: result.windmillModifiers,
      windmillActualGens: result.windmillActualGens,
    });
  },

  openSettlement: () => set({ showSettlement: true }),
  closeSettlement: () => set({ showSettlement: false }),
}));

function calculatePowerNetworkWithWind(
  grid: GridCell[][],
  dayTime: number,
  storedPower: number,
  globalDirIndex: number,
  globalStrength: number
) {
  const windField = computeWindField(grid, globalDirIndex, globalStrength);
  const result = calculatePowerNetwork(grid, dayTime, storedPower, windField);
  return { ...result, windField };
}
