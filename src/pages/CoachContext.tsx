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
  Film,
  Code,
  TrendingUp,
  Palette,
  Stethoscope,
  Scale,
  BookOpen,
  Zap,
  ListOrdered,
  Languages,
  Crown,
  Volume2,
  Users,
  Flame,
  GitFork,
  HeartHandshake,
  Lightbulb,
  Hash
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import './CoachContext.css';

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

const PROFESSIONS = [
  { id: 'tech', label: 'Tech & Software Engineering', icon: Code, desc: 'Systems, architecture, coding & product' },
  { id: 'business', label: 'Business, Finance & Consulting', icon: TrendingUp, desc: 'Strategy, analysis, operations & leadership' },
  { id: 'creative', label: 'Design, Marketing & Media', icon: Palette, desc: 'UX/UI, storytelling, branding & copy' },
  { id: 'healthcare', label: 'Science, Healthcare & Biotech', icon: Stethoscope, desc: 'Clinical care, lab research & discovery' },
  { id: 'law_policy', label: 'Law, Policy & Public Sector', icon: Scale, desc: 'Advocacy, debate, governance & civic impact' },
  { id: 'student', label: 'Student, Academia & Research', icon: BookOpen, desc: 'Exams, presentations, thesis & campus life' }
];

const CHALLENGES = [
  { id: 'freezing', label: 'Freezing on the Spot', icon: Zap, desc: 'Hesitating or drawing blanks when asked unexpected questions' },
  { id: 'structuring', label: 'Rambling or Disorganized', icon: ListOrdered, desc: 'Losing the narrative thread before delivering the point' },
  { id: 'vocab', label: 'Vocabulary Bottleneck', icon: Languages, desc: 'Relying on basic words instead of rich, precise vocabulary' },
  { id: 'confidence', label: 'Executive Presence Deficit', icon: Crown, desc: 'Sounding unassertive or hesitant in front of seniors' },
  { id: 'flow', label: 'Stiff or Textbook Speech', icon: Volume2, desc: 'Sounding overly formal, rehearsed, or lacking natural flow' }
];

const FORMAT_PREFERENCES = [
  { id: 'roleplay', label: 'Realistic Roleplays', icon: Users, desc: 'Workplace situations, client meetings, job interviews' },
  { id: 'debate', label: 'Provocative Debates', icon: Flame, desc: 'Spicy takes, defending counter-intuitive stances' },
  { id: 'dilemma', label: 'Decision Dilemmas', icon: GitFork, desc: 'Ethical tradeoffs, tough choices, and crises' },
  { id: 'storytelling', label: 'Personal Storytelling', icon: HeartHandshake, desc: 'Formative mistakes, memories, and personal lessons' },
  { id: 'prediction', label: 'Future Predictions & Pitches', icon: Lightbulb, desc: 'Trend forecasts, bold ideas, and visionary pitches' }
];

const SPEAKING_TONES = [
  { id: 'executive', label: 'Executive & Crisp', desc: 'Boardroom-ready, concise, structured & authoritative' },
  { id: 'charismatic', label: 'Warm & Charismatic', desc: 'Engaging, story-driven, authentic & lively' },
  { id: 'intellectual', label: 'Intellectual & Deep', desc: 'Nuanced, analytical, thoughtful & expansive' },
  { id: 'casual', label: 'Casual & Natural', desc: 'Relaxed, conversational, approachable & fluid' }
];

const TOPICS = [
  { id: 'tech', label: 'Tech & AI', icon: Cpu },
  { id: 'startups', label: 'Business & Startups', icon: Rocket },
  { id: 'science', label: 'Science & Nature', icon: Dna },
  { id: 'travel', label: 'Travel & Culture', icon: Compass },
  { id: 'lifestyle', label: 'Daily Life & Wellness', icon: Coffee },
  { id: 'entertainment', label: 'Movies & Music', icon: Film },
];

