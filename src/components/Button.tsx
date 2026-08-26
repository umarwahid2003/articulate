import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';
import './Button.css';

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, 'size' | 'prefix'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'large' | 'medium' | 'small';
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'medium',
      leadingIcon,
      trailingIcon,
      isLoading,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'grove-btn',
          `grove-btn--${variant}`,
          `grove-btn--${size}`,
          className
        )}
        whileHover={isDisabled ? undefined : "hover"}
        whileTap={isDisabled ? undefined : "pressed"}
        variants={{
          hover: { scale: 1 },
          pressed: { scale: 0.97 },
        }}
        transition={{ duration: 0.1, ease: [0.4, 0.0, 0.2, 1] }}
        {...props}
      >
        {isLoading ? (
          <span className="grove-btn__loader" aria-busy="true"></span>
        ) : (
          <>
            {leadingIcon && <span className="grove-btn__icon leading">{leadingIcon as any}</span>}
            <span className="grove-btn__label">{children as any}</span>
            {trailingIcon && <span className="grove-btn__icon trailing">{trailingIcon as any}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
