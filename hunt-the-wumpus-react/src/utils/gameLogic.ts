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
  // Always get the current cell, even if stack is empty
  const curr = agent.stack.length > 0 ? agent.stack[agent.stack.length - 1] : game.agentPos;
  let log = game.actionLog ? [...game.actionLog] : [];

  // Always update agentPos for UI and stats, even after teleport or backtrack
  game.agentPos = { x: curr.x, y: curr.y };

  // Only log move if stack is not empty (i.e., a real move)
  if (agent.stack.length > 0) {
    agent.visited[curr.y][curr.x] = true;
    game.explored[curr.y][curr.x] = true;
    log.push(`Agent moved to (${curr.x + 1},${curr.y + 1})`);
    // Mark explored
    game.explored[curr.y][curr.x] = true;
  }

  // 1. Always check for threats (gold, pit, wumpus, bat) by cell type FIRST and return immediately if found
  const cell = game.board[curr.y][curr.x];
  log.push(`DEBUG: Checking cell (${curr.x + 1},${curr.y + 1}) for gold. Cell type: ${cell.type}`);
  if (cell.type === 'gold' && !agent.hasGold) {
    agent.hasGold = true;
    log.push('Agent found the gold! WON!');
    const newExplored = game.explored.map((row, j) =>
      row.map((val, i) => (i === curr.x && j === curr.y ? true : val))
    );
    return { ...game, agentPos: { x: curr.x, y: curr.y }, explored: newExplored, status: 'won', actionLog: log };
  }
  if (cell.type === 'pit') {
    log.push('Agent fell into a pit at this cell. Lost!');
    const newExplored = game.explored.map((row, j) =>
      row.map((val, i) => (i === curr.x && j === curr.y ? true : val))
    );
    return { ...game, agentPos: { x: curr.x, y: curr.y }, explored: newExplored, status: 'lost', actionLog: log };
  }
  if (cell.type === 'wumpus') {
    log.push('Agent encountered the Wumpus at this cell. Lost!');
    const newExplored = game.explored.map((row, j) =>
      row.map((val, i) => (i === curr.x && j === curr.y ? true : val))
    );
    return { ...game, agentPos: { x: curr.x, y: curr.y }, explored: newExplored, status: 'lost', actionLog: log };
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
      log.push(`Agent was carried by bats from (${curr.x + 1},${curr.y + 1}) to (${empty[idx].x + 1},${empty[idx].y + 1})! Exploration history reset, known dangers kept.`);
      // Update agentPos after teleport
      game.agentPos = { x: empty[idx].x, y: empty[idx].y };
      // After teleport, check for gold/pit/wumpus at new cell
      const newCell = game.board[empty[idx].y][empty[idx].x];
      if (newCell.type === 'gold' && !agent.hasGold) {
        agent.hasGold = true;
        log.push('Agent found the gold! WON!');
        const newExplored = game.explored.map((row, j) =>
          row.map((val, i) => (i === empty[idx].x && j === empty[idx].y ? true : val))
        );
        return { ...game, agentPos: { x: empty[idx].x, y: empty[idx].y }, explored: newExplored, status: 'won', actionLog: log };
      }
      if (newCell.type === 'pit') {
        log.push('Agent fell into a pit at this cell. Lost!');
        const newExplored = game.explored.map((row, j) =>
          row.map((val, i) => (i === empty[idx].x && j === empty[idx].y ? true : val))
        );
        return { ...game, agentPos: { x: empty[idx].x, y: empty[idx].y }, explored: newExplored, status: 'lost', actionLog: log };
      }
      if (newCell.type === 'wumpus') {
        log.push('Agent encountered the Wumpus at this cell. Lost!');
        const newExplored = game.explored.map((row, j) =>
          row.map((val, i) => (i === empty[idx].x && j === empty[idx].y ? true : val))
        );
        return { ...game, agentPos: { x: empty[idx].x, y: empty[idx].y }, explored: newExplored, status: 'lost', actionLog: log };
      }
      return { ...game, actionLog: log };
    }
  }

  // 2. If stack is empty after all checks, then agent truly ran out of moves
  if (agent.stack.length === 0) {
    if (game.status === 'playing') {
      const lastLog = (log).slice(-1)[0] || '';
      if (/Lost!|WON!/i.test(lastLog)) {
        return { ...game, status: 'lost', actionLog: log };
      }
      return { ...game, status: 'lost', actionLog: [...log, 'Agent ran out of moves. Lost!'] };
    } else {
      return game;
    }
  }

  // 3. Detect adjacent threats and log sensory messages
  const { dangerLevel, adjWumpus, adjBats, adjPits } = detectThreats(game, curr.x, curr.y);
  if (adjWumpus) log.push('You smell something terrible nearby.');
  if (adjPits) log.push('You feel a breeze nearby.');
  if (adjBats) log.push('You hear flapping nearby.');

  // 4. Wumpus shooting logic: shoot if adjacent and has arrows
  if (adjWumpus && agent.arrows > 0 && !agent.justShot) {
    agent.arrows--;
    agent.justShot = true;
    const hit = Math.random() < 0.125;
    log.push(`Agent senses the Wumpus nearby and shoots. Arrows left: ${agent.arrows}`);
    if (hit) {
      game.board[adjWumpus.y][adjWumpus.x].type = 'empty';
      log.push('Agent killed the Wumpus! WON!');
      return { ...game, status: 'won', actionLog: log };
    } else {
      log.push('Agent missed the Wumpus and continues exploring.');
      // Do not return; allow agent to continue exploring after missing
    }
  } else if (adjWumpus && agent.arrows === 0) {
    log.push('Agent senses the Wumpus nearby but has no arrows left. Must continue exploring.');
    // Do not return; allow agent to continue exploring after logging
  }
  if (agent.justShot) agent.justShot = false;

  // 5. Pit/backtrack logic
  if (adjPits > 0) {
    log.push('Agent senses a pit nearby and backtracks.');
    agent.stack.pop();
    return { ...game, actionLog: log };
  }
  if (adjBats > 0) {
    log.push('Agent hears bats nearby, will risk once.');
  }
  const neighbors = getAdjacent(curr.x, curr.y);
  let hazardousNeighbor: { x: number; y: number } | null = null;
  for (const n of neighbors) {
    if (!agent.visited[n.y][n.x]) {
      // --- WUMPUS LOOKAHEAD SHOOTING LOGIC ---
      if (game.board[n.y][n.x].type === 'wumpus' && agent.arrows > 0) {
        agent.arrows--;
        agent.justShot = true;
        const hit = Math.random() < 0.125;
        log.push(`Agent sees the Wumpus ahead at (${n.x + 1},${n.y + 1}) and shoots. Arrows left: ${agent.arrows}`);
        if (hit) {
          game.board[n.y][n.x].type = 'empty';
          log.push('Agent killed the Wumpus! WON!');
          return { ...game, status: 'won', actionLog: log };
        } else {
          log.push('Agent missed the Wumpus and continues exploring.');
          // Continue to next neighbor or move if no more arrows
        }
      } else if (game.board[n.y][n.x].type === 'wumpus' && agent.arrows === 0) {
        log.push(`Agent sees the Wumpus ahead at (${n.x + 1},${n.y + 1}) but has no arrows left. Must risk moving.`);
        // Continue to move into the Wumpus cell (will lose on next step)
      }
      // --- GOLD/PIT LOOKAHEAD LOGIC ---
      if (game.board[n.y][n.x].type === 'gold' && !agent.hasGold) {
        agent.hasGold = true;
        log.push(`Agent sees gold ahead at (${n.x + 1},${n.y + 1}) and collects it! WON!`);
        const newExplored = game.explored.map((row, j) =>
          row.map((val, i) => (i === n.x && j === n.y ? true : val))
        );
        return { ...game, agentPos: { x: n.x, y: n.y }, explored: newExplored, status: 'won', actionLog: log };
      }
      // Instead of skipping pits, mark as hazardous and only avoid if other options exist
      if (game.board[n.y][n.x].type === 'pit') {
        log.push(`Agent sees a pit ahead at (${n.x + 1},${n.y + 1}) and marks it as hazardous.`);
        if (!hazardousNeighbor) hazardousNeighbor = n;
        agent.visited[n.y][n.x] = true; // Mark as visited to avoid unless forced
        continue; // Try other options first
      }
      agent.stack.push(n);
      agent.path.push(n);
      return { ...game, actionLog: log };
    }
  }
  // If all options are visited, prefer hazardous (pit) cells before backtracking
  if (hazardousNeighbor) {
    log.push(`Agent has no safe moves left and risks moving into pit at (${hazardousNeighbor.x + 1},${hazardousNeighbor.y + 1}).`);
    agent.stack.push(hazardousNeighbor);
    agent.path.push(hazardousNeighbor);
    return { ...game, actionLog: log };
  }
  log.push('All options explored, backtracking.');
  agent.stack.pop();
  return { ...game, actionLog: log };
}
