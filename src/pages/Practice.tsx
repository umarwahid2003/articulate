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
  const autoSuggest = (location.state as any)?.autoSuggest;

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
    if (autoSuggest || !passedTopic) {
      fetchTopics(true);
    }
  }, [location.state]);

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
        topic: currentTopic?.title || "Daily Speaking Practice",
        timestamp: new Date().toISOString(),
        score: evaluation.overallScore || 80,
        transcription: text,
        scores: evaluation.scores || { fluency: 7, grammar: 7, vocabulary: 8, confidence: 8 },
        feedback: evaluation.feedback,
        keyPoints: evaluation.keyPoints,
        corrections: evaluation.corrections,
        reply: evaluation.reply,
        followUpQuestion: evaluation.followUpQuestion,
        wpm: evaluation.wpm,
        fillerWords: evaluation.fillerWords,
        pacingNote: evaluation.pacingNote,
        durationSeconds: durationSeconds
      };

      try {
        const existing = JSON.parse(localStorage.getItem('grove_session_history') || '[]');
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
    <Layout className="page-with-bottom-nav" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <NavigationBar 
        trailingActions={[
          <button 
            key="shuffle"
            onClick={handleShuffleTopic}
            title="Next Topic"
            disabled={loadingTopics}
            className="grove-nav-bar__action-btn grove-nav-bar__action-btn--bubble" 
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--grove-moss)' }}
          >
            <RefreshCw size={15} className={loadingTopics ? 'grove-spin' : ''} />
          </button>
        ]}
      />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 88px', height: 'calc(100vh - 140px)', boxSizing: 'border-box' }}>
        
        {/* Minimal Compact Topic Pill */}
        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', justifyContent: 'center' }}>
          {loadingTopics && !currentTopic ? (
            <div 
              style={{
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '100px',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <RefreshCw size={13} className="grove-spin" color="var(--grove-moss)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--grove-moss)' }}>
                Crafting fresh topic...
              </span>
            </div>
          ) : currentTopic ? (
            <div 
              onClick={handleShuffleTopic}
              style={{
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '100px',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                maxWidth: '100%'
              }}
            >
              <span style={{ fontSize: '14px' }}>{currentTopic.emoji || '✨'}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTopic.title}
              </span>
              <RefreshCw size={12} color="var(--grove-moss)" className={loadingTopics ? 'grove-spin' : ''} style={{ flexShrink: 0 }} />
            </div>
          ) : (
            <button
              onClick={() => fetchTopics(true)}
              style={{
                backgroundColor: 'var(--surface-raised)',
                border: '1px dashed var(--grove-moss)',
                borderRadius: '100px',
                padding: '6px 14px',
                fontSize: '13px',
                color: 'var(--grove-moss)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={14} />
              <span>Get AI Topic</span>
            </button>
          )}
        </div>

        {/* Clean Center Voice & Mascot Interface */}
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
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(3px)',
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
                padding: '20px 20px 84px',
                zIndex: 301,
                maxHeight: '84vh',
                overflowY: 'auto',
                boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--border-hairline)', borderRadius: '2px', margin: '0 auto 12px' }} />

              {/* Header with Score */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 * 0.06 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color="var(--grove-moss)" />
                  <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--ink-base)' }}>Coach Evaluation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ backgroundColor: 'rgba(31, 122, 108, 0.12)', color: 'var(--grove-moss)', fontWeight: 800, fontSize: '14px', padding: '4px 12px', borderRadius: '100px' }}>
                    {lastEvaluation.overallScore}/100
                  </div>
                  <button onClick={() => setLastEvaluation(null)} style={{ background: 'none', border: 'none', color: 'var(--ink-secondary)', cursor: 'pointer', padding: '4px' }}>
                    <X size={18} />
                  </button>
                </div>
              </motion.div>

              {/* Sub-Scores Pill Grid */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 * 0.06 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Fluency</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>{lastEvaluation.scores.fluency}/10</strong>
                  <div style={{ width: '100%', height: '3px', backgroundColor: 'var(--surface-base)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(lastEvaluation.scores.fluency / 10) * 100}%`, height: '100%', backgroundColor: 'var(--grove-moss)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Grammar</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>{lastEvaluation.scores.grammar}/10</strong>
                  <div style={{ width: '100%', height: '3px', backgroundColor: 'var(--surface-base)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(lastEvaluation.scores.grammar / 10) * 100}%`, height: '100%', backgroundColor: 'var(--grove-moss)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Vocab</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>{lastEvaluation.scores.vocabulary}/10</strong>
                  <div style={{ width: '100%', height: '3px', backgroundColor: 'var(--surface-base)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(lastEvaluation.scores.vocabulary / 10) * 100}%`, height: '100%', backgroundColor: 'var(--grove-moss)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Confidence</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>{lastEvaluation.scores.confidence}/10</strong>
                  <div style={{ width: '100%', height: '3px', backgroundColor: 'var(--surface-base)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(lastEvaluation.scores.confidence / 10) * 100}%`, height: '100%', backgroundColor: 'var(--grove-moss)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              </motion.div>

              {/* Key Takeaways in Points */}
              {(() => {
                const points = lastEvaluation.keyPoints && lastEvaluation.keyPoints.length > 0
                  ? lastEvaluation.keyPoints
                  : (lastEvaluation.feedback ? lastEvaluation.feedback.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 4) : []);
                
                if (points.length === 0) return null;

                return (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 * 0.06 }} style={{ backgroundColor: 'var(--surface-raised)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Key Takeaways
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {points.map((pt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '3px', backgroundColor: 'var(--grove-moss)', marginTop: '6px', flexShrink: 0 }} />
                          <span style={{ fontSize: '13.5px', color: 'var(--ink-base)', lineHeight: 1.45 }}>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Concrete Critical Corrections & Upgrades */}
              {lastEvaluation.corrections && lastEvaluation.corrections.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3 * 0.06 }} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lightbulb size={14} />
                    <span>Linguistic Precision Upgrades</span>
                  </div>
                  
                  {lastEvaluation.corrections.map((c, i) => (
                    <div key={i} style={{ backgroundColor: 'var(--surface-sunken)', padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }}>
                      <div style={{ color: '#E53E3E', textDecoration: 'line-through', fontWeight: 500 }}>
                        "{c.original}"
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '4px 0' }}><ArrowRight size={12} color="var(--grove-moss)" /><span style={{ fontSize: '11px', color: 'var(--grove-moss)', fontWeight: 600 }}>Better version</span></div>
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
                </motion.div>
              )}

              {/* Next Question to Practice */}
              {(lastEvaluation.followUpQuestion || lastEvaluation.reply) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4 * 0.06 }} style={{ backgroundColor: 'rgba(31, 122, 108, 0.08)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(31, 122, 108, 0.2)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <MessageCircle size={16} color="var(--grove-moss)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', marginBottom: '2px' }}>Next Question to Practice</div>
                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink-base)', lineHeight: 1.45 }}>
                      {lastEvaluation.followUpQuestion || lastEvaluation.reply}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Action Button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 6 * 0.06 }}
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                <span>Continue to Next Topic</span>
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
};