const SUGGESTED_CHIPS = [
  'Artificial Intelligence',
  'Venture Capital',
  'Distributed Systems',
  'Public Speaking',
  'Product Design',
  'Macroeconomics',
  'Climate Tech',
  'Philosophy & Ethics',
  'Personal Growth',
  'Remote Work'
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
  const [selectedProfession, setSelectedProfession] = useState<string>(PROFESSIONS[0].label);
  const [selectedChallenge, setSelectedChallenge] = useState<string>(CHALLENGES[0].label);
  const [selectedFormat, setSelectedFormat] = useState<string>(FORMAT_PREFERENCES[0].label);
  const [selectedTone, setSelectedTone] = useState<string>(SPEAKING_TONES[0].label);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Tech & AI', 'Business & Startups']);
  const [customInterests, setCustomInterests] = useState<string>('');
  const [selectedTimeGoal, setSelectedTimeGoal] = useState<number>(5);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const ctx = getUserContext();
    if (ctx) {
      if (ctx.goal) setSelectedGoal(ctx.goal);
      if (ctx.level) setSelectedLevel(ctx.level);
      if (ctx.profession) setSelectedProfession(ctx.profession);
      if (ctx.challenge) setSelectedChallenge(ctx.challenge);
      if (ctx.preferredFormat) setSelectedFormat(ctx.preferredFormat);
      if (ctx.speakingTone) setSelectedTone(ctx.speakingTone);
      if (ctx.interests && Array.isArray(ctx.interests)) setSelectedInterests(ctx.interests);
      if (ctx.customInterests) setCustomInterests(ctx.customInterests);
      if (ctx.dailyGoalMinutes) setSelectedTimeGoal(ctx.dailyGoalMinutes);
      setInitialContext(ctx);
    }
  }, []);

  const isDirty = Boolean(
    initialContext && (
      selectedGoal !== initialContext.goal ||
      selectedLevel !== initialContext.level ||
      selectedProfession !== (initialContext.profession || PROFESSIONS[0].label) ||
      selectedChallenge !== (initialContext.challenge || CHALLENGES[0].label) ||
      selectedFormat !== (initialContext.preferredFormat || FORMAT_PREFERENCES[0].label) ||
      selectedTone !== (initialContext.speakingTone || SPEAKING_TONES[0].label) ||
      selectedTimeGoal !== (initialContext.dailyGoalMinutes || 5) ||
      customInterests.trim() !== (initialContext.customInterests || '').trim() ||
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

  const handleChipClick = (chip: string) => {
    if (!customInterests) {
      setCustomInterests(chip);
    } else if (!customInterests.toLowerCase().includes(chip.toLowerCase())) {
      setCustomInterests(`${customInterests}, ${chip}`);
    }
  };

  const handleSaveContext = async () => {
    const updated: UserContext = {
      goal: selectedGoal,
      level: selectedLevel,
      profession: selectedProfession,
      challenge: selectedChallenge,
      preferredFormat: selectedFormat,
      speakingTone: selectedTone,
      interests: selectedInterests,
      customInterests: customInterests.trim(),
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

      <div className="context-container">
        
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
            Articulate AI uses your exact field, challenges, and tone to suggest tailored topics and calibrate your speaking feedback.
          </p>
        </div>

        {/* Responsive Cards Grid */}
        <div className="context-cards-grid">

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

          {/* 3. Field / Profession / Major */}
          <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
                3. Field / Profession
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--grove-moss)', fontWeight: 600 }}>Niche</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PROFESSIONS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedProfession === p.label;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfession(p.label)}
                    style={{
                      padding: '12px 14px',
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
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--grove-moss)' : 'var(--ink-base)' }}>
                          {p.label}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                          {p.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="var(--grove-moss)" strokeWidth={3} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Primary Speaking Challenge */}
          <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
                4. Primary Speaking Hurdle
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--grove-moss)', fontWeight: 600 }}>Target</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CHALLENGES.map((ch) => {
                const Icon = ch.icon;
                const isSelected = selectedChallenge === ch.label;
                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChallenge(ch.label)}
                    style={{
                      padding: '12px 14px',
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
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--grove-moss)' : 'var(--ink-base)' }}>
                          {ch.label}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                          {ch.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="var(--grove-moss)" strokeWidth={3} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Preferred Conversation Dynamic */}
          <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
                5. Preferred Dynamic
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--grove-moss)', fontWeight: 600 }}>Format</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {FORMAT_PREFERENCES.map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = selectedFormat === fmt.label;
                return (
                  <div
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.label)}
                    style={{
                      padding: '12px 14px',
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
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--grove-moss)' : 'var(--ink-base)' }}>
                          {fmt.label}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                          {fmt.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="var(--grove-moss)" strokeWidth={3} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Target Speaking Vibe / Tone */}
          <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
                6. Desired Tone & Vibe
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--grove-moss)', fontWeight: 600 }}>Persona</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SPEAKING_TONES.map((tone) => {
                const isSelected = selectedTone === tone.label;
                return (
                  <div
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.label)}
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
                      <div style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--grove-moss)' : 'var(--ink-base)' }}>
                        {tone.label}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                        {tone.desc}
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="var(--grove-moss)" strokeWidth={3} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. Topics & Passions */}
          <div className="context-full-width" style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
                7. Passions & General Interests
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                {selectedInterests.length} selected
              </span>
            </div>

            <div className="context-topics-grid">
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

          {/* 8. Custom Focus Keywords & Niche Topics */}
          <div className="context-full-width" style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hash size={18} color="var(--grove-moss)" />
                <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
                  8. Custom Niche Focus (Optional)
                </h4>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>Type or tap chips</span>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
              Specify your exact niches, projects, or hobbies so the AI builds hyper-tailored prompts.
            </p>

            <input
              type="text"
              value={customInterests}
              onChange={(e) => setCustomInterests(e.target.value)}
              placeholder="e.g., Distributed systems, venture capital, climate tech, indie filmmaking"
              className="context-custom-input"
            />

            <div className="context-chips-row">
              {SUGGESTED_CHIPS.map((chip) => (
                <span
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className="context-chip"
                >
                  + {chip}
                </span>
              ))}
            </div>
          </div>

          {/* 9. Daily Practice Goal (Minutes) */}
          <div className="context-full-width" style={{ backgroundColor: 'var(--surface-raised)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink-base)' }}>
                9. Daily Goal in Minutes
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--grove-moss)', fontWeight: 600 }}>{selectedTimeGoal} min/day</span>
            </div>

            <div className="context-time-grid">
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
