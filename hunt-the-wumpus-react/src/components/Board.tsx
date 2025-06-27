import React from 'react';
import Cell from './Cell';
import { createNewGame } from '../utils/gameLogic';
import { GameState } from '../utils/gameTypes';
import './Board.css';

const BOARD_SIZE = 20;

const Board: React.FC = () => {
  // For now, just create a new game on mount
  const [game, setGame] = React.useState<GameState>(() => createNewGame());

  return (
    <div className="board">
      {game.board.map((row, y) =>
        row.map((cell, x) => <Cell key={`${x},${y}`} type={cell.type} explored={cell.explored} />)
      )}
    </div>
  );
};

export default Board;
