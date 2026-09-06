import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Play, Settings, TrendingUp, User, Mic, Flame } from 'lucide-react';
import { ArticulateLogo } from './ArticulateLogo';
import { useAuth } from '../contexts/AuthContext';
import { calculateStreak } from '../lib/streak';
import './DesktopSidebar.css';

interface DesktopSidebarProps {
  onOpenPractice?: () => void;
}

export const DesktopSidebar = ({ onOpenPractice }: DesktopSidebarProps) => {
  const location = useLocation();
  const { profile, user } = useAuth();

  const [sessions, setSessions] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadSessions = () => {
      try {
        const raw = localStorage.getItem('grove_session_history');
        if (raw) setSessions(JSON.parse(raw));
      } catch (e) {
        console.warn("Could not read sessions:", e);
      }
    };
    loadSessions();
    window.addEventListener('storage', loadSessions);
    window.addEventListener('grove_session_updated', loadSessions);
    return () => {
      window.removeEventListener('storage', loadSessions);
      window.removeEventListener('grove_session_updated', loadSessions);
    };
  }, []);

  const streak = calculateStreak(sessions) || profile?.current_streak || 0;

  // Extract user first name
  let name = profile?.first_name;
  if (!name && user?.user_metadata) {
    const fullName = user.user_metadata.full_name || user.user_metadata.name;
    if (fullName) name = fullName.split(' ')[0];
  }
  name = name || 'User';

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/practice', label: 'Practice', icon: Play },
    { to: '/context', label: 'Context', icon: Settings },
    { to: '/progress', label: 'Progress', icon: TrendingUp },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <aside className="desktop-sidebar" aria-label="Desktop Navigation">
      <div>
        {/* Brand Header */}
        <div className="desktop-sidebar__header">
          <ArticulateLogo size={28} />
          <h2 className="desktop-sidebar__brand">
            Articulate
          </h2>
        </div>

        {/* Quick Practice Trigger Button */}
        <div className="desktop-sidebar__action">
          <button 
            className="desktop-sidebar__practice-btn"
            onClick={onOpenPractice}
            type="button"
          >
            <Mic size={17} strokeWidth={2.2} />
            <span>Start Practice</span>
          </button>
        </div>

        {/* Main Navigation Links */}
        <nav className="desktop-sidebar__nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={(e) => {
                  if (item.to === '/practice' && onOpenPractice) {
                    e.preventDefault();
                    onOpenPractice();
                  }
                }}
                className={({ isActive: active }) => 
                  `desktop-sidebar__link ${active ? 'desktop-sidebar__link--active' : ''}`
                }
              >
                <span className="desktop-sidebar__link-icon">
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer User Mini Card */}
      <div className="desktop-sidebar__footer">
        <div className="desktop-sidebar__user">
          <div className="desktop-sidebar__avatar">
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="desktop-sidebar__user-name">{name}</span>
        </div>
        {streak > 0 && (
          <div className="desktop-sidebar__streak" title={`${streak} day streak`}>
            <Flame size={13} color="var(--grove-moss)" />
            <span>{streak}d</span>
          </div>
        )}
      </div>
    </aside>
  );
};
