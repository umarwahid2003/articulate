import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { Button } from '../components/Button';
import { Mic, Check } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SessionRecord } from './Practice';
import { calculateStreak, hasPracticedToday, toLocalDateString } from '../lib/streak';
import { motion } from 'framer-motion';

import './Home.css';

export function Home() {
  const { openPracticeSheet } = useOutletContext<{ openPracticeSheet: () => void }>();
  const { profile, user } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    const loadSessions = () => {
      try {
        const historyRaw = localStorage.getItem('grove_session_history');
        if (historyRaw) {
          setSessions(JSON.parse(historyRaw));
        }
      } catch (e) {
        console.error("Error reading sessions:", e);
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

  // Memoize week days calculation
  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDayIndex = (now.getDay() + 6) % 7;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayIndex);
    monday.setHours(0, 0, 0, 0);

    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    
    return dayLabels.map((label, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index);
      const targetDateKey = toLocalDateString(targetDate);

      const hasPracticed = sessions.some(
        s => toLocalDateString(s.timestamp) === targetDateKey
      );

      const isToday = index === currentDayIndex;
      const isPast = index < currentDayIndex;

      return {
        label,
        hasPracticed,
        isToday,
        isPast,
      };
    });
  }, [sessions]);

  const streak = useMemo(() => calculateStreak(sessions), [sessions]);
  const isPracticedToday = useMemo(() => hasPracticedToday(sessions), [sessions]);

  const totalMinutes = useMemo(() => {
    const totalSecs = sessions.reduce((acc, s) => acc + (s.durationSeconds || 60), 0);
    return Math.round(totalSecs / 60);
  }, [sessions]);

  const greeting = useMemo(() => {
    let name = profile?.first_name;
    if (!name && user?.user_metadata) {
      const fullName = user.user_metadata.full_name || user.user_metadata.name;
      if (fullName) {
        name = fullName.split(' ')[0];
      }
    }
    return { name: name || 'There' };
  }, [profile?.first_name, user?.user_metadata]);

  return (
    <Layout className="page-with-bottom-nav">
      <NavigationBar />
      
      <div className="home-container">
        
        {/* Header Greeting */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="home-header"
        >
          <h1 style={{ 
            fontSize: '48px', 
            fontFamily: 'var(--font-display)', 
            color: 'var(--ink-base)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: 0
          }}>
            Hello, <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: 'var(--grove-moss)', fontSize: '54px' }}>{greeting.name}</span>
          </h1>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '18px', marginTop: '10px', lineHeight: 1.4 }}>
            {streak > 0 
              ? (isPracticedToday ? `🔥 ${streak} day streak! Great practice today.` : `🔥 ${streak} day streak! Practice today to keep it.`)
              : (sessions.length > 0 ? "Let's start a new daily streak!" : "Ready for today's practice?")}
          </p>
        </motion.div>

        {/* Responsive Content Grid */}
        <div className="home-grid">
          
          {/* Weekly Habit Tracker */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="home-growth-card"
          >
            <div>
              <h3 style={{ fontSize: '17px', fontFamily: 'var(--font-display)', margin: '0 0 16px 0', color: 'var(--ink-base)' }}>
                Weekly Growth
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {weekDays.map((day, i) => {
                  const isFilled = day.hasPracticed;
                  const isCurrentDay = day.isToday;

                  return (
                    <div 
                      key={i} 
                      style={{
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '19px', 
                        backgroundColor: isFilled ? 'var(--grove-moss)' : 'var(--surface-sunken)',
                        color: isFilled ? '#ffffff' : 'var(--ink-secondary)',
                        border: !isFilled && isCurrentDay ? '2px solid var(--grove-moss)' : 'none',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '14px', 
                        fontWeight: 700,
                        boxShadow: isFilled ? '0 2px 8px rgba(31, 122, 108, 0.25)' : 'none',
                        transition: 'all 0.2s ease',
                        animation: (!isFilled && isCurrentDay) ? 'pulse 2s ease-in-out infinite' : 'none'
                      }}
                      title={isFilled ? `Practiced on ${day.label}` : isCurrentDay ? 'Practice today!' : day.label}
                    >
                      {isFilled ? <Check size={16} strokeWidth={3} /> : day.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Stats Summary */}
            <div className="home-desktop-stats">
              <div className="home-desktop-stat-pill">
                <span className="home-desktop-stat-label">Total Sessions</span>
                <span className="home-desktop-stat-val">{sessions.length}</span>
              </div>
              <div className="home-desktop-stat-pill">
                <span className="home-desktop-stat-label">Practice Time</span>
                <span className="home-desktop-stat-val">{totalMinutes} min</span>
              </div>
            </div>
          </motion.div>

          {/* Main Action Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="home-action-card"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                letterSpacing: '0.05em', 
                textTransform: 'uppercase', 
                color: 'var(--grove-moss)',
                fontFamily: 'var(--font-display)' 
              }}>
                Daily Speech Routine
              </span>
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--ink-secondary)', lineHeight: 1.45, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                "Speaking is a physical habit. A few minutes of deliberate speech each day builds lasting clarity."
              </p>
            </div>

            <Button 
              variant="primary" 
              size="large"
              leadingIcon={<Mic size={21} />}
              style={{ 
                width: '100%', 
                fontSize: '20px', 
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
                height: '64px',
                color: '#ffffff',
                borderRadius: '20px', 
                fontWeight: 600,
                boxShadow: '0 10px 28px rgba(31, 122, 108, 0.28)'
              }}
              onClick={() => openPracticeSheet()}
            >
              Start Practice
            </Button>
          </motion.div>

        </div>

      </div>
    </Layout>
  );
}