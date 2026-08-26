import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Home, Play, TrendingUp, User, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './BottomNavigation.css';

export interface BottomNavigationProps {
  onOpenPractice?: () => void;
}

export const BottomNavigation = ({ onOpenPractice }: BottomNavigationProps) => {
  const location = useLocation();
  const tabs = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/practice', label: 'Practice', icon: Play },
    { to: '/context', label: 'Context', icon: Settings },
    { to: '/progress', label: 'Progress', icon: TrendingUp },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="grove-bottom-nav-wrapper">
      <nav className="grove-bottom-nav">
        <div className="grove-bottom-nav__container">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.to;
            
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                onClick={(e) => {
                  if (tab.to === '/practice' && onOpenPractice) {
                    e.preventDefault();
                    onOpenPractice();
                  }
                }}
                className={clsx('grove-bottom-nav__tab', {
                  'grove-bottom-nav__tab--active': isActive
                })}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="grove-bottom-nav__indicator"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                <span className="grove-bottom-nav__icon-wrapper">
                  <Icon size={24} strokeWidth={isActive ? 2 : 1.5} className="grove-bottom-nav__icon" />
                </span>
                
                <AnimatePresence>
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, width: 'auto', marginLeft: 8 }}
                      exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="grove-bottom-nav__label"
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
