import { GameState, Cell, CellType } from './gameTypes';

const BOARD_SIZE = 20;
const NUM_BATS = 8;
const NUM_PITS = 4;

function getRandomEmptyCell(occupied: Set<string>): { x: number; y: number } {
  let x, y;
  do {
    x = Math.floor(Math.random() * BOARD_SIZE);
    y = Math.floor(Math.random() * BOARD_SIZE);
  } while (occupied.has(`${x},${y}`));
  occupied.add(`${x},${y}`);
  return { x, y };
}

export function createNewGame(): GameState {
  const occupied = new Set<string>();
  // Place agent
  const agentPos = getRandomEmptyCell(occupied);
  // Place wumpus
  const wumpusPos = getRandomEmptyCell(occupied);
  // Place gold
  const goldPos = getRandomEmptyCell(occupied);
  // Place bats
  const batPositions = Array.from({ length: NUM_BATS }, () => getRandomEmptyCell(occupied));
  // Place pits
  const pitPositions = Array.from({ length: NUM_PITS }, () => getRandomEmptyCell(occupied));

  // Build board
  const board: Cell[][] = Array.from({ length: BOARD_SIZE }, (_, y) =>
    Array.from({ length: BOARD_SIZE }, (_, x) => ({ type: 'empty', explored: false }))
  );
  board[agentPos.y][agentPos.x] = { type: 'agent', explored: true };
  board[wumpusPos.y][wumpusPos.x] = { type: 'wumpus', explored: false };
  board[goldPos.y][goldPos.x] = { type: 'gold', explored: false };
  batPositions.forEach(({ x, y }) => (board[y][x] = { type: 'bat', explored: false }));
  pitPositions.forEach(({ x, y }) => (board[y][x] = { type: 'pit', explored: false }));

  return {
    board,
    agentPos,
    wumpusPos,
    goldPos,
    batPositions,
    pitPositions,
    explored: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false)),
    status: 'playing',
    stats: { games: 1, victories: 0 },
  };
}
