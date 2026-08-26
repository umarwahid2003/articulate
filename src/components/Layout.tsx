import React from 'react';
import './Layout.css';
import clsx from 'clsx';

export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Layout({ children, className, style }: LayoutProps) {
  return (
    <div className={clsx('grove-layout', className)} style={style}>
      {children}
    </div>
  );
}
