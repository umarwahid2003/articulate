import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import './NavigationBar.css';

export interface NavigationBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  trailingActions?: React.ReactNode[]; // Max 2 icon buttons
}

export const NavigationBar = ({ title, showBack = false, onBack, trailingActions = [] }: NavigationBarProps) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={clsx('grove-nav-bar', { 'grove-nav-bar--scrolled': isScrolled })}>
      <div className="grove-nav-bar__container">
        <div className="grove-nav-bar__leading">
          {showBack && (
            <button 
              className="grove-nav-bar__action-btn" 
              onClick={handleBack}
              aria-label="Back"
            >
              <ChevronLeft size={24} strokeWidth={1.5} />
            </button>
          )}
        </div>
        
        {title && (
          <h1 className={clsx('grove-nav-bar__title', { 'grove-nav-bar__title--centered': showBack })}>
            {title}
          </h1>
        )}
        
        <div className="grove-nav-bar__trailing">
          {trailingActions.slice(0, 2).map((action, index) => (
            <div key={index} className="grove-nav-bar__action-wrapper">
              {action}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
};
