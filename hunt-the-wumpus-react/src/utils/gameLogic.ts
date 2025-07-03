import { GameState, Cell, CellType, AgentState } from './gameTypes';

const BOARD_SIZE = 20;
const NUM_BATS = 4;
const NUM_PITS = 2;

// Predefined wall cluster shapes (all size 5, all rotations)
const WALL_SHAPES_5 = [
  // I shapes
  [ {dx:0,dy:0}, {dx:0,dy:1}, {dx:0,dy:2}, {dx:0,dy:3}, {dx:0,dy:4} ], // vertical
  [ {dx:0,dy:0}, {dx:1,dy:0}, {dx:2,dy:0}, {dx:3,dy:0}, {dx:4,dy:0} ], // horizontal
  // L shapes
  [ {dx:0,dy:0}, {dx:1,dy:0}, {dx:2,dy:0}, {dx:2,dy:1}, {dx:2,dy:2} ],
  [ {dx:0,dy:0}, {dx:0,dy:1}, {dx:0,dy:2}, {dx:1,dy:2}, {dx:2,dy:2} ],
  [ {dx:0,dy:0}, {dx:-1,dy:0}, {dx:-2,dy:0}, {dx:-2,dy:1}, {dx:-2,dy:2} ],
  [ {dx:0,dy:0}, {dx:0,dy:-1}, {dx:0,dy:-2}, {dx:1,dy:-2}, {dx:2,dy:-2} ],
  // T shapes
  [ {dx:0,dy:0}, {dx:-1,dy:1}, {dx:0,dy:1}, {dx:1,dy:1}, {dx:0,dy:2} ],
  [ {dx:0,dy:0}, {dx:0,dy:1}, {dx:1,dy:0}, {dx:0,dy:-1}, {dx:-1,dy:0} ],
  [ {dx:0,dy:0}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:1,dy:0}, {dx:0,dy:-1} ],
  [ {dx:0,dy:0}, {dx:0,dy:-1}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:1,dy:0} ],
  // U shapes
  [ {dx:0,dy:0}, {dx:0,dy:1}, {dx:0,dy:2}, {dx:1,dy:0}, {dx:1,dy:2} ],
  [ {dx:0,dy:0}, {dx:1,dy:0}, {dx:2,dy:0}, {dx:0,dy:1}, {dx:2,dy:1} ],
  [ {dx:0,dy:0}, {dx:0,dy:1}, {dx:0,dy:2}, {dx:-1,dy:0}, {dx:-1,dy:2} ],
  [ {dx:0,dy:0}, {dx:-1,dy:0}, {dx:-2,dy:0}, {dx:0,dy:1}, {dx:-2,dy:1} ],
  // Plus shape
  [ {dx:0,dy:0}, {dx:0,dy:1}, {dx:0,dy:-1}, {dx:1,dy:0}, {dx:-1,dy:0} ],
  // Zigzag
  [ {dx:0,dy:0}, {dx:1,dy:0}, {dx:1,dy:1}, {dx:2,dy:1}, {dx:2,dy:2} ],
  [ {dx:0,dy:0}, {dx:0,dy:1}, {dx:-1,dy:1}, {dx:-1,dy:2}, {dx:-2,dy:2} ],
];

function getRandomEmptyCell(occupied: Set<string>, forbidden: Set<string> = new Set()): { x: number; y: number } {
  let x, y;
  do {
    x = Math.floor(Math.random() * BOARD_SIZE);
    y = Math.floor(Math.random() * BOARD_SIZE);
  } while (occupied.has(`${x},${y}`) || forbidden.has(`${x},${y}`));
  occupied.add(`${x},${y}`);
  return { x, y };
}

