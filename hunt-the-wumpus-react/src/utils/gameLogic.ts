import { GameState, Cell, CellType, AgentState } from './gameTypes';

const BOARD_SIZE = 20;
const NUM_BATS = 1;
const NUM_PITS = 1;

function getRandomEmptyCell(occupied: Set<string>): { x: number; y: number } {
  let x, y;
  do {
    x = Math.floor(Math.random() * BOARD_SIZE);
    y = Math.floor(Math.random() * BOARD_SIZE);
  } while (occupied.has(`${x},${y}`));
  occupied.add(`${x},${y}`);
  return { x, y };
}

export function createNewGame(stats: { games: number; victories: number }): GameState {
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
  board[wumpusPos.y][wumpusPos.x] = { type: 'wumpus', explored: false };
  batPositions.forEach(({ x, y }) => (board[y][x] = { type: 'bat', explored: false }));
  pitPositions.forEach(({ x, y }) => (board[y][x] = { type: 'pit', explored: false }));
  // Place gold last so it is never overwritten
  board[goldPos.y][goldPos.x] = { type: 'gold', explored: false };

  return {
    board,
    agentPos,
    wumpusPos,
    goldPos,
    batPositions,
    pitPositions,
    explored: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false)),
    status: 'playing',
    actionLog: [
      `Game started. Agent at (${agentPos.x + 1},${agentPos.y + 1})`,
      `Wumpus at (${wumpusPos.x + 1},${wumpusPos.y + 1})`,
      `Gold at (${goldPos.x + 1},${goldPos.y + 1})`,
    ],
    agentState: createAgentState(agentPos),
    // Ensure hasGold is always false at game start
    hasGold: false,
  } as GameState;
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
  { dx: 0, dy: -1 },  // up
  { dx: 1, dy: 0 },   // right
  { dx: 0, dy: 1 },   // down
  { dx: -1, dy: 0 },  // left
];

// Helper: shuffle an array in-place
function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Helper: get adjacent cells in random order
function getAdjacent(x: number, y: number) {
  const dirs = shuffle([...DIRS]);
  return dirs
    .map(({ dx, dy }) => ({ x: x + dx, y: y + dy }))
    .filter(({ x, y }) => isValid(x, y));
}

