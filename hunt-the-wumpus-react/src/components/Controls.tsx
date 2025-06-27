import React from 'react';

interface ControlsProps {
  onNewGame: () => void;
  onToggleMode: () => void;
  mode: 'auto' | 'manual';
  onStep?: () => void;
  canStep?: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onNewGame, onToggleMode, mode, onStep, canStep }) => (
  <div style={{ margin: '16px 0', display: 'flex', gap: 16 }}>
    <button onClick={onNewGame}>New Game</button>
    <button onClick={onToggleMode}>Mode: {mode === 'auto' ? 'Automatic' : 'Manual'}</button>
    {mode === 'auto' && onStep && (
      <button onClick={onStep} disabled={!canStep}>Next Step</button>
    )}
  </div>
);

export default Controls;
