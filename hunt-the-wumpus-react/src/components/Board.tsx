import React from 'react';
import Cell from './Cell';
import { GameState } from '../utils/gameTypes';
import './Board.css';

interface BoardProps {
  game: GameState;
}

const Board: React.FC<BoardProps> = ({ game }) => {
  return (
    <div className="board">
      {game.board.map((row, y) =>
        row.map((cell, x) => <Cell key={`${x},${y}`} type={cell.type} explored={cell.explored || game.explored[y][x]} />)
      )}
    </div>
  );
};

export default Board;
