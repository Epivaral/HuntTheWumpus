import { GameState, Cell, CellType, AgentState } from './gameTypes';

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
    actionLog: [
      `Game started. Agent at (${agentPos.x + 1},${agentPos.y + 1})`,
      `Wumpus at (${wumpusPos.x + 1},${wumpusPos.y + 1})`,
      `Gold at (${goldPos.x + 1},${goldPos.y + 1})`,
    ],
  };
}

export function createAgentState(agentPos: { x: number; y: number }): AgentState {
  return {
    stack: [agentPos],
    visited: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false)),
    arrows: 3,
    hasGold: false,
    path: [agentPos],
    autoMode: true,
  };
}

// Directions: up, right, down, left
const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

function isValid(x: number, y: number) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

// Helper: get adjacent cells
function getAdjacent(x: number, y: number) {
  return DIRS
    .map(({ dx, dy }) => ({ x: x + dx, y: y + dy }))
    .filter(({ x, y }) => isValid(x, y));
}

// Helper: detect threats in adjacent cells
function detectThreats(game: GameState, x: number, y: number) {
  let dangerLevel = 0;
  let adjWumpus: { x: number; y: number } | null = null;
  let adjBats = 0, adjPits = 0;
  for (const { x: nx, y: ny } of getAdjacent(x, y)) {
    const t = game.board[ny][nx].type;
    if (t === 'wumpus') {
      dangerLevel += 50;
      adjWumpus = { x: nx, y: ny };
    } else if (t === 'pit') {
      dangerLevel += 20;
      adjPits++;
    } else if (t === 'bat') {
      dangerLevel += 10;
      adjBats++;
    }
  }
  return { dangerLevel, adjWumpus, adjBats, adjPits };
}

export function agentStep(game: GameState): GameState {
  if (!game.agentState || game.status !== 'playing') return game;
  const agent = game.agentState;
  if (agent.stack.length === 0) return { ...game, status: 'lost', actionLog: [...(game.actionLog || []), 'Agent ran out of moves. Lost!'] };
  const curr = agent.stack[agent.stack.length - 1];
  agent.visited[curr.y][curr.x] = true;
  game.explored[curr.y][curr.x] = true;
  let log = game.actionLog ? [...game.actionLog] : [];
  log.push(`Agent moved to (${curr.x + 1},${curr.y + 1})`);
  // Update agentPos for UI
  game.agentPos = { x: curr.x, y: curr.y };

  // Check for gold
  if (curr.x === game.goldPos.x && curr.y === game.goldPos.y && !agent.hasGold) {
    agent.hasGold = true;
    log.push('Agent found the gold! WON!');
    return { ...game, status: 'won', actionLog: log };
  }
  // Check for threats (pit, wumpus, bat)
  const cell = game.board[curr.y][curr.x];
  if (cell.type === 'pit') {
    log.push('Agent fell into a pit at this cell. Lost!');
    return { ...game, status: 'lost', actionLog: log };
  }
  if (cell.type === 'wumpus') {
    log.push('Agent encountered the Wumpus at this cell. Lost!');
    return { ...game, status: 'lost', actionLog: log };
  }
  if (cell.type === 'bat') {
    // Bat: teleport, reset stack but keep visited and known dangers
    const empty: { x: number; y: number }[] = [];
    for (let y = 0; y < BOARD_SIZE; y++) for (let x = 0; x < BOARD_SIZE; x++)
      if (game.board[y][x].type === 'empty' && !agent.visited[y][x]) empty.push({ x, y });
    if (empty.length > 0) {
      const idx = Math.floor(Math.random() * empty.length);
      agent.stack = [empty[idx]];
      agent.path = [empty[idx]];
      // Do NOT reset visited, but reset stack and path (exploration history)
      log.push(`Agent was carried by bats from (${curr.x + 1},${curr.y + 1}) to (${empty[idx].x + 1},${empty[idx].y + 1})! Exploration history reset, known dangers kept.`);
      return { ...game, actionLog: log };
    }
  }
  // Detect adjacent threats and log sensory messages
  const { dangerLevel, adjWumpus, adjBats, adjPits } = detectThreats(game, curr.x, curr.y);
  if (adjWumpus) log.push('You smell something terrible nearby.');
  if (adjPits) log.push('You feel a breeze nearby.');
  if (adjBats) log.push('You hear flapping nearby.');

  // Wumpus shooting logic
  if (adjWumpus && agent.arrows > 0) {
    agent.arrows--;
    const hit = Math.random() < 0.5 || (adjWumpus.x === curr.x || adjWumpus.y === curr.y);
    log.push(`Agent senses the Wumpus nearby and shoots. Arrows left: ${agent.arrows}`);
    if (hit) {
      game.board[adjWumpus.y][adjWumpus.x].type = 'empty';
      log.push('Agent killed the Wumpus! WON!');
      return { ...game, status: 'won', actionLog: log };
    } else {
      log.push('Agent missed the Wumpus and backtracks.');
      agent.stack.pop();
      return { ...game, actionLog: log };
    }
  } else if (adjWumpus && agent.arrows === 0) {
    log.push('Agent senses the Wumpus nearby but has no arrows left. Backtracking.');
    agent.stack.pop();
    return { ...game, actionLog: log };
  }
  // Pit or bat adjacent: backtrack if dangerLevel > 10 (pit or bat), but not for first bat encounter
  if (dangerLevel > 10) {
    log.push('Agent senses danger (pit or bats) and backtracks.');
    agent.stack.pop();
    return { ...game, actionLog: log };
  } else if (dangerLevel === 10) {
    log.push('Agent hears bats but continues.');
  }
  // DFS: explore unexplored neighbors (allow visiting any cell, not just empty)
  const neighbors = getAdjacent(curr.x, curr.y);
  for (const n of neighbors) {
    if (!agent.visited[n.y][n.x]) {
      agent.stack.push(n);
      agent.path.push(n);
      return { ...game, actionLog: log };
    }
  }
  // If all explored, backtrack
  log.push('All options explored, backtracking.');
  agent.stack.pop();
  return { ...game, actionLog: log };
}