function randomWallCluster(start: {x: number, y: number}, occupied: Set<string>, forbidden: Set<string>, minSize = 5, maxSize = 15): {x: number, y: number}[] {
  const cluster: {x: number, y: number}[] = [start];
  const seen = new Set([`${start.x},${start.y}`]);
  let frontier = [start];
  while (cluster.length < maxSize && frontier.length > 0) {
    const nextFrontier: {x: number, y: number}[] = [];
    for (const cell of frontier) {
      const adj = [
        {x: cell.x+1, y: cell.y}, {x: cell.x-1, y: cell.y},
        {x: cell.x, y: cell.y+1}, {x: cell.x, y: cell.y-1}
      ];
      for (const n of adj) {
        if (
          n.x >= 0 && n.x < BOARD_SIZE && n.y >= 0 && n.y < BOARD_SIZE &&
          !occupied.has(`${n.x},${n.y}`) && !forbidden.has(`${n.x},${n.y}`) && !seen.has(`${n.x},${n.y}`)
        ) {
          if (Math.random() < 0.7 || cluster.length < minSize) { // bias to grow until minSize
            cluster.push(n);
            nextFrontier.push(n);
            seen.add(`${n.x},${n.y}`);
            if (cluster.length >= maxSize) break;
          }
        }
      }
      if (cluster.length >= maxSize) break;
    }
    frontier = nextFrontier;
  }
  return cluster.length >= minSize ? cluster : [];
}

function markForbiddenArea(center: {x: number, y: number}, forbidden: Set<string>, skipCenter = false) {
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const x = center.x + dx;
      const y = center.y + dy;
      if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
        if (skipCenter && dx === 0 && dy === 0) continue;
        forbidden.add(`${x},${y}`);
      }
    }
  }
}

export function createNewGame(stats: { games: number; victories: number }): GameState {
  const occupied = new Set<string>();
  const forbidden = new Set<string>();
  // Place wall clusters (predefined shapes, all size 5)
  const NUM_WALLS = Math.floor(BOARD_SIZE * BOARD_SIZE * 0.10); // 10% of the board
  const wallPositions: { x: number; y: number }[] = [];
  let wallCellsPlaced = 0;
  while (wallCellsPlaced < NUM_WALLS) {
    // Randomly pick a shape
    const shape = WALL_SHAPES_5[Math.floor(Math.random() * WALL_SHAPES_5.length)];
    // Randomly pick a starting cell
    const x0 = Math.floor(Math.random() * BOARD_SIZE);
    const y0 = Math.floor(Math.random() * BOARD_SIZE);
    // Compute all cells for this shape
    const shapeCells = shape.map(({dx,dy}) => ({x: x0+dx, y: y0+dy}));
    // Check all in bounds and not forbidden/occupied
    if (shapeCells.every(({x,y}) => x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && !occupied.has(`${x},${y}`) && !forbidden.has(`${x},${y}`))) {
      shapeCells.forEach(({x,y}) => {
        wallPositions.push({x,y});
        forbidden.add(`${x},${y}`);
        occupied.add(`${x},${y}`);
        wallCellsPlaced++;
        if (wallCellsPlaced >= NUM_WALLS) return;
      });
    }
    // Prevent infinite loop if board is too full
    if (wallCellsPlaced > BOARD_SIZE*BOARD_SIZE*0.5) break;
  }
  // Place agent
  const agentPos = getRandomEmptyCell(occupied, forbidden);
  markForbiddenArea(agentPos, forbidden);
  // Place wumpus
  const wumpusPos = getRandomEmptyCell(occupied, forbidden);
  markForbiddenArea(wumpusPos, forbidden);
  // Place gold
  const goldPos = getRandomEmptyCell(occupied, forbidden);
  markForbiddenArea(goldPos, forbidden, true); // skipCenter=true: do not forbid the gold cell itself
  // Place bats
  const batPositions = [];
  for (let i = 0; i < NUM_BATS; i++) {
    const pos = getRandomEmptyCell(occupied, forbidden);
    batPositions.push(pos);
    markForbiddenArea(pos, forbidden);
  }
  // Place pits
  const pitPositions = [];
  for (let i = 0; i < NUM_PITS; i++) {
    const pos = getRandomEmptyCell(occupied, forbidden);
    pitPositions.push(pos);
    markForbiddenArea(pos, forbidden);
  }

  // Build board
  const board: Cell[][] = Array.from({ length: BOARD_SIZE }, (_, y) =>
    Array.from({ length: BOARD_SIZE }, (_, x) => {
      if (wallPositions.some(w => w.x === x && w.y === y)) return { type: 'wall', explored: false };
      return { type: 'empty', explored: false };
    })
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
  } as GameState;
}

