import React from 'react';

interface ControlsProps {
  onNewGame: () => void;
  onStep?: () => void;
  canStep?: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onNewGame, onStep, canStep }) => (
  <div style={{ margin: '16px 0', display: 'flex', gap: 16 }}>
    <button onClick={onNewGame}>New Game</button>
    {onStep && (
      <button onClick={onStep} disabled={!canStep}>Next Step</button>
    )}
  </div>
);

export default Controls;
