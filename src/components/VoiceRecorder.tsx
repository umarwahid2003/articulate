import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Square, Loader2, Volume2 } from 'lucide-react';
import { Mascot } from './Mascot';
import clsx from 'clsx';
import { SpeechRecognition as CapacitorSpeech } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

interface VoiceRecorderProps {
  onTranscriptionComplete?: (text: string) => void;
  isProcessing?: boolean;
  activePrompt?: string;
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

  useEffect(() => {
    transcriptionRef.current = transcription;
  }, [transcription]);

  useEffect(() => {
    const addListener = async () => {
      try {
        await CapacitorSpeech.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0) {
            setTranscription(data.matches[0]);
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
    
    const textToSend = transcriptionRef.current.trim();
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
          setError('Use Google Chrome or Edge for live microphone listening.');
          return;
        }

        const recognition = new SpeechRecognitionWeb();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscription(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed') {
            setError('Microphone permission blocked in browser.');
          }
        };

        recognition.onend = () => {
          if (isRecording && webRecognitionRef.current) {
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', width: '100%', padding: '0 16px' }}>
      
      {/* 3D Mascot Hero */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '1 1 0', minHeight: '160px', maxHeight: '220px' }}>
        <Mascot state={mascotState} size={180} />
      </div>

      {/* Dynamic Text / Prompt / Speech Bubble */}
      <div style={{ 
        width: '100%', 
        maxWidth: '380px',
        minHeight: '68px',
        padding: '12px 18px', 
        borderRadius: '16px',
        backgroundColor: isRecording ? 'rgba(31, 122, 108, 0.08)' : 'var(--surface-raised)',
        border: isRecording ? '1px solid var(--grove-moss)' : '1px solid var(--border-subtle)',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        margin: '8px 0'
      }}>
        {error ? (
          <span style={{ color: '#E53E3E', fontSize: '13px', fontWeight: 500 }}>{error}</span>
        ) : transcription ? (
          <p style={{ fontSize: '15px', color: 'var(--ink-base)', margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>
            "{transcription}"
          </p>
        ) : isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--grove-moss)' }}>
            <Volume2 size={16} className="animate-pulse" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Listening... Speak naturally</span>
          </div>
        ) : isProcessing ? (
          <span style={{ fontSize: '14px', color: 'var(--grove-moss)', fontWeight: 600 }}>
            Analyzing speech with Gemini...
          </span>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.35 }}>
            {activePrompt || "Tap the mic and speak freely in English."}
          </p>
        )}
      </div>

      {/* Timer & Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '6px', marginBottom: '8px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isRecording ? '#E53E3E' : 'var(--ink-secondary)', marginBottom: '8px' }}>
          {isRecording ? formatTime(elapsed) : isProcessing ? 'Thinking...' : 'Ready'}
        </div>

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
            boxShadow: isRecording ? '0 0 20px rgba(229, 62, 62, 0.45)' : '0 8px 24px rgba(31, 122, 108, 0.3)',
            transition: 'all 0.2s ease',
            opacity: isProcessing ? 0.6 : 1 
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

        <span style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ink-secondary)' }}>
          {isRecording ? 'Tap square when finished' : 'Tap to speak'}
        </span>
      </div>

    </div>
  );
};
