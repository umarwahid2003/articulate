import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { processSpeechWithAI, generatePersonalizedTopics, isMeaningfulSpeech, Message } from '../lib/ai';
import { calculateStreak } from '../lib/streak';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RefreshCw, X, ArrowRight } from 'lucide-react';
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
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const currentTopic = topics[topicIndex] || null;

  useEffect(() => {
    if (evaluationError) {
      const timer = setTimeout(() => setEvaluationError(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [evaluationError]);

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

    if (topicIndex < topics.length - 1) {
      setTopicIndex(prev => prev + 1);
      if (topicIndex >= topics.length - 2) {
        fetchTopics(false);
      }
    } else {
      fetchTopics(false);
    }
  };

  const handleTranscriptionComplete = async (text: string, durationSeconds: number = 30) => {
    if (!isMeaningfulSpeech(text)) {
      setEvaluationError("No speech detected. Try again.");
      return;
    }

    setIsProcessing(true);
    setEvaluationError(null);
    try {
      const { evaluation, newHistory } = await processSpeechWithAI(text, history, currentTopic, durationSeconds);
      
      if (!evaluation || typeof evaluation.overallScore !== 'number') {
        throw new Error("Invalid AI evaluation response");
      }

      setHistory(newHistory);
      setLastEvaluation(evaluation);

      const sessionRecord: SessionRecord = {
        id: Date.now().toString(),
        topic: currentTopic?.title || "Free-Form Speech",
        timestamp: new Date().toISOString(),
        score: evaluation.overallScore,
        transcription: text,
        scores: evaluation.scores || { fluency: 7, grammar: 7, vocabulary: 7, confidence: 7 },
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
        window.dispatchEvent(new Event('grove_session_updated'));

        const newStreak = calculateStreak(updated);
        if (user && isSupabaseConfigured) {
          supabase.from('profiles').update({ current_streak: newStreak }).eq('id', user.id).then(() => {});
        }
      } catch (e) {
        console.error("Error saving session history", e);
      }

    } catch (err: any) {
      console.error("Speech evaluation error:", err);
      if (err?.message === 'INSUFFICIENT_SPEECH') {
        setEvaluationError("Speech was too brief. Say a few sentences to get feedback.");
      } else {
        setEvaluationError("Couldn't process that. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout className="page-with-bottom-nav" style={{ height: '100dvh', minHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <NavigationBar />
      
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 84px', boxSizing: 'border-box' }}>
        
        {/* Topic / Mode — minimal inline display */}
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
          {loadingTopics && !currentTopic ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}
            >
              <RefreshCw size={13} className="grove-spin" color="var(--ink-secondary)" />
              <span style={{ fontSize: '14px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-body)' }}>
                Finding a topic...
              </span>
            </motion.div>
          ) : currentTopic ? (
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentTopic.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: '100%',
                  textAlign: 'center',
                  padding: '6px 0'
                }}
              >
                {/* Category */}
                {currentTopic.category && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--ink-tertiary)',
                    fontFamily: 'var(--font-body)',
                    marginBottom: '4px'
                  }}>
                    {currentTopic.category}
                  </div>
                )}

                {/* Topic Title */}
                <div style={{ 
                  fontSize: '17px', 
                  fontWeight: 600, 
                  fontFamily: 'var(--font-display)', 
                  color: 'var(--ink-base)', 
                  lineHeight: 1.35,
                  letterSpacing: '-0.01em',
                  marginBottom: '8px'
                }}>
                  {currentTopic.emoji && <span style={{ marginRight: '6px' }}>{currentTopic.emoji}</span>}
                  {currentTopic.title}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <button
                    onClick={handleShuffleTopic}
                    disabled={loadingTopics}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink-secondary)',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <span>Skip</span>
                    <ArrowRight size={12} />
                  </button>

                  <button
                    onClick={() => {
                      setTopics([]);
                      setTopicIndex(0);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink-tertiary)',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Speak freely instead
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '6px 0'
              }}
            >
              <span style={{ 
                fontSize: '14px', 
                color: 'var(--ink-secondary)', 
                fontFamily: 'var(--font-body)' 
              }}>
                Speak freely
              </span>

              <button
                onClick={() => fetchTopics(true)}
                disabled={loadingTopics}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--grove-moss)',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                  cursor: loadingTopics ? 'not-allowed' : 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px'
                }}
              >
                {loadingTopics ? 'Loading...' : 'Get a topic'}
              </button>
            </motion.div>
          )}
        </div>

        {/* Voice Interface */}
        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <VoiceRecorder 
            onTranscriptionComplete={handleTranscriptionComplete}
            onRecordingStart={() => {
              setLastEvaluation(null);
              setEvaluationError(null);
            }}
            isProcessing={isProcessing}
            activePrompt={currentTopic?.starterPrompt}
          />
        </div>

      </div>

      {/* Evaluation Drawer */}
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
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '16px 20px 84px',
                zIndex: 301,
                maxHeight: '84vh',
                overflowY: 'auto',
                boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {/* Drag Handle */}
              <div style={{ width: '36px', height: '4px', backgroundColor: 'var(--border-hairline)', borderRadius: '2px', margin: '0 auto 2px' }} />

              {/* Score Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ 
                    fontSize: '36px', 
                    fontWeight: 700, 
                    fontFamily: 'var(--font-display)', 
                    color: 'var(--ink-base)',
                    lineHeight: 1,
                    letterSpacing: '-0.03em'
                  }}>
                    {lastEvaluation.overallScore}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--ink-tertiary)', fontFamily: 'var(--font-body)' }}>
                    / 100
                  </span>
                </div>
                <button 
                  onClick={() => setLastEvaluation(null)} 
                  style={{ background: 'none', border: 'none', color: 'var(--ink-tertiary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub-Scores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Fluency', score: lastEvaluation.scores.fluency },
                  { label: 'Grammar', score: lastEvaluation.scores.grammar },
                  { label: 'Vocab', score: lastEvaluation.scores.vocabulary },
                  { label: 'Confidence', score: lastEvaluation.scores.confidence }
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '12px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-body)' }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-base)', fontFamily: 'var(--font-display)' }}>
                        {item.score}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '3px', backgroundColor: 'var(--surface-sunken)', borderRadius: '2px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.score / 10) * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{ height: '100%', backgroundColor: 'var(--grove-moss)', borderRadius: '2px' }} 
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Feedback */}
              {(() => {
                const points = lastEvaluation.keyPoints && lastEvaluation.keyPoints.length > 0
                  ? lastEvaluation.keyPoints
                  : (lastEvaluation.feedback ? lastEvaluation.feedback.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 4) : []);
                
                if (points.length === 0) return null;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-base)', fontFamily: 'var(--font-display)' }}>
                      Feedback
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {points.map((pt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--ink-tertiary)', marginTop: '8px', flexShrink: 0 }} />
                          <span style={{ fontSize: '14px', color: 'var(--ink-base)', lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Corrections */}
              {lastEvaluation.corrections && lastEvaluation.corrections.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-base)', fontFamily: 'var(--font-display)' }}>
                    Corrections
                  </span>
                  
                  {lastEvaluation.corrections.map((c, i) => (
                    <div key={i} style={{ 
                      backgroundColor: 'var(--surface-raised)', 
                      padding: '12px 14px', 
                      borderRadius: '12px', 
                      fontSize: '14px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ color: 'var(--error-brick)', textDecoration: 'line-through', fontWeight: 500 }}>
                        {c.original}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '6px 0' }}>
                        <ArrowRight size={11} color="var(--grove-moss)" />
                        <span style={{ color: 'var(--grove-moss)', fontWeight: 600 }}>
                          {c.better}
                        </span>
                      </div>
                      {c.reason && (
                        <div style={{ color: 'var(--ink-secondary)', fontSize: '13px', lineHeight: 1.45, fontFamily: 'var(--font-body)' }}>
                          {c.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Try next */}
              {(lastEvaluation.followUpQuestion || lastEvaluation.reply) && (
                <div style={{ 
                  backgroundColor: 'rgba(47, 75, 60, 0.05)', 
                  padding: '14px 16px', 
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--grove-moss)', fontFamily: 'var(--font-display)' }}>
                    Try next
                  </span>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-base)', lineHeight: 1.5, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    "{lastEvaluation.followUpQuestion || lastEvaluation.reply}"
                  </p>
                </div>
              )}

              {/* Action Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setLastEvaluation(null);
                  handleShuffleTopic({ stopPropagation: () => {} } as any);
                }}
                style={{
                  backgroundColor: 'var(--grove-moss)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  marginTop: '2px'
                }}
              >
                Practice again
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {evaluationError && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: '64px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              borderRadius: '100px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 400,
              maxWidth: '92%',
              boxSizing: 'border-box'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--error-brick)', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'var(--ink-base)', fontWeight: 500, fontFamily: 'var(--font-body)', lineHeight: 1.3 }}>
              {evaluationError}
            </span>
            <button 
              onClick={() => setEvaluationError(null)} 
              style={{ background: 'none', border: 'none', color: 'var(--ink-tertiary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};
