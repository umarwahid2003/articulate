import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Sparkles, 
  ArrowRight, 
  Target, 
  BarChart2, 
  Compass, 
  Clock, 
  Briefcase, 
  GraduationCap, 
  MessageSquare, 
  Building2, 
  Globe, 
  Cpu, 
  Rocket, 
  Dna, 
  Coffee, 
  Film 
} from 'lucide-react';
import { UserContext } from '../types/user';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
  { minutes: 2, label: '2 Minutes / day', badge: 'Micro-Habit', desc: 'Quick & consistent — Build the daily speaking reflex' },
  { minutes: 5, label: '5 Minutes / day', badge: 'Recommended', desc: 'The sweet spot for steady fluency & active vocabulary' },
  { minutes: 10, label: '10 Minutes / day', badge: 'Dedicated', desc: 'Accelerate your confidence and articulation' },
  { minutes: 15, label: '15 Minutes / day', badge: 'Intensive', desc: 'Fast-track for interview & presentation readiness' },
];

export const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  const [selectedGoal, setSelectedGoal] = useState(GOALS[0].label);
  const [selectedLevel, setSelectedLevel] = useState(LEVELS[1].label);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Tech & AI', 'Business & Startups']);
  const [selectedTimeGoal, setSelectedTimeGoal] = useState<number>(5);

  const toggleInterest = (topicLabel: string) => {
    if (selectedInterests.includes(topicLabel)) {
      if (selectedInterests.length > 1) {
        setSelectedInterests(selectedInterests.filter(t => t !== topicLabel));
      }
    } else {
      setSelectedInterests([...selectedInterests, topicLabel]);
    }
  };

  const handleFinish = async () => {
    const context: UserContext = {
      goal: selectedGoal,
      level: selectedLevel,
      interests: selectedInterests,
      dailyGoalMinutes: selectedTimeGoal,
      completedAt: new Date().toISOString()
    };

    // Save to localStorage for instant client access
    localStorage.setItem('grove_user_context', JSON.stringify(context));

    // Also persist in Supabase if user is logged in
    if (user) {
      try {
        await supabase.from('profiles').update({
          goal: selectedGoal,
          level: selectedLevel,
          interests: selectedInterests
        }).eq('id', user.id);
      } catch (err) {
        console.warn("Could not save to Supabase profile:", err);
      }
    }

    navigate('/', { replace: true });
  };

  return (
    <Layout className="onboarding-page" style={{ padding: '24px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* Top Header & Progress Indicator */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s} 
                style={{ 
                  width: '28px', 
                  height: '6px', 
                  borderRadius: '3px', 
                  backgroundColor: step >= s ? 'var(--grove-moss)' : 'var(--surface-sunken)',
                  transition: 'background-color 0.3s ease'
                }} 
              />
            ))}
          </div>
          <span style={{ fontSize: '13px', color: 'var(--ink-secondary)', fontWeight: 600 }}>
            Step {step} of 4
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--grove-moss)', marginBottom: '8px' }}>
                <Target size={18} />
                <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Personalized Goal
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--ink-base)', margin: '0 0 8px' }}>
                What is your main speaking goal?
              </h1>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '15px', margin: '0 0 24px' }}>
                Articulate will tailor its conversations and coach feedback to this goal.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {GOALS.map((goal) => {
                  const Icon = goal.icon;
                  const isSelected = selectedGoal === goal.label;
                  return (
                    <div
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal.label)}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        backgroundColor: isSelected ? 'rgba(31, 122, 108, 0.08)' : 'var(--surface-raised)',
                        border: isSelected ? '2px solid var(--grove-moss)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 20, 
                          backgroundColor: isSelected ? 'var(--grove-moss-tint)' : 'var(--surface-sunken)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <Icon size={20} color={isSelected ? 'var(--grove-moss)' : 'var(--ink-secondary)'} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--ink-base)' }}>{goal.label}</div>
                          <div style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '2px' }}>{goal.desc}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--grove-moss)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={14} color="#ffffff" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--grove-moss)', marginBottom: '8px' }}>
                <BarChart2 size={18} />
                <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current Level
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--ink-base)', margin: '0 0 8px' }}>
                How do you rate your speaking?
              </h1>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '15px', margin: '0 0 24px' }}>
                This helps the AI set the right speaking tempo and vocabulary depth.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {LEVELS.map((level) => {
                  const isSelected = selectedLevel === level.label;
                  return (
                    <div
                      key={level.id}
                      onClick={() => setSelectedLevel(level.label)}
                      style={{
                        padding: '18px',
                        borderRadius: '16px',
                        backgroundColor: isSelected ? 'rgba(31, 122, 108, 0.08)' : 'var(--surface-raised)',
                        border: isSelected ? '2px solid var(--grove-moss)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '17px', color: 'var(--ink-base)' }}>{level.label}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', backgroundColor: 'var(--surface-sunken)', color: 'var(--grove-moss)' }}>
                            {level.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' }}>{level.desc}</div>
                      </div>
                      {isSelected && (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--grove-moss)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={14} color="#ffffff" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--grove-moss)', marginBottom: '8px' }}>
                <Compass size={18} />
                <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your Interests
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--ink-base)', margin: '0 0 8px' }}>
                What do you love discussing?
              </h1>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '15px', margin: '0 0 24px' }}>
                Pick 2 or more topics you find fun or relevant to talk about.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {TOPICS.map((topic) => {
                  const Icon = topic.icon;
                  const isSelected = selectedInterests.includes(topic.label);
                  return (
                    <div
                      key={topic.id}
                      onClick={() => toggleInterest(topic.label)}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        backgroundColor: isSelected ? 'rgba(31, 122, 108, 0.08)' : 'var(--surface-raised)',
                        border: isSelected ? '2px solid var(--grove-moss)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: 18, 
                          backgroundColor: isSelected ? 'var(--grove-moss-tint)' : 'var(--surface-sunken)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <Icon size={18} color={isSelected ? 'var(--grove-moss)' : 'var(--ink-secondary)'} />
                        </div>
                        {isSelected && (
                          <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: 'var(--grove-moss)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={12} color="#ffffff" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink-base)' }}>{topic.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--grove-moss)', marginBottom: '8px' }}>
                <Clock size={18} />
                <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Daily Goal
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--ink-base)', margin: '0 0 8px' }}>
                Daily practice goal in minutes?
              </h1>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '15px', margin: '0 0 24px' }}>
                Set your ideal daily commitment to build confidence and maintain your streak.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {TIME_GOALS.map((t) => {
                  const isSelected = selectedTimeGoal === t.minutes;
                  return (
                    <div
                      key={t.minutes}
                      onClick={() => setSelectedTimeGoal(t.minutes)}
                      style={{
                        padding: '16px 18px',
                        borderRadius: '16px',
                        backgroundColor: isSelected ? 'rgba(31, 122, 108, 0.08)' : 'var(--surface-raised)',
                        border: isSelected ? '2px solid var(--grove-moss)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '16px', color: isSelected ? 'var(--grove-moss)' : 'var(--ink-base)' }}>
                            {t.label}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', backgroundColor: 'var(--surface-sunken)', color: 'var(--grove-moss)' }}>
                            {t.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                          {t.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--grove-moss)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={14} color="#ffffff" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Button Container */}
      <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {step < 4 ? (
          <Button 
            size="large" 
            variant="primary"
            onClick={() => setStep(step + 1)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span>Continue</span>
            <ArrowRight size={18} />
          </Button>
        ) : (
          <Button 
            size="large" 
            variant="primary"
            onClick={handleFinish}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Sparkles size={18} />
            <span>Complete Setup & Start Speaking</span>
          </Button>
        )}

        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-secondary)',
              fontSize: '15px',
              fontWeight: 500,
              padding: '8px',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        )}
      </div>

    </Layout>
  );
};
