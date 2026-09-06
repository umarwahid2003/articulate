import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { calculateStreak } from '../lib/streak';
import { LogOut, User, Bell, Shield, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ArticulateLogo } from '../components/ArticulateLogo';
import './Profile.css';

export function Profile() {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    try {
      const historyRaw = localStorage.getItem('grove_session_history');
      if (historyRaw) {
        setSessions(JSON.parse(historyRaw));
      }
    } catch (e) {
      console.error("Error reading sessions:", e);
    }
  }, []);

  const sessionCount = sessions.length;
  const streak = calculateStreak(sessions) || profile?.current_streak || 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // Extract name logic
  let name = profile?.first_name;
  if (!name && user?.user_metadata) {
    const fullName = user.user_metadata.full_name || user.user_metadata.name;
    if (fullName) {
      name = fullName.split(' ')[0];
    }
  }
  name = name || 'User';

  const email = user?.email || '';

  return (
    <Layout className="page-with-bottom-nav">
      <NavigationBar />
      
      <div className="profile-container">
        
        <div className="profile-desktop-grid">
          
          {/* Desktop-only Profile Header */}
          <h2 className="profile-desktop-header">
            Profile
          </h2>

          {/* Left Column Primary Cards (User Card + Stats) */}
          <div className="profile-left-cards">
            {/* User Info Header */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.35 }}
              className="profile-user-card"
            >
              <div style={{ 
                width: '66px', 
                height: '66px', 
                borderRadius: '33px', 
                background: 'var(--gorget-gradient)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{ 
                  width: '62px', 
                  height: '62px', 
                  borderRadius: '31px', 
                  backgroundColor: 'var(--grove-moss)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  fontFamily: 'var(--font-display)'
                }}>
                  {name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', color: 'var(--ink-base)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</h1>
                <p style={{ color: 'var(--ink-secondary)', fontSize: '15px', margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.35, delay: 0.08 }}
              className="profile-stats-row"
            >
              <div className="profile-stat-card">
                <span style={{ fontSize: '24px', fontFamily: 'var(--font-display)', color: 'var(--ink-base)' }}>{streak}</span>
                <span style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginTop: '4px' }}>Day Streak</span>
              </div>
              <div className="profile-stat-card">
                <span style={{ fontSize: '24px', fontFamily: 'var(--font-display)', color: 'var(--ink-base)' }}>{sessionCount}</span>
                <span style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginTop: '4px' }}>Sessions</span>
              </div>
            </motion.div>
          </div>

          {/* Settings Section Header */}
          <h2 className="profile-settings-header">Settings</h2>

          {/* Right Column: Settings Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.35, delay: 0.16 }}
            className="profile-settings-card"
          >
            <SettingRow 
              icon={<User size={20} />} 
              title="Account Details" 
              onClick={() => navigate('/account-details')}
            />
            <div style={{ height: '1px', backgroundColor: 'var(--surface-sunken)', marginLeft: '52px' }} />
            <SettingRow icon={<Bell size={20} />} title="Notifications" />
            <div style={{ height: '1px', backgroundColor: 'var(--surface-sunken)', marginLeft: '52px' }} />
            <SettingRow icon={<Shield size={20} />} title="Privacy & Data" />
            <div style={{ height: '1px', backgroundColor: 'var(--surface-sunken)', marginLeft: '52px' }} />
            <SettingRow icon={<HelpCircle size={20} />} title="Help & Support" />
          </motion.div>

          {/* Right Column Actions (Sign Out + Brand Footer) */}
          <div className="profile-right-actions">
            {/* Sign Out Button */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.35, delay: 0.24 }}
            >
              <button 
                style={{ 
                  width: '100%', 
                  color: 'var(--error-brick)', 
                  backgroundColor: 'var(--surface-raised)', 
                  borderRadius: '24px',
                  border: '1px solid var(--border-subtle)',
                  padding: '18px',
                  fontSize: '16px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
                }}
                onClick={handleSignOut}
              >
                <LogOut size={20} style={{ marginRight: '12px' }} />
                Sign Out
              </button>
            </motion.div>

            {/* Subtle Brand Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.3 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 0 8px',
                gap: '8px'
              }}
            >
              <ArticulateLogo size={34} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  fontFamily: 'var(--font-display)', 
                  color: 'var(--ink-secondary)',
                  letterSpacing: '0.04em'
                }}>
                  ARTICULATE
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--ink-tertiary)', 
                  fontFamily: 'var(--font-body)',
                  marginTop: '2px'
                }}>
                  Version 1.0.0
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

function SettingRow({ icon, title, onClick }: { icon: React.ReactNode, title: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', transition: 'background-color 0.2s' }} 
      className="grove-setting-row"
    >
      <div style={{ color: 'var(--ink-secondary)', marginRight: '16px', display: 'flex' }}>
        {icon}
      </div>
      <div style={{ flex: 1, fontSize: '16px', color: 'var(--ink-primary)' }}>
        {title}
      </div>
      <div style={{ color: 'var(--ink-secondary)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    </div>
  );
}
