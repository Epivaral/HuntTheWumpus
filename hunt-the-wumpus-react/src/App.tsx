import React from 'react';
import Board from './components/Board';
import Stats from './components/Stats';
import Controls from './components/Controls';
import { createNewGame, createAgentState, agentStep } from './utils/gameLogic';
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
    setGame((prev) => agentStep({ ...prev, agentState: prev.agentState }));
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
    <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '100%', margin: '8px 0 0 0', paddingLeft: 32 }}>
        <h1 style={{ fontSize: 28, margin: 0, flex: '0 0 auto' }}>Hunt the Wumpus</h1>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginLeft: 32, gap: 12 }}>
          <Controls
            onNewGame={handleNewGame}
            onStep={handleStep}
            canStep={game.status === 'playing'}
          />
          <button
            onClick={handleAutoPlay}
            disabled={game.status !== 'playing'}
            style={{ minWidth: 120, height: 28, fontSize: 15, borderRadius: 4, marginLeft: 4, marginRight: 4, padding: '0 12px', boxSizing: 'border-box', verticalAlign: 'middle' }}
          >
            {autoRunning ? 'Pause Auto' : 'Auto Play'}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flex: 1, width: '100%', marginTop: 0 }}>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 32 }}>
          <Stats game={game} stats={stats} />
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Board game={game} />
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 32 }}>
          <div style={{ background: '#222', color: '#fff', marginTop: 0, padding: 12, borderRadius: 8, maxHeight: 400, overflowY: 'auto', fontSize: 14, minWidth: 340, width: 340 }}>
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
    </div>
  );
};

export default App;
