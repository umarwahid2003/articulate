import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Square, Loader2, Volume2 } from 'lucide-react';
import { Mascot } from './Mascot';
import { SpeechRecognition as CapacitorSpeech } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

interface VoiceRecorderProps {
  onTranscriptionComplete?: (text: string) => void;
  isProcessing?: boolean;
  activePrompt?: string;
}

function mergeTranscripts(prev: string, current: string): string {
  const p = prev.trim();
  const c = current.trim();
  if (!p) return c;
  if (!c) return p;
  if (p === c) return p;
  if (p.endsWith(c)) return p;
  if (c.startsWith(p)) return c;
  return `${p} ${c}`;
}

export const VoiceRecorder = ({ 
  onTranscriptionComplete, 
  isProcessing = false,
  activePrompt
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  
  const webRecognitionRef = useRef<any>(null);
  const transcriptionRef = useRef<string>('');
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const accumulatedFinalRef = useRef<string>('');
  const currentSessionFinalRef = useRef<string>('');

  useEffect(() => {
    transcriptionRef.current = transcription;
    // Auto-scroll to bottom of transcript box as live words stream in
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcription]);

  useEffect(() => {
    const addListener = async () => {
      try {
        await CapacitorSpeech.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0) {
            const current = data.matches[0];
            const fullText = mergeTranscripts(accumulatedFinalRef.current, current);
            setTranscription(fullText);
          }
        });
      } catch (err) {
        console.error("Native Speech Recognition error:", err);
      }
    };
    
    if (Capacitor.isNativePlatform()) {
      addListener();
    }
    
    return () => {
      if (Capacitor.isNativePlatform()) {
        CapacitorSpeech.removeAllListeners();
      }
    };
  }, []);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    
    if (webRecognitionRef.current) {
      try {
        webRecognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      webRecognitionRef.current = null;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await CapacitorSpeech.stop();
      } catch (err) {
        console.error(err);
      }
    }

    const totalCommitted = mergeTranscripts(accumulatedFinalRef.current, currentSessionFinalRef.current);
    const textToSend = (transcriptionRef.current || totalCommitted).trim();

    if (onTranscriptionComplete && textToSend) {
      onTranscriptionComplete(textToSend);
    } else if (!textToSend) {
      setError("Didn't catch any speech. Tap mic and try again.");
    }
  }, [onTranscriptionComplete]);

  const startRecording = async () => {
    setError(null);
    setTranscription('');
    transcriptionRef.current = '';
    accumulatedFinalRef.current = '';
    currentSessionFinalRef.current = '';
    
    try {
      if (Capacitor.isNativePlatform()) {
        const { speechRecognition } = await CapacitorSpeech.checkPermissions();
        if (speechRecognition !== 'granted') {
          const { speechRecognition: newPerm } = await CapacitorSpeech.requestPermissions();
          if (newPerm !== 'granted') {
            setError('Microphone permission required.');
            return;
          }
        }
        
        await CapacitorSpeech.start({
          language: 'en-US',
          partialResults: true,
          popup: false,
        });
      } else {
        const SpeechRecognitionWeb = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognitionWeb) {
          setError('Use Google Chrome, Edge, or Safari with microphone access.');
          return;
        }

        const recognition = new SpeechRecognitionWeb();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let sessionFinal = '';
          let interim = '';

          // event.results already accumulates all results for the active session
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              sessionFinal += result[0].transcript + ' ';
            } else {
              interim += result[0].transcript;
            }
          }

          currentSessionFinalRef.current = sessionFinal.trim();

          const committed = mergeTranscripts(accumulatedFinalRef.current, currentSessionFinalRef.current);
          const totalDisplay = interim.trim() 
            ? (committed ? `${committed} ${interim.trim()}` : interim.trim())
            : committed;

          setTranscription(totalDisplay);
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed') {
            setError('Microphone permission blocked in browser.');
          }
        };

        recognition.onend = () => {
          if (webRecognitionRef.current) {
            // Transfer finalized session results before starting a fresh session
            if (currentSessionFinalRef.current) {
              accumulatedFinalRef.current = mergeTranscripts(accumulatedFinalRef.current, currentSessionFinalRef.current);
              currentSessionFinalRef.current = '';
            }
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognition.start();
        webRecognitionRef.current = recognition;
      }
      
      setIsRecording(true);
      setElapsed(0);
    } catch (err: any) {
      console.error('Error starting speech:', err);
      setError('Could not access microphone.');
    }
  };

  const toggleRecording = () => {
    if (isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  let mascotState: 'waiting' | 'listening' | 'thinking' = 'waiting';
  if (isRecording) mascotState = 'listening';
  if (isProcessing) mascotState = 'thinking';

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      height: '100%', 
      width: '100%', 
      padding: '0 12px',
      boxSizing: 'border-box'
    }}>
      
      {/* 3D Mascot Hero (Flexible Container) */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flex: '1 1 0', 
        minHeight: '140px', 
        maxHeight: '210px',
        width: '100%'
      }}>
        <Mascot state={mascotState} size={170} />
      </div>

      {/* Dynamic Speech / Prompt Box with Fixed Height and Auto-Scroll */}
      <div 
        ref={transcriptScrollRef}
        style={{ 
          width: '100%', 
          maxWidth: '380px',
          height: '76px',
          minHeight: '76px',
          maxHeight: '76px',
          padding: '10px 16px', 
          borderRadius: '16px',
          backgroundColor: isRecording ? 'rgba(31, 122, 108, 0.08)' : 'var(--surface-raised)',
          border: isRecording ? '1.5px solid var(--grove-moss)' : '1px solid var(--border-subtle)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: transcription || error ? 'flex-start' : 'center',
          textAlign: 'center',
          margin: '6px 0',
          overflowY: 'auto',
          flexShrink: 0,
          boxSizing: 'border-box',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {error ? (
          <span style={{ color: '#E53E3E', fontSize: '13px', fontWeight: 500, margin: 'auto 0' }}>{error}</span>
        ) : transcription ? (
          <p style={{ fontSize: '14px', color: 'var(--ink-base)', margin: 0, lineHeight: 1.45, fontStyle: 'italic', width: '100%' }}>
            "{transcription}"
          </p>
        ) : isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--grove-moss)', margin: 'auto 0' }}>
            <Volume2 size={16} className="animate-pulse" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Listening... Speak naturally</span>
          </div>
        ) : isProcessing ? (
          <span style={{ fontSize: '14px', color: 'var(--grove-moss)', fontWeight: 600, margin: 'auto 0' }}>
            Evaluating speech...
          </span>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 'auto 0', lineHeight: 1.35 }}>
            {activePrompt || "Tap the mic and speak freely in English."}
          </p>
        )}
      </div>

      {/* Rock-Solid Fixed Position Timer & Mic Controls */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        marginTop: '4px', 
        marginBottom: '4px',
        flexShrink: 0 
      }}>
        {/* Timer */}
        <div style={{ 
          fontSize: '15px', 
          fontWeight: 700, 
          fontFamily: 'var(--font-mono)', 
          color: isRecording ? '#E53E3E' : 'var(--ink-secondary)', 
          marginBottom: '8px',
          height: '20px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {isRecording ? formatTime(elapsed) : isProcessing ? 'Thinking...' : 'Ready'}
        </div>

        {/* Mic / Stop Button */}
        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          style={{ 
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isRecording ? '#E53E3E' : 'var(--grove-moss)',
            color: '#ffffff',
            border: 'none',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            boxShadow: isRecording ? '0 0 24px rgba(229, 62, 62, 0.5)' : '0 8px 24px rgba(31, 122, 108, 0.3)',
            transition: 'all 0.2s ease',
            opacity: isProcessing ? 0.6 : 1,
            flexShrink: 0
          }}
          aria-label={isRecording ? "Stop" : "Start"}
        >
          {isProcessing ? (
            <Loader2 size={26} className="grove-spin" />
          ) : isRecording ? (
            <Square size={22} fill="currentColor" />
          ) : (
            <Mic size={28} />
          )}
        </button>

        {/* Action Caption */}
        <span style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ink-secondary)', fontWeight: 500, height: '16px' }}>
          {isRecording ? 'Tap square when finished' : 'Tap to speak'}
        </span>
      </div>

    </div>
  );
};
