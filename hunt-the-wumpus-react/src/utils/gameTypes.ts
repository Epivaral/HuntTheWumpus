export type CellType = 'empty' | 'agent' | 'wumpus' | 'bat' | 'pit' | 'gold';

export interface Cell {
  type: CellType;
  explored: boolean;
}

export interface GameState {
  board: Cell[][];
  agentPos: { x: number; y: number };
  wumpusPos: { x: number; y: number };
  goldPos: { x: number; y: number };
  batPositions: { x: number; y: number }[];
  pitPositions: { x: number; y: number }[];
  explored: boolean[][];
  status: 'playing' | 'won' | 'lost';
  stats: {
    games: number;
    victories: number;
  };
}
