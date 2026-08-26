import React, { forwardRef } from 'react';
import clsx from 'clsx';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, leadingIcon, trailingIcon, error, helperText, className, disabled, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    
    return (
      <div className={clsx('grove-input-wrapper', className, { 'grove-input-wrapper--disabled': disabled })}>
        <label htmlFor={inputId} className="grove-input__label">
          {label}
        </label>
        
        <div className={clsx('grove-input__container', { 'grove-input__container--error': !!error })}>
          {leadingIcon && <span className="grove-input__icon leading">{leadingIcon}</span>}
          
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={clsx('grove-input__field', {
              'has-leading': !!leadingIcon,
              'has-trailing': !!trailingIcon
            })}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            {...props}
          />
          
          {trailingIcon && <span className="grove-input__icon trailing">{trailingIcon}</span>}
        </div>
        
        {error ? (
          <span id={errorId} className="grove-input__message grove-input__message--error" aria-live="polite">
            {error}
          </span>
        ) : helperText ? (
          <span id={helperId} className="grove-input__message">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
