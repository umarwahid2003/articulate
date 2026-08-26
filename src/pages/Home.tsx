import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { Mascot } from '../components/Mascot';
import { Button } from '../components/Button';
import { Mic, Check } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SessionRecord } from './Practice';

export function Home() {
  const { openPracticeSheet } = useOutletContext<{ openPracticeSheet: () => void }>();
  const { profile, user } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

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

  // Calculate real week days status (Monday to Sunday)
  const calculateWeekDays = () => {
    const now = new Date();
    // Monday = 0, Tuesday = 1, ... Sunday = 6
    const currentDayIndex = (now.getDay() + 6) % 7;
    
    // Find Monday of the current week at 00:00:00
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayIndex);
    monday.setHours(0, 0, 0, 0);

    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    
    return dayLabels.map((label, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index);
      const targetDateString = targetDate.toDateString();

      // Check if user practiced on this exact day
      const hasPracticed = sessions.some(
        s => new Date(s.timestamp).toDateString() === targetDateString
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
  };

  const weekDays = calculateWeekDays();

  const getGreeting = () => {
    let name = profile?.first_name;
    if (!name && user?.user_metadata) {
      const fullName = user.user_metadata.full_name || user.user_metadata.name;
      if (fullName) {
        name = fullName.split(' ')[0];
      }
    }
    name = name || 'There';

    return { name };
  };

  const greeting = getGreeting();

  return (
    <Layout className="page-with-bottom-nav">
      <NavigationBar />
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingBottom: '140px', marginTop: '16px' }}>
        
        {/* Mascot Hero */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          marginTop: '16px'
        }}>
          <Mascot state="standing" size={185} />
        </div>

        {/* Header Greeting */}
        <div style={{ textAlign: 'center', marginTop: '48px', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontFamily: 'var(--font-display)', 
            color: 'var(--ink-base)',
            margin: 0
          }}>
            Hello, <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: 'var(--grove-moss)', fontSize: '36px' }}>{greeting.name}</span>
          </h1>
        </div>

        {/* Main Action Button with perfectly aligned mic icon */}
        <div style={{ marginBottom: '32px' }}>
          <Button 
            variant="primary" 
            style={{ 
              width: '100%', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              height: '64px',
              color: '#ffffff',
              borderRadius: '20px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 28px rgba(31, 122, 108, 0.28)'
            }}
            onClick={() => openPracticeSheet()}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', transform: 'translate(-2px, 1.5px)' }}>
              <Mic size={21} />
            </span>
            <span style={{ transform: 'translateY(-0.5px)' }}>Start Practice</span>
          </Button>
        </div>

        {/* Weekly Habit Tracker with matching border and shadow */}
        <div style={{ 
          backgroundColor: 'var(--surface-raised)', 
          borderRadius: '24px', 
          padding: '22px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.08)'
        }}>
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
                    transition: 'all 0.2s ease'
                  }}
                  title={isFilled ? `Practiced on ${day.label}` : isCurrentDay ? 'Practice today!' : day.label}
                >
                  {isFilled ? <Check size={16} strokeWidth={3} /> : day.label}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </Layout>
  );
}