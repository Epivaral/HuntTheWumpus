import React from 'react';
import { GameState } from '../utils/gameTypes';

interface StatsProps {
  game: GameState;
  stats: { games: number; victories: number };
  algorithm: string;
  setAlgorithm: (alg: string) => void;
}

const getStatusColor = (status: string) => {
  if (status === 'won') return '#0f0';
  if (status === 'lost') return '#f00';
  if (status === 'playing') return '#09f';
  return '#fff';
};

const getSuccessColor = (rate: number) => {
  if (rate >= 70) return '#0f0'; // green
  if (rate >= 40) return '#ff0'; // yellow
  if (rate > 0) return 'orange'; // orange
  return '#f00'; // red
};

const Stats: React.FC<StatsProps & { onNewGame: () => void; onStep: () => void; onAuto: () => void; autoRunning: boolean; canStep: boolean; }> = ({ game, stats, algorithm, setAlgorithm, onNewGame, onStep, onAuto, autoRunning, canStep }) => {
  const successRate = stats.games ? (stats.victories / stats.games) * 100 : 0;
  return (
    <div style={{ background: '#222', color: '#fff', padding: 16, borderRadius: 8, minWidth: 220, minHeight: 420, marginLeft: 32, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' }}>
      <h2 style={{ fontSize: 20, margin: '0 0 12px 0' }}>Game Stats</h2>
      <div style={{ alignSelf: 'stretch' }}>Games played: <b>{stats.games}</b></div>
      <div style={{ alignSelf: 'stretch' }}>Victories: <b>{stats.victories}</b></div>
      <div style={{ alignSelf: 'stretch' }}>Success rate: <b style={{ color: getSuccessColor(successRate) }}>{successRate.toFixed(2)}%</b></div>
      <div style={{ alignSelf: 'stretch' }}>Agent position: <b>({game.agentPos.x + 1}, {game.agentPos.y + 1})</b></div>
      <div style={{ alignSelf: 'stretch' }}>Wumpus position: <b>({game.wumpusPos.x + 1}, {game.wumpusPos.y + 1})</b></div>
      <div style={{ alignSelf: 'stretch' }}>Gold position: <b style={{ color: 'gold' }}>({game.goldPos.x + 1}, {game.goldPos.y + 1})</b></div>
      <div style={{ alignSelf: 'stretch' }}>Bats: <b>{game.batPositions.length}</b></div>
      <div style={{ alignSelf: 'stretch' }}>Pits: <b>{game.pitPositions.length}</b></div>
      {game.agentState && (
        <div style={{ alignSelf: 'stretch' }}>Arrows left: <b>{game.agentState.arrows}</b></div>
      )}
      <div style={{ alignSelf: 'stretch' }}>Status: <b style={{ color: getStatusColor(game.status) }}>{game.status}</b></div>
      {/* Spacer for clarity */}
      <div style={{ height: 24 }} />
      <div style={{ marginTop: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12, width: '100%' }}>
        <label htmlFor="algo-select" style={{ marginBottom: 4 }}>Algorithm: </label>
        <select id="algo-select" value={algorithm} onChange={e => setAlgorithm(e.target.value)} style={{ marginBottom: 12 }}>
          <option value="dfs">DFS</option>
          <option value="astar">A*</option>
        </select>
        <button onClick={onNewGame} style={{ marginBottom: 4 }}>New Game</button>
        <button onClick={onStep} disabled={!canStep} style={{ marginBottom: 4 }}>Next Step</button>
        <button
          onClick={onAuto}
          disabled={!canStep}
          style={{ minWidth: 120, height: 28, fontSize: 15, borderRadius: 4, margin: 0, padding: '0 12px', boxSizing: 'border-box', verticalAlign: 'middle' }}
        >
          {autoRunning ? 'Pause Auto' : 'Auto Play'}
        </button>
      </div>
    </div>
  );
};

export default Stats;
