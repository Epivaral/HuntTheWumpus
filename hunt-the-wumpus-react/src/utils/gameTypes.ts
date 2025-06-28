export type CellType = 'empty' | 'agent' | 'wumpus' | 'bat' | 'pit' | 'gold';

export interface Cell {
  type: CellType;
  explored: boolean;
}

export interface AgentState {
  stack: { x: number; y: number }[];
  visited: boolean[][];
  arrows: number;
  hasGold: boolean;
  path: { x: number; y: number }[];
  autoMode: boolean;
  justShot?: boolean; // Prevents multiple shots per move
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
  agentState?: AgentState;
  actionLog?: string[];
}
