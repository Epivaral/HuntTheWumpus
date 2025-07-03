import React from 'react';
import Board from './components/Board';
import Stats from './components/Stats';
import Controls from './components/Controls';
import { createNewGame, createAgentState, agentStepWithAlgorithm } from './utils/gameLogic';
import { GameState } from './utils/gameTypes';
import './App.css';

const App: React.FC = () => {
  // Persistent stats state
  const [stats, setStats] = React.useState<{ games: number; victories: number }>({ games: 0, victories: 0 });
  const [game, setGame] = React.useState<GameState>(() => {
    const g = createNewGame(stats);
    g.agentState = createAgentState(g.agentPos);
    return g;
  });
  const [autoRunning, setAutoRunning] = React.useState(false);
  const [log, setLog] = React.useState<string[]>(game.actionLog || []);
  const [algorithm, setAlgorithm] = React.useState<string>('dfs');

  React.useEffect(() => {
    setLog(game.actionLog || []);
  }, [game]);

  // Update stats when game ends
  React.useEffect(() => {
    if (game.status === 'won' || game.status === 'lost') {
      setStats((prev) => {
        const isWin = game.status === 'won';
        return {
          games: prev.games + 1,
          victories: prev.victories + (isWin ? 1 : 0),
        };
      });
    }
    // eslint-disable-next-line
  }, [game.status]);

  const handleNewGame = () => {
    const g = createNewGame(stats);
    g.agentState = createAgentState(g.agentPos);
    setGame(g);
    setAutoRunning(false);
  };

  const handleStep = () => {
    setGame((prev) => agentStepWithAlgorithm({ ...prev, agentState: prev.agentState }, algorithm as 'dfs' | 'astar'));
  };

  // Auto play effect
  React.useEffect(() => {
    if (autoRunning && game.status === 'playing') {
      const t = setTimeout(() => handleStep(), 100); 
      return () => clearTimeout(t);
    }
  }, [autoRunning, game]);

  const handleAutoPlay = () => {
    setAutoRunning((r) => !r);
  };

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100vw', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      {/* Left column: Stats panel */}
      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '32px 0 0 32px' }}>
        <Stats
          game={game}
          stats={stats}
          algorithm={algorithm}
          setAlgorithm={setAlgorithm}
          onNewGame={handleNewGame}
          onStep={handleStep}
          onAuto={handleAutoPlay}
          autoRunning={autoRunning}
          canStep={game.status === 'playing'}
        />
      </div>
      {/* Center and right columns: Board and Action log side by side */}
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginTop: 10 }}>
        {/* Center: Board */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
          <Board game={game} />
        </div>
        {/* Right: Action Log */}
        <div style={{ background: '#222', color: '#fff', padding: 12, borderRadius: 8, maxHeight: 600, overflowY: 'auto', fontSize: 14, minWidth: 340, width: 340, marginLeft: 40, marginTop: 0, alignSelf: 'flex-start', boxSizing: 'border-box' }}>
          <b>Action Log:</b>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {log.slice(-40).map((entry, i) => {
              let color = '#fff';
              if (/^\[GOLD\]/.test(entry)) color = 'gold';
              else if (/WON!|killed the Wumpus|found the gold/i.test(entry)) color = '#00e676'; // green
              else if (/Lost!|fell into a pit|encountered the Wumpus/i.test(entry)) color = '#ff7043'; // orange/red
              else if (/warning|breeze|smell|hear flapping/i.test(entry)) color = '#b388ff'; // purple
              else if (/shoots|arrow|teleport|carried by bats/i.test(entry)) color = '#4fc3f7'; // light blue
              return (
                <li key={i} style={{ color }}>{entry.replace(/^\[GOLD\]\s*/, '')}</li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
