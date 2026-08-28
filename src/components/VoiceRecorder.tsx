import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Square, Loader2, Volume2, Sparkles } from 'lucide-react';
import { Mascot } from './Mascot';
import { SpeechRecognition as CapacitorSpeech } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';
import { transcribeAudioWithWhisper } from '../lib/ai';

interface VoiceRecorderProps {
  onTranscriptionComplete?: (text: string, durationSeconds: number) => void;
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
  const [isWhisperTranscribing, setIsWhisperTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [audioLevels, setAudioLevels] = useState<number[]>([0.15, 0.2, 0.3, 0.2, 0.15]);
  
  const webRecognitionRef = useRef<any>(null);
  const transcriptionRef = useRef<string>('');
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const accumulatedFinalRef = useRef<string>('');
  const currentSessionFinalRef = useRef<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);

  useEffect(() => {
    transcriptionRef.current = transcription;
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcription]);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

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

  // Audio frequency analyser loop
  const startAudioAnalysis = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Sample 7 frequency points across speech spectrum
        const indices = [2, 4, 6, 8, 10, 12, 14];
        const levels = indices.map(idx => {
          const val = (dataArray[idx] || 0) / 255;
          return Math.max(0.12, Math.min(1.0, val * 1.6));
        });

        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch (err) {
      console.warn("Waveform visualizer note:", err);
    }
  };

  const stopAudioAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioLevels([0.15, 0.2, 0.3, 0.2, 0.15]);
  };

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    stopAudioAnalysis();
    
    // 1. Stop Web Speech Recognition
    if (webRecognitionRef.current) {
      try {
        webRecognitionRef.current.stop();
      } catch (e) {}
      webRecognitionRef.current = null;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await CapacitorSpeech.stop();
      } catch (err) {
        console.error(err);
      }
    }

    // 2. Stop MediaRecorder
    let recordedBlob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) return resolve();
        mediaRecorderRef.current.onstop = () => resolve();
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          resolve();
        }
      });
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioChunksRef.current.length > 0) {
      const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
      recordedBlob = new Blob(audioChunksRef.current, { type: mime });
    }

    // 3. Compute live transcript fallback
    const totalCommitted = mergeTranscripts(accumulatedFinalRef.current, currentSessionFinalRef.current);
    let finalText = (transcriptionRef.current || totalCommitted).trim();

    // 4. Try Groq Whisper Large V3 Turbo for ultra-high accuracy
    if (recordedBlob && recordedBlob.size > 1500) {
      try {
        setIsWhisperTranscribing(true);
        const whisperText = await transcribeAudioWithWhisper(recordedBlob);
        setIsWhisperTranscribing(false);
        if (whisperText && whisperText.trim().length > 0) {
          finalText = whisperText.trim();
          setTranscription(finalText);
        }
      } catch (whisperErr) {
        console.warn("Whisper fallback to Web Speech:", whisperErr);
        setIsWhisperTranscribing(false);
      }
    }

    const recordedSeconds = Math.max(1, elapsedRef.current);
    if (onTranscriptionComplete && finalText) {
      onTranscriptionComplete(finalText, recordedSeconds);
    } else if (!finalText) {
      setError("Didn't catch any speech. Tap mic and try again.");
    }
  }, [onTranscriptionComplete]);

  const startRecording = async () => {
    setError(null);
    setTranscription('');
    transcriptionRef.current = '';
    accumulatedFinalRef.current = '';
    currentSessionFinalRef.current = '';
    audioChunksRef.current = [];
    
    try {
      // 1. Initialize Audio MediaRecorder and Waveform Analyser
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          startAudioAnalysis(stream);

          let mimeType = 'audio/webm;codecs=opus';
          if (typeof MediaRecorder !== 'undefined') {
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
              else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
              else mimeType = '';
            }
            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                audioChunksRef.current.push(e.data);
              }
            };
            recorder.start(250);
            mediaRecorderRef.current = recorder;
          }
        } catch (mediaErr) {
          console.warn("MediaRecorder init note:", mediaErr);
        }
      }

      // 2. Initialize Real-Time Web Speech for live on-screen words
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
        
        if (SpeechRecognitionWeb) {
          const recognition = new SpeechRecognitionWeb();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let sessionFinal = '';
            let interim = '';

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
      }
      
      setIsRecording(true);
      setElapsed(0);
    } catch (err: any) {
      console.error('Error starting speech:', err);
      setError('Could not access microphone.');
    }
  };

  const toggleRecording = () => {
    if (isProcessing || isWhisperTranscribing) return;
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
  if (isProcessing || isWhisperTranscribing) mascotState = 'thinking';

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
      
      {/* 3D Mascot Hero */}
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

      {/* Dynamic Speech / Prompt Box */}
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
        ) : isWhisperTranscribing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--grove-moss)', margin: 'auto 0' }}>
            <Sparkles size={16} className="grove-spin" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Transcribing with Whisper Large V3...</span>
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

      {/* Rock-Solid Fixed Position Timer, Live Waveform & Mic Controls */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        marginTop: '4px', 
        marginBottom: '4px',
        flexShrink: 0 
      }}>
        
        {/* Timer + Waveform */}
        <div style={{ 
          height: '48px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '6px', 
          marginBottom: '6px' 
        }}>
          {isRecording ? (
            <>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 700, 
                fontFamily: 'var(--font-mono)', 
                color: 'var(--ink-primary)',
                letterSpacing: '0.05em'
              }}>
                {formatTime(elapsed)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                {audioLevels.map((lvl, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      width: '3px', 
                      height: `${Math.max(3, Math.round(lvl * 20))}px`, 
                      borderRadius: '2px', 
                      backgroundColor: 'var(--grove-moss)', 
                      transition: 'height 0.08s ease-out' 
                    }} 
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={{ 
              fontSize: '15px', 
              fontWeight: 700, 
              fontFamily: 'var(--font-mono)', 
              color: 'var(--ink-secondary)', 
              display: 'flex', 
              alignItems: 'center' 
            }}>
              {(isProcessing || isWhisperTranscribing) ? 'Thinking...' : 'Ready'}
            </div>
          )}
        </div>

        {/* Mic / Stop Button */}
        <button
          onClick={toggleRecording}
          disabled={isProcessing || isWhisperTranscribing}
          className={isRecording ? 'mic-pulse-ring' : ''}
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
            cursor: (isProcessing || isWhisperTranscribing) ? 'not-allowed' : 'pointer',
            boxShadow: isRecording ? '0 0 24px rgba(229, 62, 62, 0.5)' : '0 8px 24px rgba(31, 122, 108, 0.3)',
            transition: 'all 0.2s ease',
            opacity: (isProcessing || isWhisperTranscribing) ? 0.6 : 1,
            flexShrink: 0
          }}
          aria-label={isRecording ? "Stop" : "Start"}
        >
          {(isProcessing || isWhisperTranscribing) ? (
            <Loader2 size={26} className="grove-spin" />
          ) : isRecording ? (
            <Square size={22} fill="currentColor" />
          ) : (
            <Mic size={28} />
          )}
        </button>

        {/* Action Caption / Live Timer */}
        <span style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ink-secondary)', fontWeight: 500, height: '16px' }}>
          {isRecording ? 'Tap square to finish & evaluate' : 'Tap to speak'}
        </span>
      </div>

    </div>
  );
};
