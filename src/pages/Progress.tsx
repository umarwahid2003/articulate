import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { ProgressRing } from '../components/ProgressRing';
import { Card } from '../components/Card';
import { SessionRecord } from './Practice';
import { UserContext } from '../types/user';
import { calculateStreak, getUniquePracticedDays, toLocalDateString } from '../lib/streak';
import { Check, X, Lightbulb, MessageSquare, ChevronRight, Target, Flame, Trophy, Zap, Mic, MessageCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Progress = () => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);

  useEffect(() => {
    const loadData = () => {
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
    };

    loadData();
    window.addEventListener('storage', loadData);
    window.addEventListener('grove_session_updated', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
      window.removeEventListener('grove_session_updated', loadData);
    };
  }, []);

  // Daily Practice Time vs Goal Calculation
  const dailyGoalMinutes = userContext?.dailyGoalMinutes || 5;

  const { todaySessions, todaySeconds, todayMinutes, dailyProgressPercent } = useMemo(() => {
    const todayDateKey = toLocalDateString(new Date());
    const matchedSessions = sessions.filter(
      s => toLocalDateString(s.timestamp) === todayDateKey
    );
    const seconds = matchedSessions.reduce((sum, s) => sum + (s.durationSeconds || 60), 0);
    const minutes = Math.round((seconds / 60) * 10) / 10;
    const percent = Math.min(100, Math.round((seconds / (dailyGoalMinutes * 60)) * 100));
    return {
      todaySessions: matchedSessions,
      todaySeconds: seconds,
      todayMinutes: minutes,
      dailyProgressPercent: percent
    };
  }, [sessions, dailyGoalMinutes]);

  // Unique practiced days count & active consecutive streak
  const uniquePracticedDays = useMemo(() => getUniquePracticedDays(sessions), [sessions]);
  const currentStreak = useMemo(() => calculateStreak(sessions), [sessions]);

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

  const achievements = useMemo(() => {
    const isDailyGoalUnlocked = dailyProgressPercent >= 100;
    const isWeeklyStreakUnlocked = currentStreak >= 7 || uniquePracticedDays >= 7;
    const isMonthlyStreakUnlocked = currentStreak >= 30 || uniquePracticedDays >= 30;

    return [
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
  }, [dailyProgressPercent, currentStreak, uniquePracticedDays, dailyGoalMinutes, todayMinutes]);

  return (
    <Layout className="page-with-bottom-nav">
      <NavigationBar />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '80px', marginTop: '16px' }}>
        
        {/* Top Feature Card: Daily Goal & Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
          style={{
            backgroundColor: 'var(--surface-raised)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ flex: 1, paddingRight: '16px' }}>
            <span style={{ 
              fontSize: '11px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em', 
              color: 'var(--grove-moss)', 
              fontWeight: 800,
              display: 'inline-block',
              marginBottom: '6px'
            }}>
              Today's Practice
            </span>
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
          </div>
          <ProgressRing progress={dailyProgressPercent} size="large">
            {dailyProgressPercent}%
          </ProgressRing>
        </motion.div>

        {/* 3 Core Achievements with Theme-Matched Icons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-display)', marginBottom: '16px', marginTop: '16px' }}>
            Achievements
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {achievements.map((ach) => {
              const Icon = ach.icon;
              return (
                <motion.div 
                  key={ach.id} 
                  whileHover={{ scale: 1.02 }} 
                  transition={{ duration: 0.15 }}
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
                    boxShadow: ach.unlocked ? '0 4px 12px rgba(31, 122, 108, 0.1)' : 'none',
                    position: 'relative'
                  }}
                >
                  {!ach.unlocked && (
                    <div style={{ position: 'absolute', top: 8, right: 8, opacity: 0.3 }}>
                      <Lock size={14} color="var(--ink-tertiary)" />
                    </div>
                  )}
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
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Interactive Session History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--surface-sunken)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${session.score}%`, height: '100%', backgroundColor: 'var(--grove-moss)', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--grove-moss)', fontSize: '14px' }}>{session.score}</span>
                      <ChevronRight size={16} color="var(--ink-secondary)" />
                    </div>
                  }
                  interactive
                  onClick={() => setSelectedSession(session)}
                />
              ))
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 24px', 
                backgroundColor: 'var(--surface-raised)', 
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-hairline)'
              }}>
                <Mic size={32} color="var(--ink-tertiary)" style={{ marginBottom: '12px' }} />
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '4px' }}>No sessions yet</div>
                <div style={{ fontSize: '14px', color: 'var(--ink-secondary)' }}>Complete your first practice to see your progress here!</div>
              </div>
            )}
          </div>
        </motion.div>
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
              <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--border-hairline)', borderRadius: '2px', margin: '0 auto 12px' }} />
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

              {/* Key Takeaways in Points */}
              {(() => {
                const session = selectedSession as any;
                const points: string[] = session?.keyPoints && Array.isArray(session.keyPoints) && session.keyPoints.length > 0
                  ? session.keyPoints
                  : (session?.feedback
                      ? session.feedback.split(/(?<=[.!?])\s+/).map((s: string) => s.trim()).filter((s: string) => s.length > 4)
                      : ["Solid practice session with clear communicative flow.", "Focus on preposition accuracy and seamless clause connection."]);

                return (
                  <div style={{ backgroundColor: 'var(--surface-raised)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Key Takeaways
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {points.map((pt: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '3px', backgroundColor: 'var(--grove-moss)', marginTop: '6px', flexShrink: 0 }} />
                          <span style={{ fontSize: '13.5px', color: 'var(--ink-base)', lineHeight: 1.45 }}>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Next Question / Follow-Up */}
              {(selectedSession.followUpQuestion || selectedSession.reply) && (
                <div style={{ backgroundColor: 'rgba(31, 122, 108, 0.08)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(31, 122, 108, 0.2)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <MessageCircle size={16} color="var(--grove-moss)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', marginBottom: '2px' }}>Next Question to Practice</div>
                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink-base)', lineHeight: 1.45 }}>
                      {selectedSession.followUpQuestion || selectedSession.reply}
                    </p>
                  </div>
                </div>
              )}

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
