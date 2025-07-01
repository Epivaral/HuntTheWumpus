import React from 'react';
import { GameState } from '../utils/gameTypes';

interface StatsProps {
  game: GameState;
}

const Stats: React.FC<StatsProps> = ({ game }) => {
  return (
    <div style={{ background: '#222', color: '#fff', padding: 16, borderRadius: 8, minWidth: 220, marginLeft: 32 }}>
      <h2 style={{ fontSize: 20, margin: '0 0 12px 0' }}>Game Stats</h2>
      <div>Games played: <b>{game.stats.games}</b></div>
      <div>Victories: <b>{game.stats.victories}</b></div>
      <div>Success rate: <b>{game.stats.games ? ((game.stats.victories / game.stats.games) * 100).toFixed(2) : '0.00'}%</b></div>
      <div>Agent position: <b>({game.agentPos.x + 1}, {game.agentPos.y + 1})</b></div>
      <div>Wumpus position: <b>({game.wumpusPos.x + 1}, {game.wumpusPos.y + 1})</b></div>
      <div>Gold position: <b>({game.goldPos.x + 1}, {game.goldPos.y + 1})</b></div>
      <div>Bats: <b>{game.batPositions.length}</b></div>
      <div>Pits: <b>{game.pitPositions.length}</b></div>
      {game.agentState && (
        <div>Arrows left: <b>{game.agentState.arrows}</b></div>
      )}
      <div>Status: <b style={{ color: game.status === 'won' ? '#0f0' : game.status === 'lost' ? '#f00' : '#fff' }}>{game.status}</b></div>
    </div>
  );
};

export default Stats;
