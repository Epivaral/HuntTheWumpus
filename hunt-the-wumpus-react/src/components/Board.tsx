import React from 'react';
import Cell from './Cell';
import { GameState } from '../utils/gameTypes';
import './Board.css';

const BOARD_SIZE = 20;

interface BoardProps {
  game: GameState;
}

const Board: React.FC<BoardProps> = ({ game }) => {
  return (
    <div className="board-container" style={{ position: 'relative' }}>
      {/* Column numbers */}
      <div style={{ display: 'flex', flexDirection: 'row', marginLeft: 32 }}>
        <div style={{ width: 24 }} />
        {Array.from({ length: BOARD_SIZE }, (_, x) => (
          <div key={x} style={{ width: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>{x + 1}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        {/* Row numbers and grid */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {Array.from({ length: BOARD_SIZE }, (_, y) => (
            <div key={y} style={{ height: 40, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>{y + 1}</div>
          ))}
        </div>
        <div className="board">
          {game.board.map((row, y) =>
            row.map((cell, x) => (
              <Cell
                key={`${x},${y}`}
                type={cell.type}
                explored={cell.explored || game.explored[y][x]}
                hasAgent={game.agentPos.x === x && game.agentPos.y === y}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Board;
