import React from 'react';
import { GameState } from '../utils/gameTypes';

interface StatsProps {
  game: GameState;
  stats: { games: number; victories: number };
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

const Stats: React.FC<StatsProps> = ({ game, stats }) => {
  const successRate = stats.games ? (stats.victories / stats.games) * 100 : 0;
  return (
    <div style={{ background: '#222', color: '#fff', padding: 16, borderRadius: 8, minWidth: 220, marginLeft: 32 }}>
      <h2 style={{ fontSize: 20, margin: '0 0 12px 0' }}>Game Stats</h2>
      <div>Games played: <b>{stats.games}</b></div>
      <div>Victories: <b>{stats.victories}</b></div>
      <div>Success rate: <b style={{ color: getSuccessColor(successRate) }}>{successRate.toFixed(2)}%</b></div>
      <div>Agent position: <b>({game.agentPos.x + 1}, {game.agentPos.y + 1})</b></div>
      <div>Wumpus position: <b>({game.wumpusPos.x + 1}, {game.wumpusPos.y + 1})</b></div>
      <div>Gold position: <b style={{ color: 'gold' }}>({game.goldPos.x + 1}, {game.goldPos.y + 1})</b></div>
      <div>Bats: <b>{game.batPositions.length}</b></div>
      <div>Pits: <b>{game.pitPositions.length}</b></div>
      {game.agentState && (
        <div>Arrows left: <b>{game.agentState.arrows}</b></div>
      )}
      <div>Status: <b style={{ color: getStatusColor(game.status) }}>{game.status}</b></div>
    </div>
  );
};

export default Stats;
