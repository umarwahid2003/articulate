import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { processSpeechWithAI, generatePersonalizedTopics, Message } from '../lib/ai';
import { calculateStreak } from '../lib/streak';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, Award, RefreshCw, X, ArrowRight, Lightbulb, Zap, MessageCircle, Mic } from 'lucide-react';
import { TopicSuggestion, AISpeechEvaluation, UserContext } from '../types/user';
import { motion, AnimatePresence } from 'framer-motion';

export interface SessionRecord {
  id: string;
  topic: string;
  timestamp: string;
  score: number;
  transcription?: string;
  scores: {
    fluency: number;
    grammar: number;
    vocabulary: number;
    confidence: number;
  };
  feedback?: string;
  keyPoints?: string[];
  corrections?: {
    original: string;
    better: string;
    reason?: string;
  }[];
  reply?: string;
  followUpQuestion?: string;
  wpm?: number;
  fillerWords?: string[];
  pacingNote?: string;
  durationSeconds: number;
}

export const Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const passedTopic = (location.state as any)?.selectedTopic as TopicSuggestion | undefined;
  const autoSuggest = Boolean((location.state as any)?.autoSuggest);

  const [topics, setTopics] = useState<TopicSuggestion[]>(passedTopic ? [passedTopic] : []);
  const [topicIndex, setTopicIndex] = useState<number>(0);
  const [loadingTopics, setLoadingTopics] = useState<boolean>(false);
  const seenTitlesRef = React.useRef<string[]>(passedTopic ? [passedTopic.title] : []);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [lastEvaluation, setLastEvaluation] = useState<AISpeechEvaluation | null>(null);

  const currentTopic = topics[topicIndex] || null;

  const fetchTopics = async (fresh: boolean = false) => {
    setLoadingTopics(true);
    try {
      const saved = localStorage.getItem('grove_user_context');
      let ctx: UserContext | null = null;
      if (saved) {
        ctx = JSON.parse(saved);
      }
      const generated = await generatePersonalizedTopics(ctx, seenTitlesRef.current);
      if (generated && generated.length > 0) {
        generated.forEach(t => {
          if (t.title && !seenTitlesRef.current.includes(t.title)) {
            seenTitlesRef.current.push(t.title);
          }
        });

        if (fresh || topics.length === 0) {
          setTopics(generated);
          setTopicIndex(0);
        } else {
          setTopics(prev => [...prev, ...generated]);
          setTopicIndex(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error("Error fetching topics:", err);
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => {
    if (autoSuggest) {
      fetchTopics(true);
    }
  }, [autoSuggest]);

  const handleShuffleTopic = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loadingTopics) return;
    setLastEvaluation(null);

    // If there are more topics queued, advance to next
    if (topicIndex < topics.length - 1) {
      setTopicIndex(prev => prev + 1);
      // If running low on topics, pre-fetch next batch in background
      if (topicIndex >= topics.length - 2) {
        fetchTopics(false);
      }
    } else {
      // Need fresh batch
      fetchTopics(false);
    }
  };

  const handleTranscriptionComplete = async (text: string, durationSeconds: number = 30) => {
    setIsProcessing(true);
    try {
      const { evaluation, newHistory } = await processSpeechWithAI(text, history, currentTopic, durationSeconds);
      setHistory(newHistory);
      setLastEvaluation(evaluation);

      // Save FULL Evaluation & Metrics to Session History
      const sessionRecord: SessionRecord = {
        id: Date.now().toString(),
        topic: currentTopic?.title || "Free-Form Speech",
        timestamp: new Date().toISOString(),
        score: evaluation.overallScore || 80,
        transcription: text,
        scores: evaluation.scores || { fluency: 7, grammar: 7, vocabulary: 8, confidence: 8 },
        feedback: evaluation.feedback,
        keyPoints: evaluation.keyPoints,
        corrections: evaluation.corrections,
        reply: evaluation.reply,
        followUpQuestion: evaluation.followUpQuestion,
        fillerWords: evaluation.fillerWords,
        pacingNote: evaluation.pacingNote,
        durationSeconds: durationSeconds
      };

      try {
        let existing: SessionRecord[] = [];
        try {
          const raw = localStorage.getItem('grove_session_history');
          if (raw) existing = JSON.parse(raw);
        } catch (storageErr) {
          console.warn("Error reading session history", storageErr);
        }
        const updated = [sessionRecord, ...existing];
        localStorage.setItem('grove_session_history', JSON.stringify(updated));

        // Calculate and sync new streak
        const newStreak = calculateStreak(updated);
        if (user && isSupabaseConfigured) {
          supabase.from('profiles').update({ current_streak: newStreak }).eq('id', user.id).then(() => {});
        }
      } catch (e) {
        console.error("Error saving session history", e);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout className="page-with-bottom-nav" style={{ height: '100dvh', minHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <NavigationBar />
      
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 84px', boxSizing: 'border-box' }}>
        
        {/* Editorial Page Title */}
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ textAlign: 'center', marginTop: '2px', marginBottom: '8px' }}
        >
          <h1 style={{ 
            fontSize: '30px', 
            fontFamily: 'var(--font-display)', 
            color: 'var(--ink-base)',
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            margin: 0
          }}>
            Speech <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: 'var(--grove-moss)', fontSize: '34px' }}>Studio</span>
          </h1>
        </motion.div>

        {/* Topic Header & Mode Control */}
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'center' }}>
          {loadingTopics && !currentTopic ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '100px',
                padding: '8px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
              }}
            >
              <RefreshCw size={14} className="grove-spin" color="var(--grove-moss)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--grove-moss)', fontFamily: 'var(--font-display)' }}>
                Crafting tailored topic...
              </span>
            </motion.div>
          ) : currentTopic ? (
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentTopic.title}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '20px',
                  padding: '12px 16px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {/* Category & Controls Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ 
                    fontSize: '10.5px', 
                    fontWeight: 700, 
                    letterSpacing: '0.06em', 
                    textTransform: 'uppercase', 
                    color: 'var(--grove-moss)',
                    backgroundColor: 'var(--surface-sunken)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-display)'
                  }}>
                    {currentTopic.category || 'Speaking Topic'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={handleShuffleTopic}
                      disabled={loadingTopics}
                      title="Next Topic"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--grove-moss)',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-display)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--surface-sunken)'
                      }}
                    >
                      <RefreshCw size={12} className={loadingTopics ? 'grove-spin' : ''} />
                      <span>Next</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setTopics([]);
                        setTopicIndex(0);
                      }}
                      title="Switch to Free-form"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--ink-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%'
                      }}
                    >
                      <X size={15} />
                    </motion.button>
                  </div>
                </div>

                {/* Topic Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {currentTopic.emoji && <span style={{ fontSize: '18px', lineHeight: 1 }}>{currentTopic.emoji}</span>}
                  <h2 style={{ 
                    fontSize: '15px', 
                    fontWeight: 600, 
                    fontFamily: 'var(--font-display)', 
                    color: 'var(--ink-base)', 
                    lineHeight: 1.35, 
                    margin: 0,
                    letterSpacing: '-0.01em' 
                  }}>
                    {currentTopic.title}
                  </h2>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                borderRadius: '100px',
                padding: '4px 6px 4px 14px',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ 
                  width: 7, 
                  height: 7, 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--grove-moss)',
                  display: 'inline-block'
                }} />
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: 'var(--ink-base)', 
                  fontFamily: 'var(--font-display)' 
                }}>
                  Free Speaking
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => fetchTopics(true)}
                disabled={loadingTopics}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: 'var(--surface-sunken)',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--grove-moss)',
                  borderRadius: '100px',
                  padding: '5px 12px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  cursor: loadingTopics ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={13} className={loadingTopics ? 'grove-spin' : ''} />
                <span>{loadingTopics ? 'Generating...' : 'Get a Topic'}</span>
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Clean Center Voice Interface */}
        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <VoiceRecorder 
            onTranscriptionComplete={handleTranscriptionComplete}
            isProcessing={isProcessing}
            activePrompt={currentTopic?.starterPrompt}
          />
        </div>

      </div>

      {/* AI Evaluation Bottom Drawer / Modal */}
      <AnimatePresence>
        {lastEvaluation && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLastEvaluation(null)}
              style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(4px)',
                zIndex: 300
              }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                backgroundColor: 'var(--surface-base)',
                borderTopLeftRadius: '26px',
                borderTopRightRadius: '26px',
                padding: '16px 20px 84px',
                zIndex: 301,
                maxHeight: '84vh',
                overflowY: 'auto',
                boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.16)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              {/* Drag Handle Bar */}
              <div style={{ width: '38px', height: '4px', backgroundColor: 'var(--border-hairline)', borderRadius: '2px', margin: '0 auto 4px' }} />

              {/* Header with Score */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color="var(--grove-moss)" />
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontFamily: 'var(--font-display)', 
                    color: 'var(--ink-base)', 
                    letterSpacing: '-0.02em', 
                    margin: 0 
                  }}>
                    Speech <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: 'var(--grove-moss)' }}>Evaluation</span>
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'baseline', 
                    backgroundColor: 'var(--surface-sunken)', 
                    padding: '4px 12px', 
                    borderRadius: '100px',
                    gap: '2px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--grove-moss)', fontFamily: 'var(--font-display)' }}>
                      {lastEvaluation.overallScore}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)' }}>
                      /100
                    </span>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setLastEvaluation(null)} 
                    style={{ background: 'none', border: 'none', color: 'var(--ink-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={18} />
                  </motion.button>
                </div>
              </motion.div>

              {/* Sub-Scores Pill Grid with Animated Bars */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { label: 'Fluency', score: lastEvaluation.scores.fluency },
                  { label: 'Grammar', score: lastEvaluation.scores.grammar },
                  { label: 'Vocab', score: lastEvaluation.scores.vocabulary },
                  { label: 'Confidence', score: lastEvaluation.scores.confidence }
                ].map((item, idx) => (
                  <div key={item.label} style={{ 
                    backgroundColor: 'var(--surface-raised)', 
                    padding: '8px 6px', 
                    borderRadius: '12px', 
                    textAlign: 'center',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--ink-base)', margin: '2px 0 4px' }}>
                      {item.score}<span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--ink-secondary)' }}>/10</span>
                    </div>
                    <div style={{ width: '100%', height: '3.5px', backgroundColor: 'var(--surface-sunken)', borderRadius: '2px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.score / 10) * 100}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 + (idx * 0.05) }}
                        style={{ height: '100%', backgroundColor: 'var(--grove-moss)', borderRadius: '2px' }} 
                      />
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Key Takeaways in Points */}
              {(() => {
                const points = lastEvaluation.keyPoints && lastEvaluation.keyPoints.length > 0
                  ? lastEvaluation.keyPoints
                  : (lastEvaluation.feedback ? lastEvaluation.feedback.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 4) : []);
                
                if (points.length === 0) return null;

                return (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} style={{ backgroundColor: 'var(--surface-raised)', padding: '14px 16px', borderRadius: '18px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                      Key Observations
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {points.map((pt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--grove-moss)', marginTop: '7px', flexShrink: 0 }} />
                          <span style={{ fontSize: '13.5px', color: 'var(--ink-base)', lineHeight: 1.5 }}>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Concrete Critical Corrections & Upgrades */}
              {lastEvaluation.corrections && lastEvaluation.corrections.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-display)' }}>
                    <Lightbulb size={13} />
                    <span>Linguistic Precision Upgrades</span>
                  </div>
                  
                  {lastEvaluation.corrections.map((c, i) => (
                    <div key={i} style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', padding: '12px 14px', borderRadius: '14px', fontSize: '13px' }}>
                      <div style={{ color: 'var(--error-brick)', textDecoration: 'line-through', fontWeight: 500 }}>
                        "{c.original}"
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: '5px 0' }}>
                        <ArrowRight size={12} color="var(--grove-moss)" />
                        <span style={{ fontSize: '11px', color: 'var(--grove-moss)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Better phrasing</span>
                      </div>
                      <div style={{ color: 'var(--grove-moss)', fontWeight: 600, fontSize: '14px' }}>
                        {c.better}
                      </div>
                      {c.reason && (
                        <div style={{ color: 'var(--ink-secondary)', fontSize: '12.5px', marginTop: '4px', lineHeight: 1.4 }}>
                          {c.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Next Question to Practice */}
              {(lastEvaluation.followUpQuestion || lastEvaluation.reply) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} style={{ backgroundColor: 'rgba(47, 75, 60, 0.06)', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(47, 75, 60, 0.16)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <MessageCircle size={16} color="var(--grove-moss)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px', fontFamily: 'var(--font-display)' }}>Conversational Next Step</div>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-base)', lineHeight: 1.5, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                      "{lastEvaluation.followUpQuestion || lastEvaluation.reply}"
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Action Button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.34 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setLastEvaluation(null);
                  handleShuffleTopic({ stopPropagation: () => {} } as any);
                }}
                style={{
                  backgroundColor: 'var(--grove-moss)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  marginTop: '4px',
                  boxShadow: '0 4px 16px rgba(47, 75, 60, 0.25)'
                }}
              >
                <span>Continue Practice</span>
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
};
