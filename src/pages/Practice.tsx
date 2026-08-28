import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { NavigationBar } from '../components/NavigationBar';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { processSpeechWithAI, generatePersonalizedTopics, Message } from '../lib/ai';
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
  corrections?: {
    original: string;
    better: string;
    reason?: string;
  }[];
  reply?: string;
  wpm?: number;
  fillerWords?: string[];
  pacingNote?: string;
  durationSeconds: number;
}

export const Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const passedTopic = (location.state as any)?.selectedTopic as TopicSuggestion | undefined;

  const [topics, setTopics] = useState<TopicSuggestion[]>(passedTopic ? [passedTopic] : []);
  const [topicIndex, setTopicIndex] = useState<number>(0);
  const [loadingTopics, setLoadingTopics] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [lastEvaluation, setLastEvaluation] = useState<AISpeechEvaluation | null>(null);

  const currentTopic = topics[topicIndex] || passedTopic || null;

  useEffect(() => {
    if (!passedTopic) {
      fetchTopics();
    }
  }, []);

  const fetchTopics = async () => {
    setLoadingTopics(true);
    try {
      const saved = localStorage.getItem('grove_user_context');
      let ctx: UserContext | null = null;
      if (saved) {
        ctx = JSON.parse(saved);
      }
      const generated = await generatePersonalizedTopics(ctx);
      setTopics(generated);
      setTopicIndex(0);
    } catch (err) {
      console.error("Error fetching topics:", err);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleShuffleTopic = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (topics.length > 1) {
      setTopicIndex((prev) => (prev + 1) % topics.length);
    } else {
      fetchTopics();
    }
    setLastEvaluation(null);
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
        corrections: evaluation.corrections,
        reply: evaluation.reply,
        wpm: evaluation.wpm,
        fillerWords: evaluation.fillerWords,
        pacingNote: evaluation.pacingNote,
        durationSeconds: durationSeconds
      };

      try {
        const existing = JSON.parse(localStorage.getItem('grove_session_history') || '[]');
        const updated = [sessionRecord, ...existing];
        localStorage.setItem('grove_session_history', JSON.stringify(updated));
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
          {currentTopic ? (
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
              <Sparkles size={14} color="var(--grove-moss)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTopic.title}
              </span>
              <RefreshCw size={12} color="var(--grove-moss)" style={{ flexShrink: 0 }} />
            </div>
          ) : (
            <button
              onClick={fetchTopics}
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
              {/* Header with Score */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              </div>

              {/* Sub-Scores Pill Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Fluency</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>{lastEvaluation.scores.fluency}/10</strong>
                </div>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Grammar</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>{lastEvaluation.scores.grammar}/10</strong>
                </div>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Vocab</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>{lastEvaluation.scores.vocabulary}/10</strong>
                </div>
                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Confidence</div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-base)' }}>{lastEvaluation.scores.confidence}/10</strong>
                </div>
              </div>

              {/* Speaking Pace & Filler Word Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: 'rgba(31, 122, 108, 0.08)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(31, 122, 108, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={16} color="var(--grove-moss)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', fontWeight: 500 }}>Speaking Pace</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-base)' }}>
                      {lastEvaluation.wpm || 130} WPM <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--grove-moss)' }}>({lastEvaluation.pacingNote || 'Optimal'})</span>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mic size={16} color="var(--ink-secondary)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', fontWeight: 500 }}>Filler Words</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-base)' }}>
                      {lastEvaluation.fillerWords?.length ? `${lastEvaluation.fillerWords.length} detected` : '0 Clean flow'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coach Conversational Reply & Follow-Up */}
              {lastEvaluation.reply && (
                <div style={{ backgroundColor: 'var(--surface-raised)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--border-subtle)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <MessageCircle size={18} color="var(--grove-moss)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', marginBottom: '2px' }}>Coach Response & Follow-up</div>
                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink-base)', lineHeight: 1.45 }}>
                      {lastEvaluation.reply}
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Assessment */}
              <div style={{ backgroundColor: 'var(--surface-raised)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink-base)', lineHeight: 1.45 }}>
                  {lastEvaluation.feedback}
                </p>
              </div>

              {/* Concrete Critical Corrections & Upgrades */}
              {lastEvaluation.corrections && lastEvaluation.corrections.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--grove-moss)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lightbulb size={14} />
                    <span>Linguistic Precision Upgrades</span>
                  </div>
                  
                  {lastEvaluation.corrections.map((c, i) => (
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
              )}

              {/* Action Button */}
              <button
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
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
};
