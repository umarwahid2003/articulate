import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { ProgressRing } from '../components/ProgressRing';
import { Mascot } from '../components/Mascot';
import { Card } from '../components/Card';
import { SessionRecord } from './Practice';
import { UserContext } from '../types/user';
import { Check, X, Lightbulb, MessageSquare, ChevronRight, Target, Flame, Trophy, Zap, Mic, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Progress = () => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);

  useEffect(() => {
    try {
      const historyRaw = localStorage.getItem('grove_session_history');
      if (historyRaw) {
        setSessions(JSON.parse(historyRaw));
      }
    } catch (e) {
      console.error("Error reading sessions:", e);
    }

    try {
      const contextRaw = localStorage.getItem('grove_user_context');
      if (contextRaw) {
        setUserContext(JSON.parse(contextRaw));
      }
    } catch (e) {
      console.error("Error reading context:", e);
    }
  }, []);

  // Daily Practice Time vs Goal Calculation
  const dailyGoalMinutes = userContext?.dailyGoalMinutes || 5;
  const todayDateString = new Date().toDateString();
  const todaySessions = sessions.filter(
    s => new Date(s.timestamp).toDateString() === todayDateString
  );

  // Total seconds practiced today
  const todaySeconds = todaySessions.reduce((sum, s) => sum + (s.durationSeconds || 60), 0);
  const todayMinutes = Math.round((todaySeconds / 60) * 10) / 10;
  
  // Calculate percentage toward daily goal
  const dailyProgressPercent = Math.min(100, Math.round((todaySeconds / (dailyGoalMinutes * 60)) * 100));

  // Unique practiced days count
  const uniquePracticedDays = new Set(
    sessions.map(s => new Date(s.timestamp).toDateString())
  ).size;

  // Active consecutive streak calculation
  const calculateStreak = () => {
    if (sessions.length === 0) return 0;
    const sortedDays = Array.from(new Set(
      sessions.map(s => {
        const d = new Date(s.timestamp);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    )).sort((a, b) => b - a);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const yesterdayTime = todayTime - 86400000;

    let streak = 0;
    let expectedTime = sortedDays[0] === todayTime ? todayTime : sortedDays[0] === yesterdayTime ? yesterdayTime : null;

    if (expectedTime === null) {
      return 0;
    }

    for (let dayTime of sortedDays) {
      if (dayTime === expectedTime) {
        streak++;
        expectedTime -= 86400000;
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return "Just now";
    }
  };

  const isDailyGoalUnlocked = dailyProgressPercent >= 100;
  const isWeeklyStreakUnlocked = currentStreak >= 7 || uniquePracticedDays >= 7;
  const isMonthlyStreakUnlocked = currentStreak >= 30 || uniquePracticedDays >= 30;

  const achievements = [
    {
      id: 1,
      title: 'Daily Goal',
      icon: Target,
      unlocked: isDailyGoalUnlocked,
      task: `Reach ${dailyGoalMinutes}m goal`,
      reward: isDailyGoalUnlocked ? 'Unlocked' : `${todayMinutes}/${dailyGoalMinutes}m`
    },
    {
      id: 2,
      title: 'Weekly Streak',
      icon: Flame,
      unlocked: isWeeklyStreakUnlocked,
      task: 'Practice 7 days',
      reward: isWeeklyStreakUnlocked ? 'Unlocked' : `${Math.min(7, Math.max(currentStreak, uniquePracticedDays))}/7 Days`
    },
    {
      id: 3,
      title: 'Monthly Streak',
      icon: Trophy,
      unlocked: isMonthlyStreakUnlocked,
      task: 'Practice 30 days',
      reward: isMonthlyStreakUnlocked ? 'Unlocked' : `${Math.min(30, Math.max(currentStreak, uniquePracticedDays))}/30 Days`
    }
  ];

  return (
    <Layout className="page-with-bottom-nav">
      <NavigationBar />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '80px', marginTop: '16px' }}>
        
        {/* Top Daily Practice Time vs Goal Card */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between', alignItems: 'center', padding: '24px', backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
              {dailyProgressPercent >= 100 
                ? "Daily Goal Met!" 
                : `${todayMinutes} / ${dailyGoalMinutes} mins`}
            </h2>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '15px', lineHeight: 1.4 }}>
              {dailyProgressPercent >= 100 
                ? `You reached your ${dailyGoalMinutes} min daily speaking goal today!`
                : dailyProgressPercent > 0 
                ? `${Math.max(0, Math.round((dailyGoalMinutes - todayMinutes) * 10) / 10)} mins remaining to hit today's goal.`
                : `Complete a session today toward your ${dailyGoalMinutes} min daily goal.`}
            </p>
            <Mascot state="celebrating" size={100} style={{ marginTop: '16px' }} />
          </div>
          <ProgressRing progress={dailyProgressPercent} size="large">
            {dailyProgressPercent}%
          </ProgressRing>
        </div>

        {/* 3 Core Achievements with Theme-Matched Icons */}
        <div>
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-display)', marginBottom: '16px', marginTop: '16px' }}>
            Achievements
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {achievements.map((ach) => {
              const Icon = ach.icon;
              return (
                <div 
                  key={ach.id} 
                  style={{ 
                    padding: '16px 8px', 
                    backgroundColor: 'var(--surface-raised)', 
                    borderRadius: 'var(--radius-md)', 
                    textAlign: 'center',
                    border: ach.unlocked ? '1.5px solid var(--grove-moss)' : '1px solid var(--border-subtle)',
                    opacity: ach.unlocked ? 1 : 0.7,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '140px',
                    boxShadow: ach.unlocked ? '0 4px 12px rgba(31, 122, 108, 0.1)' : 'none'
                  }}
                >
                  <div style={{ 
                    width: 46, 
                    height: 46, 
                    borderRadius: 23, 
                    backgroundColor: ach.unlocked ? 'var(--grove-moss-tint)' : 'var(--surface-sunken)', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <Icon size={22} color={ach.unlocked ? 'var(--grove-moss)' : 'var(--ink-secondary)'} strokeWidth={ach.unlocked ? 2 : 1.5} />
                    {ach.unlocked && (
                      <div style={{ 
                        position: 'absolute', 
                        bottom: -2, 
                        right: -2, 
                        backgroundColor: 'var(--grove-moss)', 
                        borderRadius: '50%', 
                        width: 16, 
                        height: 16, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Check size={10} color="#ffffff" strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-base)', marginTop: '8px' }}>
                      {ach.title}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: ach.unlocked ? 'var(--grove-moss)' : 'var(--ink-secondary)', 
                      fontWeight: ach.unlocked ? 600 : 400,
                      marginTop: '4px',
                      lineHeight: 1.2
                    }}>
                      {ach.unlocked ? ach.reward : ach.task}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Session History */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '16px' }}>
            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-display)', margin: 0 }}>
              Session History
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
              Tap any session to review feedback
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.length > 0 ? (
              sessions.slice(0, 15).map((session) => (
                <Card 
                  key={session.id}
                  size="compact"
                  title={session.topic}
                  subtitle={formatTime(session.timestamp)}
                  trailingMetadata={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--grove-moss)' }}>{session.score}/100</span>
                      <ChevronRight size={16} color="var(--ink-secondary)" />
                    </div>
                  }
                  interactive
                  onClick={() => setSelectedSession(session)}
                />
              ))
            ) : (
              <Card 
                size="compact"
                title="First Speaking Session"
                subtitle="Complete your practice to unlock achievements!"
                trailingMetadata="0/100"
              />
            )}
          </div>
        </div>
      </div>

      {/* Historical Session Review Modal / Bottom Sheet */}
      <AnimatePresence>
        {selectedSession && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSession(null)}
              style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 300
              }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                backgroundColor: 'var(--surface-base)',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px 20px 84px',
                zIndex: 301,
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Session Review • {formatTime(selectedSession.timestamp)}
                  </div>
                  <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-display)', color: 'var(--ink-base)', margin: '4px 0 0' }}>
                    {selectedSession.topic}
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ backgroundColor: 'rgba(31, 122, 108, 0.12)', color: 'var(--grove-moss)', fontWeight: 800, fontSize: '14px', padding: '4px 12px', borderRadius: '100px' }}>
                    {selectedSession.score}/100
                  </div>
                  <button 
                    onClick={() => setSelectedSession(null)} 
                    style={{ background: 'none', border: 'none', color: 'var(--ink-secondary)', cursor: 'pointer', padding: '4px' }}
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Spoken Transcript */}
              {selectedSession.transcription && (
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '12px 14px', borderRadius: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageSquare size={12} />
                    <span>What You Spoke</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-base)', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{selectedSession.transcription}"
                  </p>
                </div>
              )}

              {/* Sub-Scores Pill Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Fluency</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>
                    {selectedSession.scores?.fluency || 7}/10
                  </strong>
                </div>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Grammar</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>
                    {selectedSession.scores?.grammar || 7}/10
                  </strong>
                </div>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Vocab</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>
                    {selectedSession.scores?.vocabulary || 8}/10
                  </strong>
                </div>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Confidence</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>
                    {selectedSession.scores?.confidence || 8}/10
                  </strong>
                </div>
              </div>

              {/* Speaking Pace & Filler Word Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: 'rgba(31, 122, 108, 0.08)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(31, 122, 108, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={16} color="var(--grove-moss)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', fontWeight: 500 }}>Speaking Pace</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-base)' }}>
                      {selectedSession.wpm || 130} WPM <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--grove-moss)' }}>({selectedSession.pacingNote || 'Optimal'})</span>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mic size={16} color="var(--ink-secondary)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', fontWeight: 500 }}>Filler Words</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-base)' }}>
                      {selectedSession.fillerWords?.length ? `${selectedSession.fillerWords.length} detected` : '0 Clean flow'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coach Conversational Reply & Follow-Up */}
              {selectedSession.reply && (
                <div style={{ backgroundColor: 'var(--surface-raised)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--border-subtle)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <MessageCircle size={18} color="var(--grove-moss)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', marginBottom: '2px' }}>Coach Response & Follow-up</div>
                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink-base)', lineHeight: 1.45 }}>
                      {selectedSession.reply}
                    </p>
                  </div>
                </div>
              )}

              {/* Assessment Feedback */}
              <div style={{ backgroundColor: 'var(--surface-raised)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-base)', lineHeight: 1.45 }}>
                  {selectedSession.feedback || "Good practice session! Continue practicing regularly to strengthen your fluency, natural pauses, and vocabulary."}
                </p>
              </div>

              {/* Concrete Specific Corrections & Upgrades */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lightbulb size={14} />
                  <span>Specific Corrections & Upgrades</span>
                </div>
                
                {(selectedSession.corrections && selectedSession.corrections.length > 0 
                  ? selectedSession.corrections 
                  : [
                      {
                        original: selectedSession.transcription ? (selectedSession.transcription.length > 35 ? selectedSession.transcription.slice(0, 35) + '...' : selectedSession.transcription) : "Speaking practice phrase",
                        better: "Focus on connecting clauses with transitions like 'furthermore', 'currently', or 'specifically'.",
                        reason: "Improves sentence cohesion and demonstrates higher conversational fluency."
                      }
                    ]
                ).map((c, i) => (
                  <div key={i} style={{ backgroundColor: 'var(--surface-sunken)', padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }}>
                    <div style={{ color: '#E53E3E', textDecoration: 'line-through', fontWeight: 500 }}>
                      "{c.original}"
                    </div>
                    <div style={{ color: 'var(--grove-moss)', fontWeight: 600, marginTop: '2px' }}>
                      {c.better}
                    </div>
                    {c.reason && (
                      <div style={{ color: 'var(--ink-secondary)', fontSize: '12px', marginTop: '3px', lineHeight: 1.35 }}>
                        {c.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedSession(null)}
                style={{
                  backgroundColor: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--ink-base)',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Close Review
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
};
