import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import './ProgressRing.css';

export interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  dimension?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  small: { dimension: 24, stroke: 2 },
  medium: { dimension: 48, stroke: 4 },
  large: { dimension: 96, stroke: 6 },
  xlarge: { dimension: 160, stroke: 8 },
};

export const ProgressRing = ({ progress, size = 'medium', dimension: customDim, strokeWidth: customStroke, children, className, style }: ProgressRingProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const dimension = customDim || SIZE_MAP[size].dimension;
  const stroke = customStroke || SIZE_MAP[size].stroke;
  const radius = (dimension - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeProgress = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    // Slight delay to allow initial mount before animating to value
    const timeout = setTimeout(() => setAnimatedProgress(safeProgress), 50);
    return () => clearTimeout(timeout);
  }, [safeProgress]);

  const isComplete = safeProgress === 100;

  return (
    <div 
      className={clsx('grove-progress-ring', `grove-progress-ring--${size}`, className, {
        'grove-progress-ring--complete': isComplete
      })}
      style={{ width: dimension, height: dimension, ...style }}
      role="progressbar"
      aria-valuenow={safeProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        className="grove-progress-ring__svg"
        height={dimension}
        width={dimension}
      >
        <circle
          className="grove-progress-ring__track"
          strokeWidth={stroke}
          fill="transparent"
          r={radius}
          cx={dimension / 2}
          cy={dimension / 2}
        />
        <circle
          className="grove-progress-ring__arc"
          strokeWidth={stroke}
          fill="transparent"
          r={radius}
          cx={dimension / 2}
          cy={dimension / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      {children && (
        <div className="grove-progress-ring__content">
          {children}
        </div>
      )}
    </div>
  );
};
