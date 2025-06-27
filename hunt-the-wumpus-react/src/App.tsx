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

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div>
        <h1>Hunt the Wumpus</h1>
        <Controls
          onNewGame={handleNewGame}
          onToggleMode={handleToggleMode}
          mode={mode}
          onStep={mode === 'auto' ? handleStep : undefined}
          canStep={game.status === 'playing'}
        />
        {mode === 'auto' && (
          <button onClick={handleAutoPlay} disabled={game.status !== 'playing'}>
            {autoRunning ? 'Pause Auto' : 'Auto Play'}
          </button>
        )}
        <Board game={game} />
      </div>
      <Stats game={game} />
    </div>
  );
};

export default App;
