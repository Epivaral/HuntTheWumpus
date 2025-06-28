import React from 'react';
import Board from './components/Board';
import Stats from './components/Stats';
import Controls from './components/Controls';
import { createNewGame, createAgentState, agentStep } from './utils/gameLogic';
import { GameState } from './utils/gameTypes';
import './App.css';

const App: React.FC = () => {
  const [game, setGame] = React.useState<GameState>(() => {
    const g = createNewGame();
    g.agentState = createAgentState(g.agentPos);
    return g;
  });
  const [mode, setMode] = React.useState<'auto' | 'manual'>('auto');
  const [autoRunning, setAutoRunning] = React.useState(false);
  const [log, setLog] = React.useState<string[]>(game.actionLog || []);

  React.useEffect(() => {
    setLog(game.actionLog || []);
  }, [game]);

  const handleNewGame = () => {
    const g = createNewGame();
    g.agentState = createAgentState(g.agentPos);
    setGame(g);
    setAutoRunning(false);
  };

  const handleToggleMode = () => {
    setMode((m) => (m === 'auto' ? 'manual' : 'auto'));
    setAutoRunning(false);
  };

  const handleStep = () => {
    setGame((prev) => agentStep({ ...prev, agentState: prev.agentState }));
  };

  // Auto play effect
  React.useEffect(() => {
    if (mode === 'auto' && autoRunning && game.status === 'playing') {
      const t = setTimeout(() => handleStep(), 200);
      return () => clearTimeout(t);
    }
  }, [mode, autoRunning, game]);

  const handleAutoPlay = () => {
    setAutoRunning((r) => !r);
  };

  // Manual move handler
  const handleManualMove = (dx: number, dy: number) => {
    setGame((prev) => {
      if (prev.status !== 'playing') return prev;
      const { agentPos, board, agentState } = prev;
      const x = agentPos.x + dx;
      const y = agentPos.y + dy;
      if (x < 0 || x >= 20 || y < 0 || y >= 20) return prev;
      let log = prev.actionLog ? [...prev.actionLog] : [];
      log.push(`Agent moved to (${x + 1},${y + 1})`);
      // Check for gold
      if (x === prev.goldPos.x && y === prev.goldPos.y) {
        // Mark explored
        const newExplored = prev.explored.map((row, j) =>
          row.map((val, i) => (i === x && j === y ? true : val))
        );
        log.push('Agent found the gold! WON!');
        return { ...prev, agentPos: { x, y }, explored: newExplored, status: 'won', actionLog: log };
      }
      // Check for threats
      const cellType = prev.board[y][x].type;
      if (cellType === 'pit') {
        const newExplored = prev.explored.map((row, j) =>
          row.map((val, i) => (i === x && j === y ? true : val))
        );
        log.push('Agent fell into a pit at this cell. Lost!');
        return { ...prev, agentPos: { x, y }, explored: newExplored, status: 'lost', actionLog: log };
      }
      if (cellType === 'wumpus') {
        const newExplored = prev.explored.map((row, j) =>
          row.map((val, i) => (i === x && j === y ? true : val))
        );
        log.push('Agent encountered the Wumpus at this cell. Lost!');
        return { ...prev, agentPos: { x, y }, explored: newExplored, status: 'lost', actionLog: log };
      }
      if (cellType === 'bat') {
        // Bat: teleport to random empty cell
        const empties: { x: number; y: number }[] = [];
        for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++)
          if (prev.board[j][i].type === 'empty') empties.push({ x: i, y: j });
        if (empties.length > 0) {
          const idx = Math.floor(Math.random() * empties.length);
          const nx = empties[idx].x, ny = empties[idx].y;
          const teleExplored = prev.explored.map((row, j) =>
            row.map((val, i) => (i === nx && j === ny ? true : val))
          );
          log.push(`Agent was carried by bats from (${x + 1},${y + 1}) to (${nx + 1},${ny + 1})!`);
          return { ...prev, agentPos: { x: nx, y: ny }, explored: teleExplored, actionLog: log };
        }
      }
      // Mark explored and update board (move agent)
      const newBoard = board.map((row, j) =>
        row.map((cell, i) => {
          if (i === agentPos.x && j === agentPos.y) return { ...cell, type: cell.type === 'agent' ? 'empty' as const : cell.type };
          if (i === x && j === y) return { ...cell, type: 'agent' as const, explored: true };
          return cell;
        })
      );
      const newExplored = prev.explored.map((row, j) =>
        row.map((val, i) => (i === x && j === y ? true : val))
      );
      // Sensory messages
      const adj = [
        [0, -1], [1, 0], [0, 1], [-1, 0]
      ];
      let adjWumpus = false, adjPits = 0, adjBats = 0;
      for (const [dx2, dy2] of adj) {
        const nx = x + dx2, ny = y + dy2;
        if (nx < 0 || nx >= 20 || ny < 0 || ny >= 20) continue;
        const t = prev.board[ny][nx].type;
        if (t === 'wumpus') adjWumpus = true;
        if (t === 'pit') adjPits++;
        if (t === 'bat') adjBats++;
      }
      if (adjWumpus) log.push('You smell something terrible nearby.');
      if (adjPits) log.push('You feel a breeze nearby.');
      if (adjBats) log.push('You hear flapping nearby.');
      return { ...prev, agentPos: { x, y }, board: newBoard, explored: newExplored, actionLog: log };
    });
  };

  // Manual shoot handler
  const handleManualShoot = () => {
    setGame((prev) => {
      if (prev.status !== 'playing') return prev;
      const { agentPos, board, agentState } = prev;
      let log = prev.actionLog ? [...prev.actionLog] : [];
      // Check adjacent cells for Wumpus
      const adj = [
        { x: agentPos.x, y: agentPos.y - 1 }, // Up
        { x: agentPos.x + 1, y: agentPos.y }, // Right
        { x: agentPos.x, y: agentPos.y + 1 }, // Down
        { x: agentPos.x - 1, y: agentPos.y }  // Left
      ];
      let wumpusFound = false;
      for (const { x, y } of adj) {
        if (x < 0 || x >= 20 || y < 0 || y >= 20) continue;
        if (prev.board[y][x].type === 'wumpus') {
          wumpusFound = true;
          break;
        }
      }
      if (wumpusFound) {
        log.push('You shoot and hit the Wumpus! You won!');
        return { ...prev, status: 'won', actionLog: log };
      } else {
        log.push('You shoot and miss...');
        return { ...prev, actionLog: log };
      }
    });
  };

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '100%', margin: '8px 0 0 0', paddingLeft: 32 }}>
        <h1 style={{ fontSize: 28, margin: 0, flex: '0 0 auto' }}>Hunt the Wumpus</h1>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginLeft: 32, gap: 12 }}>
          <Controls
            onNewGame={handleNewGame}
            onToggleMode={handleToggleMode}
            mode={mode}
            onStep={mode === 'auto' ? handleStep : undefined}
            canStep={game.status === 'playing'}
          />
          {mode === 'auto' && (
            <button
              onClick={handleAutoPlay}
              disabled={game.status !== 'playing'}
              style={{ minWidth: 120, height: 28, fontSize: 15, borderRadius: 4, marginLeft: 4, marginRight: 4, padding: '0 12px', boxSizing: 'border-box', verticalAlign: 'middle' }}
            >
              {autoRunning ? 'Pause Auto' : 'Auto Play'}
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flex: 1, width: '100%', marginTop: 0 }}>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 32 }}>
          <Stats game={game} />
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Board game={game} />
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 32 }}>
          <div style={{ background: '#222', color: '#fff', marginTop: 0, padding: 12, borderRadius: 8, maxHeight: 400, overflowY: 'auto', fontSize: 14, minWidth: 340, width: 340 }}>
            <b>Action Log:</b>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {log.slice(-18).map((entry, i) => {
                let color = '#fff';
                if (/WON!|killed the Wumpus|found the gold/i.test(entry)) color = '#00e676'; // green
                else if (/Lost!|fell into a pit|encountered the Wumpus/i.test(entry)) color = '#ff7043'; // orange/red
                else if (/warning|breeze|smell|hear flapping/i.test(entry)) color = '#b388ff'; // purple
                else if (/shoots|arrow|teleport|carried by bats/i.test(entry)) color = '#4fc3f7'; // light blue
                return (
                  <li key={i} style={{ color }}>{entry}</li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