export function createAgentState(agentPos: { x: number; y: number }): AgentState {
  return {
    stack: [agentPos],
    visited: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false)),
    arrows: 3,
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
  let log = game.actionLog ? [...game.actionLog] : [];

  // --- DETAILED LOGGING: Log all checks performed at this cell ---
  const curr = agent.stack.length > 0 ? agent.stack[agent.stack.length - 1] : game.agentPos;
  const currCell = game.board[curr.y][curr.x];
  const checks = [];
  if (currCell.type === 'gold') checks.push('gold');
  if (currCell.type === 'pit') checks.push('pit');
  if (currCell.type === 'wumpus') checks.push('wumpus');
  if (currCell.type === 'bat') checks.push('bat');
  if (currCell.type === 'wall') checks.push('wall');
  // Always check for adjacent threats
  const adj = getAdjacent(curr.x, curr.y);
  const neighbors = getAdjacent(curr.x, curr.y); // <-- Fix: define neighbors for DFS and sensory logic
  if (adj.some(n => game.board[n.y][n.x].type === 'wumpus')) checks.push('adjacent wumpus');
  if (adj.some(n => game.board[n.y][n.x].type === 'pit')) checks.push('adjacent pit');
  if (adj.some(n => game.board[n.y][n.x].type === 'bat')) checks.push('adjacent bat');
  if (adj.some(n => game.board[n.y][n.x].type === 'gold')) checks.push('adjacent gold');
  if (adj.some(n => game.board[n.y][n.x].type === 'wall')) checks.push('adjacent wall');
  log.push(`[LOG] Agent at (${curr.x + 1},${curr.y + 1}): checked for ${checks.length ? checks.join(', ') : 'nothing special'}`);

  // --- WUMPUS SHOOTING LOGIC: Check for adjacent Wumpus and shoot if possible (ALWAYS do this before moving) ---
  let shot = false;
  for (const n of adj) {
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

  // Helper to check instant win after any move
  function checkGoldWin(g: GameState, a: typeof agent, logArr: string[]) {
    if (g.agentPos.x === g.goldPos.x && g.agentPos.y === g.goldPos.y) {
      logArr.push(`[GOLD] Agent found the gold! WON! (at ${g.agentPos.x + 1},${g.agentPos.y + 1})`);
      return { ...g, status: 'won' as const, actionLog: logArr };
    }
    return null;
  }

  // Check instant win at the start
  const winStart = checkGoldWin(game, agent, log);
  if (winStart) return winStart;

  // Do not mark wall cells as visited/explored, and treat as stuck if agent is on a wall (defensive)
  if (currCell.type === 'wall') {
    log.push('Agent is stuck on a wall cell. This should not happen.');
    return { ...game, status: 'lost', actionLog: log };
  }
  agent.visited[curr.y][curr.x] = true;
  game.explored[curr.y][curr.x] = true;
  game.agentPos = { x: curr.x, y: curr.y };

  // Always check for gold at the agent's current position after any move or backtrack
  if (game.agentPos.x === game.goldPos.x && game.agentPos.y === game.goldPos.y) {
    log.push(`[GOLD] Agent found the gold! WON! (at ${game.agentPos.x + 1},${game.agentPos.y + 1})`);
    return { ...game, status: 'won', actionLog: log };
  }

  // Check for threats at current cell (remove duplicate gold win logic)
  const cell = game.board[curr.y][curr.x];
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
    // Exclude wall cells from teleport destinations
    for (let y = 0; y < BOARD_SIZE; y++) for (let x = 0; x < BOARD_SIZE; x++) {
      if (game.board[y][x].type === 'wall') {
        // Remove any wall cell from empty[] if present
        const idx = empty.findIndex(pos => pos.x === x && pos.y === y);
        if (idx !== -1) empty.splice(idx, 1);
      }
    }
    if (empty.length > 0) {
      const idx = Math.floor(Math.random() * empty.length);
      agent.stack = [empty[idx]];
      log.push(`Agent was carried by bats from (${curr.x + 1},${curr.y + 1}) to (${empty[idx].x + 1},${empty[idx].y + 1})! Exploration history reset, known dangers kept.`);
      game.agentPos = { x: empty[idx].x, y: empty[idx].y };
      // After teleport, check for threats at new cell
      const newCell = game.board[empty[idx].y][empty[idx].x];
      if (newCell.type === 'gold') {
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
      if (game.board[pos.y][pos.x].type === 'gold') {
        log.push(`Agent found the gold! WON! (at ${pos.x + 1},${pos.y + 1})`);
        return { ...game, agentPos: { x: pos.x, y: pos.y }, status: 'won', actionLog: log };
      }
      return { ...game, actionLog: log };
    }
  }

  // --- SENSORY WARNINGS: Check for adjacent threats and log warnings ---
  let sensedWumpus2 = false, sensedPit2 = false, sensedBat2 = false;
  for (const n of adj) {
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
  for (const n of adj) {
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
  // If gold is adjacent and not a wall, move to it immediately (even if visited)
  if (goldNeighbor && game.board[goldNeighbor.y][goldNeighbor.x].type !== 'wall') {
    agent.stack.push(goldNeighbor);
    moved = true;
  } else {
    // Prefer unvisited, non-wall neighbor if gold is not adjacent
    for (const n of neighbors) {
      if (!agent.visited[n.y][n.x] && game.board[n.y][n.x].type !== 'wall') {
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
    // Only mark as visited if the agent is actually moving to this cell now and it's not a wall
    if ((game.agentPos.x !== pos.x || game.agentPos.y !== pos.y) && game.board[pos.y][pos.x].type !== 'wall') {
      agent.visited[pos.y][pos.x] = true;
      game.explored[pos.y][pos.x] = true;
    }
    game.agentPos = { x: pos.x, y: pos.y };
    // Check instant win after agentPos update (including backtracking)
    const winAfterStackMove = checkGoldWin(game, agent, log);
    if (winAfterStackMove) return winAfterStackMove;
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
      log.push(`[GOLD] You are lucky, gold is near! (at ${pos.x + 1},${pos.y + 1})`);
    }
    // Always check for gold/pit/wumpus at the new cell, even if already visited
    const cell = game.board[pos.y][pos.x];
    if (cell.type === 'gold') {
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
    if (cell.type === 'wall') {
      log.push('Agent tried to move into a wall cell. This should not happen.');
      return { ...game, status: 'lost', actionLog: log };
    }
  } else {
    // If stack is empty, check for win/loss at current position as well
    const pos = game.agentPos;
    const cell = game.board[pos.y][pos.x];
    if (cell.type === 'gold') {
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
    if (cell.type === 'wall') {
      log.push('Agent is stuck on a wall cell. This should not happen.');
      return { ...game, status: 'lost', actionLog: log };
    }
    log.push('No moves left. Agent is stuck.');
    return { ...game, status: 'lost', actionLog: log };
  }
  return { ...game, actionLog: log };
}

// Agent step with algorithm selector: uses DFS or A* based on game.agentState.algorithm (default: DFS)
export function agentStepWithAlgorithm(game: GameState, algorithm: 'dfs' | 'astar'): GameState {
  if (!game.agentState || game.status !== 'playing') return game;
  const agent = game.agentState;
  let log = game.actionLog ? [...game.actionLog] : [];

  // --- DETAILED LOGGING: Log all checks performed at this cell ---
  const curr = agent.stack.length > 0 ? agent.stack[agent.stack.length - 1] : game.agentPos;
  const currCell = game.board[curr.y][curr.x];
  const checks = [];
  if (currCell.type === 'gold') checks.push('gold');
  if (currCell.type === 'pit') checks.push('pit');
  if (currCell.type === 'wumpus') checks.push('wumpus');
  if (currCell.type === 'bat') checks.push('bat');
  if (currCell.type === 'wall') checks.push('wall');
  // Always check for adjacent threats
  const adj = getAdjacent(curr.x, curr.y);
  if (adj.some(n => game.board[n.y][n.x].type === 'wumpus')) checks.push('adjacent wumpus');
  if (adj.some(n => game.board[n.y][n.x].type === 'pit')) checks.push('adjacent pit');
  if (adj.some(n => game.board[n.y][n.x].type === 'bat')) checks.push('adjacent bat');
  if (adj.some(n => game.board[n.y][n.x].type === 'gold')) checks.push('adjacent gold');
  if (adj.some(n => game.board[n.y][n.x].type === 'wall')) checks.push('adjacent wall');
  log.push(`Agent at (${curr.x + 1},${curr.y + 1}): checked for ${checks.length ? checks.join(', ') : 'nothing special'}`);

  // --- WUMPUS SHOOTING LOGIC: Check for adjacent Wumpus and shoot if possible (ALWAYS do this before moving) ---
  for (const n of adj) {
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
      break; // Only shoot once per step
    }
  }

  // Helper to check instant win after any move
  function checkGoldWin(g: GameState, a: typeof agent, logArr: string[]) {
    if (g.agentPos.x === g.goldPos.x && g.agentPos.y === g.goldPos.y) {
      logArr.push(`[GOLD] Agent found the gold! WON! (at ${g.agentPos.x + 1},${g.agentPos.y + 1})`);
      return { ...g, status: 'won' as const, actionLog: logArr };
    }
    return null;
  }

  // Check instant win at the start
  const winStart = checkGoldWin(game, agent, log);
  if (winStart) return winStart;

  // Do not mark wall cells as visited/explored, and treat as stuck if agent is on a wall (defensive)
  if (currCell.type === 'wall') {
    log.push('Agent is stuck on a wall cell. This should not happen.');
    return { ...game, status: 'lost', actionLog: log };
  }
  agent.visited[curr.y][curr.x] = true;
  game.explored[curr.y][curr.x] = true;
  game.agentPos = { x: curr.x, y: curr.y };

  // Always check for gold at the agent's current position after any move or backtrack
  if (game.agentPos.x === game.goldPos.x && game.agentPos.y === game.goldPos.y) {
    log.push(`[GOLD] Agent found the gold! WON! (at ${game.agentPos.x + 1},${game.agentPos.y + 1})`);
    return { ...game, status: 'won', actionLog: log };
  }

  // Check for threats at current cell (remove duplicate gold win logic)
  const cell = game.board[curr.y][curr.x];
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
    // Exclude wall cells from teleport destinations
    for (let y = 0; y < BOARD_SIZE; y++) for (let x = 0; x < BOARD_SIZE; x++) {
      if (game.board[y][x].type === 'wall') {
        // Remove any wall cell from empty[] if present
        const idx = empty.findIndex(pos => pos.x === x && pos.y === y);
        if (idx !== -1) empty.splice(idx, 1);
      }
    }
    if (empty.length > 0) {
      const idx = Math.floor(Math.random() * empty.length);
      agent.stack = [empty[idx]];
      log.push(`Agent was carried by bats from (${curr.x + 1},${curr.y + 1}) to (${empty[idx].x + 1},${empty[idx].y + 1})! Exploration history reset, known dangers kept.`);
      game.agentPos = { x: empty[idx].x, y: empty[idx].y };
      // After teleport, check for threats at new cell
      const newCell = game.board[empty[idx].y][empty[idx].x];
      if (newCell.type === 'gold') {
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
      if (game.board[pos.y][pos.x].type === 'gold') {
        log.push(`Agent found the gold! WON! (at ${pos.x + 1},${pos.y + 1})`);
        return { ...game, agentPos: { x: pos.x, y: pos.y }, status: 'won', actionLog: log };
      }
      return { ...game, actionLog: log };
    }
  }

  // --- SENSORY WARNINGS: Check for adjacent threats and log warnings ---
  let sensedWumpus2 = false, sensedPit2 = false, sensedBat2 = false;
  for (const n of adj) {
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
  for (const n of adj) {
    if (game.board[n.y][n.x].type === 'gold') {
      goldNearby = true;
      goldNeighbor = n;
    }
  }
  if (goldNearby) {
    log.push(`[GOLD] You are lucky, gold is near! (at ${curr.x + 1},${curr.y + 1})`);
  }

  // --- MOVEMENT: DFS or A* ---
  if (algorithm === 'astar') {
    // Use A* to find path to gold (excluding current cell)
    const path = aStarPath(game, curr, game.goldPos);
    if (path.length > 1) {
      // Move to next cell in path
      const next = path[1];
      agent.stack.push(next);
    } else {
      // No path found or already at gold
      agent.stack.pop();
    }
  } else {
    // DFS logic (as before)
    let moved = false;
    if (goldNeighbor && game.board[goldNeighbor.y][goldNeighbor.x].type !== 'wall') {
      agent.stack.push(goldNeighbor);
      moved = true;
    } else {
      const neighbors = getAdjacent(curr.x, curr.y);
      for (const n of neighbors) {
        if (!agent.visited[n.y][n.x] && game.board[n.y][n.x].type !== 'wall') {
          agent.stack.push(n);
          moved = true;
          break;
        }
      }
    }
    if (!moved) {
      agent.stack.pop();
    }
  }

  // Only mark as visited and log for the cell the agent actually moves to
  if (agent.stack.length > 0) {
    const pos = agent.stack[agent.stack.length - 1];
    if ((game.agentPos.x !== pos.x || game.agentPos.y !== pos.y) && game.board[pos.y][pos.x].type !== 'wall') {
      agent.visited[pos.y][pos.x] = true;
      game.explored[pos.y][pos.x] = true;
    }
    game.agentPos = { x: pos.x, y: pos.y };
    const winAfterStackMove = checkGoldWin(game, agent, log);
    if (winAfterStackMove) return winAfterStackMove;
    // Sensory warnings for new cell (after move)
    let sensedWumpus2 = false, sensedPit2 = false, sensedBat2 = false;
    const neighbors = getAdjacent(pos.x, pos.y);
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
      log.push(`[GOLD] You are lucky, gold is near! (at ${pos.x + 1},${pos.y + 1})`);
    }
    // Always check for gold/pit/wumpus at the new cell, even if already visited
    const cell = game.board[pos.y][pos.x];
    if (cell.type === 'gold') {
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
    if (cell.type === 'wall') {
      log.push('Agent tried to move into a wall cell. This should not happen.');
      return { ...game, status: 'lost', actionLog: log };
    }
  } else {
    // If stack is empty, check for win/loss at current position as well
    const pos = game.agentPos;
    const cell = game.board[pos.y][pos.x];
    if (cell.type === 'gold') {
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
    if (cell.type === 'wall') {
      log.push('Agent is stuck on a wall cell. This should not happen.');
      return { ...game, status: 'lost', actionLog: log };
    }
    log.push('No moves left. Agent is stuck.');
    return { ...game, status: 'lost', actionLog: log };
  }
  return { ...game, actionLog: log };
}

// A* pathfinding: returns a path from start to goal, or [] if no path
export function aStarPath(game: GameState, start: {x: number, y: number}, goal: {x: number, y: number}): {x: number, y: number}[] {
  // Only allow movement on empty, gold, or bat cells (not wall, pit, wumpus)
  function isPassable(x: number, y: number) {
    const t = game.board[y][x].type;
    return t === 'empty' || t === 'gold' || t === 'bat';
  }
  function heuristic(a: {x: number, y: number}, b: {x: number, y: number}) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan distance
  }
  const open: Array<{x: number, y: number, f: number, g: number, parent?: {x: number, y: number}}>=[];
  const closed = new Set<string>();
  open.push({x: start.x, y: start.y, f: heuristic(start, goal), g: 0});
  while (open.length > 0) {
    // Get node with lowest f
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      // Reconstruct path
      const path = [];
      let node: any = current;
      while (node) {
        path.push({x: node.x, y: node.y});
        node = node.parent;
      }
      return path.reverse();
    }
    closed.add(`${current.x},${current.y}`);
    for (const {dx, dy} of DIRS) {
      const nx = current.x + dx, ny = current.y + dy;
      if (!isValid(nx, ny) || !isPassable(nx, ny) || closed.has(`${nx},${ny}`)) continue;
      const g = current.g + 1;
      const h = heuristic({x: nx, y: ny}, goal);
      // If already in open with lower g, skip
      const existing = open.find(n => n.x === nx && n.y === ny);
      if (existing && existing.g <= g) continue;
      open.push({x: nx, y: ny, f: g + h, g, parent: current});
    }
  }
  return [];
}