function isValid(x: number, y: number) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
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
      dangerLevel += 10;
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

  // Get current position from top of stack (DFS path)
  const curr = agent.stack.length > 0 ? agent.stack[agent.stack.length - 1] : game.agentPos;
  let log = game.actionLog ? [...game.actionLog] : [];

  // Mark current as visited
  agent.visited[curr.y][curr.x] = true;
  game.explored[curr.y][curr.x] = true;
  game.agentPos = { x: curr.x, y: curr.y };
  // Log visited cells for debugging
  const visitedCells = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (agent.visited[y][x]) visitedCells.push(`(${x + 1},${y + 1})`);
    }
  }
  log.push(`[DEBUG] Visited cells: ${visitedCells.join(', ')}`);

  // Sensory warnings for current cell (before any action)
  let sensedWumpus = false, sensedPit = false, sensedBat = false;
  for (const n of getAdjacent(curr.x, curr.y)) {
    const t = game.board[n.y][n.x].type;
    if (t === 'wumpus') sensedWumpus = true;
    if (t === 'pit') sensedPit = true;
    if (t === 'bat') sensedBat = true;
  }
  if (sensedWumpus) log.push(`You smell something terrible nearby. (at ${curr.x + 1},${curr.y + 1})`);
  if (sensedPit) log.push(`You feel a breeze nearby. (at ${curr.x + 1},${curr.y + 1})`);
  if (sensedBat) log.push(`You hear flapping nearby. (at ${curr.x + 1},${curr.y + 1})`);

  // Check for threats at current cell
  const cell = game.board[curr.y][curr.x];
  if (cell.type === 'gold' && !agent.hasGold) {
    agent.hasGold = true;
    log.push(`Agent found the gold! WON! (at ${curr.x + 1},${curr.y + 1})`);
    return { ...game, agentPos: { x: curr.x, y: curr.y }, status: 'won', actionLog: log };
  }
  if (cell.type === 'pit') {
    log.push(`Agent fell into a pit at this cell. Lost! (at ${curr.x + 1},${curr.y + 1})`);
    return { ...game, agentPos: { x: curr.x, y: curr.y }, status: 'lost', actionLog: log };
  }
  if (cell.type === 'wumpus') {
    log.push(`Agent encountered the Wumpus at this cell. Lost! (at ${curr.x + 1},${curr.y + 1})`);
    return { ...game, agentPos: { x: curr.x, y: curr.y }, status: 'lost', actionLog: log };
  }
  if (cell.type === 'bat') {
    // Bat: teleport, reset stack but keep visited and known dangers
    const empty: { x: number; y: number }[] = [];
    for (let y = 0; y < BOARD_SIZE; y++) for (let x = 0; x < BOARD_SIZE; x++)
      if (game.board[y][x].type === 'empty' && !agent.visited[y][x]) empty.push({ x, y });
    if (empty.length > 0) {
      const idx = Math.floor(Math.random() * empty.length);
      agent.stack = [empty[idx]];
      log.push(`Agent was carried by bats from (${curr.x + 1},${curr.y + 1}) to (${empty[idx].x + 1},${empty[idx].y + 1})! Exploration history reset, known dangers kept.`);
      game.agentPos = { x: empty[idx].x, y: empty[idx].y };
      // After teleport, check for threats at new cell
      const newCell = game.board[empty[idx].y][empty[idx].x];
      if (newCell.type === 'gold' && !agent.hasGold) {
        agent.hasGold = true;
        log.push(`Agent found the gold! WON! (at ${empty[idx].x + 1},${empty[idx].y + 1})`);
        return { ...game, agentPos: { x: empty[idx].x, y: empty[idx].y }, status: 'won', actionLog: log };
      }
      if (newCell.type === 'pit') {
        log.push(`Agent fell into a pit at this cell. Lost! (at ${empty[idx].x + 1},${empty[idx].y + 1})`);
        return { ...game, agentPos: { x: empty[idx].x, y: empty[idx].y }, status: 'lost', actionLog: log };
      }
      if (newCell.type === 'wumpus') {
        log.push(`Agent encountered the Wumpus at this cell. Lost! (at ${empty[idx].x + 1},${empty[idx].y + 1})`);
        return { ...game, agentPos: { x: empty[idx].x, y: empty[idx].y }, status: 'lost', actionLog: log };
      }
      // Also check if the new cell is gold after stack update (for consistency)
      const pos = agent.stack[agent.stack.length - 1];
      if (game.board[pos.y][pos.x].type === 'gold' && !agent.hasGold) {
        agent.hasGold = true;
        log.push(`Agent found the gold! WON! (at ${pos.x + 1},${pos.y + 1})`);
        return { ...game, agentPos: { x: pos.x, y: pos.y }, status: 'won', actionLog: log };
      }
      return { ...game, actionLog: log };
    }
  }

  // --- WUMPUS SHOOTING LOGIC: Check for adjacent Wumpus and shoot if possible ---
  const neighbors = getAdjacent(curr.x, curr.y);
  let shot = false;
  for (const n of neighbors) {
    if (game.board[n.y][n.x].type === 'wumpus' && agent.arrows > 0) {
      agent.arrows--;
      log.push(`Agent senses the Wumpus nearby and shoots. Arrows left: ${agent.arrows}`);
      // 1/8 probability to hit
      if (Math.random() < 0.125) {
        game.board[n.y][n.x].type = 'empty';
        log.push('Agent killed the Wumpus! WON!');
        return { ...game, status: 'won', actionLog: log };
      } else {
        log.push('Agent missed the Wumpus and continues exploring.');
      }
      shot = true;
      break; // Only shoot once per step
    }
  }
  // If adjacent to Wumpus but no arrows, just continue exploring

  // --- SENSORY WARNINGS: Check for adjacent threats and log warnings ---
  let sensedWumpus2 = false, sensedPit2 = false, sensedBat2 = false;
  for (const n of neighbors) {
    const t = game.board[n.y][n.x].type;
    if (t === 'wumpus') sensedWumpus2 = true;
    if (t === 'pit') sensedPit2 = true;
    if (t === 'bat') sensedBat2 = true;
  }
  if (sensedWumpus2) log.push(`You smell something terrible nearby. (at ${curr.x + 1},${curr.y + 1})`);
  if (sensedPit2) log.push(`You feel a breeze nearby. (at ${curr.x + 1},${curr.y + 1})`);
  if (sensedBat2) log.push(`You hear flapping nearby. (at ${curr.x + 1},${curr.y + 1})`);

  // --- GOLD SENSING: Check for adjacent gold and log, always prioritize unvisited neighbors if gold is near ---
  let goldNearby = false;
  let goldNeighbor: { x: number; y: number } | null = null;
  for (const n of neighbors) {
    if (game.board[n.y][n.x].type === 'gold') {
      goldNearby = true;
      goldNeighbor = n;
    }
  }
  if (goldNearby) {
    // Use a special marker for gold messages instead of HTML for console compatibility
    log.push(`[GOLD] You are lucky, gold is near! (at ${curr.x + 1},${curr.y + 1})`);
  }

  // --- DFS MOVEMENT: Choose next move ---
  let moved = false;
  // If gold is adjacent, move to it immediately
  if (goldNeighbor) {
    agent.stack.push(goldNeighbor);
    moved = true;
  } else {
    // Prefer unvisited neighbor if gold is not adjacent
    for (const n of neighbors) {
      if (!agent.visited[n.y][n.x]) {
        agent.stack.push(n);
        moved = true;
        break;
      }
    }
  }
  // If still no move, backtrack
  if (!moved) {
    agent.stack.pop();
  }
  // Only mark as visited and log for the cell the agent actually moves to
  if (agent.stack.length > 0) {
    const pos = agent.stack[agent.stack.length - 1];
    // Only mark as visited if the agent is actually moving to this cell now
    if (!agent.visited[pos.y][pos.x]) {
      agent.visited[pos.y][pos.x] = true;
      game.explored[pos.y][pos.x] = true;
    }
    game.agentPos = { x: pos.x, y: pos.y };
    // Log visited cells for debugging (after updating agentPos and visited)
    const visitedCells = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (agent.visited[y][x]) visitedCells.push(`(${x + 1},${y + 1})`);
      }
    }
    log.push(`[DEBUG] Visited cells: ${visitedCells.join(', ')}`);
    // Sensory warnings for new cell (after move)
    let sensedWumpus2 = false, sensedPit2 = false, sensedBat2 = false;
    for (const n of neighbors) {
      const t = game.board[n.y][n.x].type;
      if (t === 'wumpus') sensedWumpus2 = true;
      if (t === 'pit') sensedPit2 = true;
      if (t === 'bat') sensedBat2 = true;
    }
    if (sensedWumpus2) log.push(`You smell something terrible nearby. (at ${pos.x + 1},${pos.y + 1})`);
    if (sensedPit2) log.push(`You feel a breeze nearby. (at ${pos.x + 1},${pos.y + 1})`);
    if (sensedBat2) log.push(`You hear flapping nearby. (at ${pos.x + 1},${pos.y + 1})`);
    // After moving, check for gold in neighbors and log if found
    const goldNear = getAdjacent(pos.x, pos.y).some(n => game.board[n.y][n.x].type === 'gold');
    if (goldNear) {
      // Use a special marker for gold messages instead of HTML for console compatibility
      log.push(`[GOLD] You are lucky, gold is near! (at ${pos.x + 1},${pos.y + 1})`);
    }
    // Always check for gold/pit/wumpus at the new cell, even if already visited
    const cell = game.board[pos.y][pos.x];
    if (cell.type === 'gold' && !agent.hasGold) {
      agent.hasGold = true;
      log.push(`[GOLD] Agent found the gold! WON! (at ${pos.x + 1},${pos.y + 1})`);
      return { ...game, agentPos: { x: pos.x, y: pos.y }, status: 'won', actionLog: log };
    }
    if (cell.type === 'pit') {
      log.push(`Agent fell into a pit at this cell. Lost! (at ${pos.x + 1},${pos.y + 1})`);
      return { ...game, agentPos: { x: pos.x, y: pos.y }, status: 'lost', actionLog: log };
    }
    if (cell.type === 'wumpus') {
      log.push(`Agent encountered the Wumpus at this cell. Lost! (at ${pos.x + 1},${pos.y + 1})`);
      return { ...game, agentPos: { x: pos.x, y: pos.y }, status: 'lost', actionLog: log };
    }
  } else {
    log.push('No moves left. Agent is stuck.');
    return { ...game, status: 'lost', actionLog: log };
  }
  return { ...game, actionLog: log };
}
