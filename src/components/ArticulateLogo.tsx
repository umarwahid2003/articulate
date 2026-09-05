import React from 'react';

interface ArticulateLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  showBackground?: boolean;
}

export const ArticulateLogo: React.FC<ArticulateLogoProps> = ({
  size = 48,
  className,
  style,
  showBackground = true
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
      aria-label="Articulate Logo"
    >
      {showBackground && (
        <rect x="0" y="0" width="200" height="200" rx="44" ry="44" fill="#F7F6F2" />
      )}
      {/* Abstract "A": two converging strokes, moss green */}
      <path d="M100 40L56 154" stroke="#2F4B3C" strokeWidth="11" strokeLinecap="round" />
      <path d="M100 40L144 154" stroke="#2F4B3C" strokeWidth="11" strokeLinecap="round" />
      {/* Crossbar reimagined as clean acoustic soundwave curve */}
      <path 
        d="M68 125C79 104 90 146 100 125C110 104 121 146 132 125"
        stroke="#14171A" 
        strokeWidth="7.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
};
