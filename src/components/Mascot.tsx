import React from 'react';
import GroveOrb from './GroveOrb';
import clsx from 'clsx';
import './Mascot.css';

export type MascotState = 
  | 'standing' 
  | 'hovering' 
  | 'looking_at_you' 
  | 'listening' 
  | 'thinking' 
  | 'celebrating' 
  | 'waiting' 
  | 'sleeping';

export interface MascotProps {
  state?: MascotState;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const Mascot = ({ state = 'standing', className, size = 120, style }: MascotProps) => {
  // Map our app's 2D states to the Orb's states
  let modelState = 'idle';
  switch(state) {
    case 'looking_at_you':
    case 'hovering':
      modelState = 'active';
      break;
    case 'listening':
      modelState = 'listening';
      break;
    case 'thinking':
      modelState = 'thinking';
      break;
    case 'celebrating':
      modelState = 'celebrating';
      break;
    case 'sleeping':
      modelState = 'sleeping';
      break;
    case 'standing':
    case 'waiting':
    default:
      modelState = 'idle';
  }

  return (
    <div 
      className={clsx('grove-mascot-3d-wrapper', className)}
      style={{ 
        width: size, 
        height: size, 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style 
      }}
    >
      <div style={{ width: '100%', height: '100%', transform: 'scale(1.6)', transformOrigin: 'center center', pointerEvents: 'none' }}>
        <GroveOrb state={modelState} showControls={false} />
      </div>
    </div>
  );
};
