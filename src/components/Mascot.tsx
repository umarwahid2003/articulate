import React from 'react';

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

export const Mascot = (_props: MascotProps) => {
  return null;
};

