import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Target, BarChart2, Compass, User, Mail, Edit3 } from 'lucide-react';
import { UserContext } from '../types/user';
import { Button } from '../components/Button';
import { motion } from 'framer-motion';

export function AccountDetails() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const [userContext, setUserContext] = useState<UserContext | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('grove_user_context');
      if (saved) {
        setUserContext(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error reading context:", e);
    }
  }, []);

  let name = profile?.first_name;
  if (!name && user?.user_metadata) {
    const fullName = user.user_metadata.full_name || user.user_metadata.name;
    if (fullName) {
      name = fullName.split(' ')[0];
    }
  }
  name = name || 'User';
  const email = user?.email || 'user@example.com';

  return (
    <Layout className="page-with-bottom-nav">
      <NavigationBar 
        title="Account Details"
        showBack={true}
        onBack={() => navigate('/profile')}
      />

      <div style={{ padding: '24px', paddingBottom: '140px', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '8px' }}>
        
        {/* Profile Identity Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Personal Information
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-secondary)' }}>
              <User size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>Full Name</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink-base)' }}>{name}</div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--surface-sunken)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-secondary)' }}>
              <Mail size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>Email Address</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink-base)' }}>{email}</div>
            </div>
          </div>
        </motion.div>

        {/* Speaking Preferences & Goal Section */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Speaking Profile
            </h3>
            <button
              onClick={() => navigate('/onboarding')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--grove-moss)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <Edit3 size={14} />
              <span>Edit</span>
            </button>
          </div>

          {/* Goal */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(31, 122, 108, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grove-moss)', flexShrink: 0 }}>
              <Target size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>Primary Speaking Goal</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink-base)', marginTop: '2px' }}>
                {userContext?.goal || "Job Interviews & Career"}
              </div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--surface-sunken)' }} />

          {/* Level */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-secondary)', flexShrink: 0 }}>
              <BarChart2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>Current Proficiency Level</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink-base)', marginTop: '2px' }}>
                {userContext?.level || "Intermediate"}
              </div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--surface-sunken)' }} />

          {/* Interests */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-secondary)', flexShrink: 0 }}>
              <Compass size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '6px' }}>Topics of Interest</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(userContext?.interests && userContext.interests.length > 0 ? userContext.interests : ['Tech & AI', 'Startups']).map((interest, i) => (
                  <span 
                    key={i} 
                    style={{ 
                      backgroundColor: 'var(--surface-sunken)', 
                      color: 'var(--ink-base)', 
                      fontSize: '13px', 
                      fontWeight: 500, 
                      padding: '4px 10px', 
                      borderRadius: '100px' 
                    }}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
        >
          <Button
            variant="secondary"
            onClick={() => navigate('/onboarding')}
            style={{ width: '100%', borderRadius: '18px' }}
          >
            Update Goals & Preferences
          </Button>
        </motion.div>

      </div>
    </Layout>
  );
}
