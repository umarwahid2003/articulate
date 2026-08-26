import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { Button } from '../components/Button';
import { UserContext } from '../types/user';
import { getUserContext } from '../lib/ai';
import { 
  Check, 
  Sparkles, 
  Briefcase, 
  GraduationCap, 
  MessageSquare, 
  Building2, 
  Globe, 
  Cpu, 
  Rocket, 
  Dna, 
  Compass, 
  Coffee, 
  Film 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

const GOALS = [
  { id: 'interview', label: 'Job Interviews & Career', icon: Briefcase, desc: 'Ace behavioral & technical interviews' },
  { id: 'ielts', label: 'IELTS / TOEFL & Exams', icon: GraduationCap, desc: 'Score high on speaking test criteria' },
  { id: 'casual', label: 'Daily Casual & Socializing', icon: MessageSquare, desc: 'Speak naturally without second-guessing' },
  { id: 'business', label: 'Meetings & Presentations', icon: Building2, desc: 'Sound articulate and professional' },
  { id: 'travel', label: 'Travel & Living Abroad', icon: Globe, desc: 'Confidently navigate everyday situations' }
];

const LEVELS = [
  { id: 'beginner', label: 'Beginner', badge: 'A2-B1', desc: 'I can make basic sentences but hesitate often' },
  { id: 'intermediate', label: 'Intermediate', badge: 'B1-B2', desc: 'I can converse but struggle with vocabulary & fluidity' },
  { id: 'advanced', label: 'Advanced', badge: 'C1-C2', desc: 'I speak well, looking for native nuance & perfection' }
];

const TOPICS = [
  { id: 'tech', label: 'Tech & AI', icon: Cpu },
  { id: 'startups', label: 'Business & Startups', icon: Rocket },
  { id: 'science', label: 'Science & Nature', icon: Dna },
  { id: 'travel', label: 'Travel & Culture', icon: Compass },
  { id: 'lifestyle', label: 'Daily Life & Wellness', icon: Coffee },
  { id: 'entertainment', label: 'Movies & Music', icon: Film },
];

const TIME_GOALS = [
  { minutes: 2, label: '2 Minutes / day', badge: 'Micro-Habit', desc: 'Quick & consistent' },
  { minutes: 5, label: '5 Minutes / day', badge: 'Recommended', desc: 'Steady daily fluency' },
  { minutes: 10, label: '10 Minutes / day', badge: 'Dedicated', desc: 'Accelerate confidence' },
  { minutes: 15, label: '15 Minutes / day', badge: 'Intensive', desc: 'Fast-track readiness' },
];

export const CoachContext = () => {
  const { user } = useAuth();
  const [initialContext, setInitialContext] = useState<UserContext | null>(null);

  const [selectedGoal, setSelectedGoal] = useState<string>(GOALS[0].label);
  const [selectedLevel, setSelectedLevel] = useState<string>(LEVELS[1].label);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Tech & AI', 'Business & Startups']);
  const [selectedTimeGoal, setSelectedTimeGoal] = useState<number>(5);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const ctx = getUserContext();
    if (ctx) {
      if (ctx.goal) setSelectedGoal(ctx.goal);
      if (ctx.level) setSelectedLevel(ctx.level);
      if (ctx.interests && Array.isArray(ctx.interests)) setSelectedInterests(ctx.interests);
      if (ctx.dailyGoalMinutes) setSelectedTimeGoal(ctx.dailyGoalMinutes);
      setInitialContext(ctx);
    }
  }, []);

  const isDirty = Boolean(
    initialContext && (
      selectedGoal !== initialContext.goal ||
      selectedLevel !== initialContext.level ||
      selectedTimeGoal !== (initialContext.dailyGoalMinutes || 5) ||
      JSON.stringify([...selectedInterests].sort()) !== JSON.stringify([...(initialContext.interests || [])].sort())
    )
  );

  const toggleInterest = (topicLabel: string) => {
    if (selectedInterests.includes(topicLabel)) {
      if (selectedInterests.length > 1) {
        setSelectedInterests(selectedInterests.filter(t => t !== topicLabel));
      }
    } else {
      setSelectedInterests([...selectedInterests, topicLabel]);
    }
  };

  const handleSaveContext = async () => {
    const updated: UserContext = {
      goal: selectedGoal,
      level: selectedLevel,
      interests: selectedInterests,
      dailyGoalMinutes: selectedTimeGoal,
      completedAt: new Date().toISOString()
    };

    localStorage.setItem('grove_user_context', JSON.stringify(updated));
    setInitialContext(updated);

    if (user) {
      try {
        await supabase.from('profiles').update({
          goal: selectedGoal,
          level: selectedLevel,
          interests: selectedInterests
        }).eq('id', user.id);
      } catch (err) {
        console.warn("Could not sync to Supabase:", err);
      }
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <Layout className="page-with-bottom-nav">
      <NavigationBar />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '120px', marginTop: '12px' }}>
        
        {/* Transparency Context Summary */}
        <div style={{ 
          backgroundColor: 'var(--surface-raised)', 
          borderRadius: '24px', 
          padding: '20px', 
          border: '1px solid rgba(255, 255, 255, 0.08)', 
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.08)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '18px', backgroundColor: 'rgba(31, 122, 108, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="var(--grove-moss)" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
                Your Speaking Context
              </h3>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-secondary)', lineHeight: 1.45 }}>
            Grove AI uses these preferences to suggest personalized topics and calibrate your speaking sessions.
          </p>
        </div>

        {/* 1. Main Speaking Goal */}
        <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
              1. Speaking Goal
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--grove-moss)', fontWeight: 600 }}>Active</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {GOALS.map((goal) => {
              const Icon = goal.icon;
              const isSelected = selectedGoal === goal.label;
              return (
                <div
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.label)}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    backgroundColor: isSelected ? 'rgba(31, 122, 108, 0.12)' : 'var(--surface-sunken)',
                    border: isSelected ? '1.5px solid var(--grove-moss)' : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: 18, 
                      backgroundColor: isSelected ? 'var(--grove-moss-tint)' : 'var(--surface-base)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Icon size={18} color={isSelected ? 'var(--grove-moss)' : 'var(--ink-secondary)'} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--grove-moss)' : 'var(--ink-base)' }}>
                        {goal.label}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                        {goal.desc}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check size={16} color="var(--grove-moss)" strokeWidth={3} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Proficiency Level */}
        <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
              2. Current Level
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--grove-moss)', fontWeight: 600 }}>Tuning</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {LEVELS.map((level) => {
              const isSelected = selectedLevel === level.label;
              return (
                <div
                  key={level.id}
                  onClick={() => setSelectedLevel(level.label)}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    backgroundColor: isSelected ? 'rgba(31, 122, 108, 0.12)' : 'var(--surface-sunken)',
                    border: isSelected ? '1.5px solid var(--grove-moss)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--grove-moss)' : 'var(--ink-base)' }}>
                        {level.label}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', backgroundColor: 'var(--surface-base)', color: 'var(--grove-moss)' }}>
                        {level.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                      {level.desc}
                    </div>
                  </div>
                  {isSelected && <Check size={16} color="var(--grove-moss)" strokeWidth={3} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Topics & Interests */}
        <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
              3. Topics of Interest
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
              {selectedInterests.length} selected
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {TOPICS.map((topic) => {
              const Icon = topic.icon;
              const isSelected = selectedInterests.includes(topic.label);
              return (
                <div
                  key={topic.id}
                  onClick={() => toggleInterest(topic.label)}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    backgroundColor: isSelected ? 'rgba(31, 122, 108, 0.12)' : 'var(--surface-sunken)',
                    border: isSelected ? '1.5px solid var(--grove-moss)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: 16, 
                      backgroundColor: isSelected ? 'var(--grove-moss-tint)' : 'var(--surface-base)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Icon size={16} color={isSelected ? 'var(--grove-moss)' : 'var(--ink-secondary)'} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--grove-moss)' : 'var(--ink-base)' }}>
                      {topic.label}
                    </span>
                  </div>
                  {isSelected && <Check size={14} color="var(--grove-moss)" strokeWidth={3} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Daily Practice Goal (Minutes) */}
        <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
              4. Daily Goal in Minutes
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--grove-moss)', fontWeight: 600 }}>{selectedTimeGoal} min/day</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {TIME_GOALS.map((t) => {
              const isSelected = selectedTimeGoal === t.minutes;
              return (
                <div
                  key={t.minutes}
                  onClick={() => setSelectedTimeGoal(t.minutes)}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    backgroundColor: isSelected ? 'rgba(31, 122, 108, 0.12)' : 'var(--surface-sunken)',
                    border: isSelected ? '1.5px solid var(--grove-moss)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '75px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? 'var(--grove-moss)' : 'var(--ink-base)' }}>
                      {t.minutes} min
                    </span>
                    {isSelected && <Check size={14} color="var(--grove-moss)" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                    {t.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Glowing Save Button */}
        <motion.div
          animate={isDirty ? {
            scale: [1, 1.025, 1],
            boxShadow: [
              '0 0 15px rgba(44, 181, 159, 0.45)',
              '0 0 35px rgba(44, 181, 159, 0.9)',
              '0 0 15px rgba(44, 181, 159, 0.45)'
            ]
          } : { scale: 1, boxShadow: '0 8px 24px rgba(31, 122, 108, 0.25)' }}
          transition={isDirty ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { duration: 0.2 }}
          style={{ borderRadius: '18px' }}
        >
          <Button
            variant="primary"
            onClick={handleSaveContext}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: '18px',
              fontSize: '16px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: isDirty 
                ? 'linear-gradient(135deg, #1F7A6C 0%, #2AB69F 50%, #4FB8AC 100%)' 
                : 'var(--grove-moss)',
              color: '#ffffff',
              border: isDirty ? '1.5px solid rgba(255, 255, 255, 0.6)' : 'none',
              transition: 'background 0.3s ease, border 0.3s ease'
            }}
          >
            {savedSuccess ? (
              <span>Context Saved!</span>
            ) : (
              <span>Save Context</span>
            )}
          </Button>
        </motion.div>

      </div>
    </Layout>
  );
};
