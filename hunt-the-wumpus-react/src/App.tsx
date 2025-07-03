import React from 'react';
import Board from './components/Board';
import Stats from './components/Stats';
import { createNewGame, createAgentState, agentStepWithAlgorithm } from './utils/gameLogic';
import { GameState } from './utils/gameTypes';
import './App.css';
import agentImg from './assets/agent.png';
import wumpusImg from './assets/wumpus.png';
import pitImg from './assets/pit.png';
import goldImg from './assets/gold.png';
import wallImg from './assets/wall.png';

const getModalContent = (game: GameState, log: string[]) => {
  if (game.status !== 'won' && game.status !== 'lost') return null;
  let title = '', desc = '', border = '', asset = null;

  // Find the last relevant message
  let lastMsg = '';
  function cleanMsg(msg: string) {
    // Remove any (at x,y) or (at xx,yy) at the end of the message
    return msg.replace(/\(at\s*\d+,\d+\)/gi, '').replace(/\(at\s*\d+\,\d+\)/gi, '').replace(/\s+$/, '').trim();
  }
  if (game.status === 'won') {
    title = 'You Win!';
    border = '4px solid #00e676';
    lastMsg = log.slice().reverse().find(l => /Agent found the gold|Agent killed the Wumpus/i) || '';
    if (/Agent found the gold/i.test(lastMsg)) {
      asset = goldImg;
    } else if (/Agent killed the Wumpus/i.test(lastMsg)) {
      asset = wumpusImg;
    } else {
      asset = goldImg;
    }
    desc = cleanMsg(lastMsg) || 'You win!';
  } else {
    title = 'You Lose';
    border = '4px solid #ff7043';
    lastMsg = log.slice().reverse().find(l => /Agent fell into a pit|Agent encountered the Wumpus|No moves left/i) || '';
    if (/Agent fell into a pit/i.test(lastMsg)) {
      asset = pitImg;
    } else if (/Agent encountered the Wumpus/i.test(lastMsg)) {
      asset = wumpusImg;
    } else if (/No moves left/i.test(lastMsg)) {
      asset = wallImg;
    } else {
      asset = wumpusImg;
    }
    desc = cleanMsg(lastMsg) || 'You lost!';
  }
  return { title, desc, border, asset };
};

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
  const [modalOpen, setModalOpen] = React.useState(false);

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

  React.useEffect(() => {
    if (game.status === 'won' || game.status === 'lost') setModalOpen(true);
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

  const modalContent = getModalContent(game, log);

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100vw', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      {/* Modal overlay */}
      {modalOpen && modalContent && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.55)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#181818', color: '#fff', borderRadius: 18, border: modalContent.border, minWidth: 420, maxWidth: 540, minHeight: 180, boxShadow: '0 8px 32px #000a', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: 32, cursor: 'pointer', position: 'relative', gap: 24
            }}
          >
            <img src={agentImg} alt="Agent" style={{ width: 72, height: 72, borderRadius: 12, background: '#222', marginRight: 16 }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>{modalContent.title}</div>
              <div style={{ fontSize: 18, opacity: 0.92, whiteSpace: 'pre-line' }}>{modalContent.desc}</div>
              <div style={{ fontSize: 14, opacity: 0.6, marginTop: 18 }}>(Click anywhere to close)</div>
            </div>
            <img src={modalContent.asset} alt="Result" style={{ width: 72, height: 72, borderRadius: 12, background: '#222', marginLeft: 16 }} />
          </div>
        </div>
      )}
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
