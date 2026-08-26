import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, User, Bell, Shield, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Profile() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [sessionCount, setSessionCount] = useState<number>(0);

  useEffect(() => {
    try {
      const historyRaw = localStorage.getItem('grove_session_history');
      if (historyRaw) {
        const list = JSON.parse(historyRaw);
        setSessionCount(list.length);
      }
    } catch (e) {
      console.error("Error reading sessions:", e);
    }
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
      
      <div style={{ padding: '24px', paddingBottom: '140px', display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '16px' }}>
        
        {/* User Info Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '40px', 
            backgroundColor: 'var(--grove-moss)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '32px',
            fontFamily: 'var(--font-display)'
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', color: 'var(--ink-base)' }}>{name}</h1>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '15px', marginTop: '4px' }}>{email}</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1, backgroundColor: 'var(--surface-raised)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '24px', fontFamily: 'var(--font-display)', color: 'var(--ink-base)' }}>{profile?.current_streak || (sessionCount > 0 ? 1 : 0)}</span>
            <span style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginTop: '4px' }}>Day Streak</span>
          </div>
          <div style={{ flex: 1, backgroundColor: 'var(--surface-raised)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '24px', fontFamily: 'var(--font-display)', color: 'var(--ink-base)' }}>{sessionCount}</span>
            <span style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginTop: '4px' }}>Sessions</span>
          </div>
        </div>

        {/* Settings List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-display)', color: 'var(--ink-base)', marginBottom: '8px', paddingLeft: '8px' }}>Settings</h2>
          
          <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', overflow: 'hidden' }}>
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
          </div>
        </div>

        {/* Sign Out Button */}
        <div style={{ marginTop: '8px' }}>
          <button 
            style={{ 
              width: '100%', 
              color: 'var(--grove-red)', 
              backgroundColor: 'var(--surface-raised)', 
              borderRadius: '24px',
              border: 'none',
              padding: '18px',
              fontSize: '16px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            onClick={handleSignOut}
          >
            <LogOut size={20} style={{ marginRight: '12px' }} />
            Sign Out
          </button>
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
