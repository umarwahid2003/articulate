import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';
import './Card.css';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  size?: 'compact' | 'standard' | 'feature';
  media?: React.ReactNode;
  title: string | React.ReactNode;
  subtitle?: React.ReactNode;
  trailingMetadata?: React.ReactNode;
  interactive?: boolean;
}

export function Card({
  size = 'standard',
  media,
  title,
  subtitle,
  trailingMetadata,
  interactive = false,
  className,
  ...props
}: CardProps) {
  const isClickable = interactive || props.onClick !== undefined;

  const content = (
    <>
      {media && <div className="grove-card__media">{media}</div>}
      <div className="grove-card__content">
        <div className="grove-card__title">{title}</div>
        {subtitle && <div className="grove-card__subtitle">{subtitle}</div>}
      </div>
      {trailingMetadata && (
        <div className="grove-card__trailing-meta">{trailingMetadata}</div>
      )}
    </>
  );

  if (isClickable) {
    return (
      <motion.button
        className={clsx('grove-card', `grove-card--${size}`, 'grove-card--interactive', className)}
        whileHover="hover"
        whileTap="pressed"
        variants={{
          hover: { scale: 1 },
          pressed: { scale: 0.98 }
        }}
        transition={{ duration: 0.1, ease: [0.4, 0.0, 0.2, 1] }}
        {...(props as any)}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <div className={clsx('grove-card', `grove-card--${size}`, className)} {...props}>
      {content}
    </div>
  );
}
