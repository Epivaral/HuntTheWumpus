import React from 'react';
import './Board.css';

const BOARD_SIZE = 20;

const Board: React.FC = () => {
  // Placeholder: Render a 20x20 grid
  return (
    <div className="board">
      {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, idx) => (
        <div className="cell" key={idx}></div>
      ))}
    </div>
  );
};

export default Board;
