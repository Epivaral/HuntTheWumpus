import React from 'react';
import agentImg from '../assets/agent.png';
import wumpusImg from '../assets/wumpus.png';
import batImg from '../assets/bat.png';
import pitImg from '../assets/pit.png';
import goldImg from '../assets/gold.png';
import wallImg from '../assets/wall.png';
import { CellType } from '../utils/gameTypes';

interface CellProps {
  type: CellType;
  explored: boolean;
  hasAgent?: boolean;
}

const imgMap: Record<CellType, string | null> = {
  agent: agentImg,
  wumpus: wumpusImg,
  bat: batImg,
  pit: pitImg,
  gold: goldImg,
  wall: wallImg,
  empty: null,
};

const Cell: React.FC<CellProps> = ({ type, explored, hasAgent }) => {
  const imgSrc = hasAgent ? agentImg : imgMap[type];
  return (
    <div className={`cell${explored ? ' explored' : ''}${type === 'wall' ? ' wall' : ''}`}>
      {imgSrc && <img src={imgSrc} alt={hasAgent ? 'agent' : type} width={40} height={40} />}
    </div>
  );
};

export default Cell;
