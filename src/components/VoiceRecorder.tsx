import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Square, Loader2, Volume2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Full unmount cleanup to prevent microphone track or audio context leaks
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (webRecognitionRef.current) {
        try { webRecognitionRef.current.stop(); } catch (e) {}
        webRecognitionRef.current = null;
      }
    };
  }, []);

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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      height: '100%', 
      width: '100%', 
      padding: '4px 16px 16px',
      boxSizing: 'border-box'
    }}>
      {/* Central Interactive Voice Hub */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        flex: 1,
        width: '100%',
        position: 'relative'
      }}>
        {/* Live Timer & Waveform Display */}
        <div style={{ 
          height: '46px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '6px',
          marginBottom: '16px'
        }}>
          {isRecording ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
            >
              {/* Left Waveform Bars */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '28px' }}>
                {audioLevels.slice(0, 3).map((lvl, i) => (
                  <motion.div 
                    key={`l-${i}`} 
                    animate={{ height: Math.max(4, Math.round(lvl * 28)) }}
                    transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                    style={{ 
                      width: '3.5px', 
                      borderRadius: '2px', 
                      backgroundColor: 'var(--error-brick)'
                    }} 
                  />
                ))}
              </div>

              {/* Stopwatch Counter */}
              <div style={{ 
                fontSize: '26px', 
                fontWeight: 700, 
                fontFamily: 'var(--font-mono)', 
                color: 'var(--error-brick)',
                letterSpacing: '0.04em'
              }}>
                {formatTime(elapsed)}
              </div>

              {/* Right Waveform Bars */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '28px' }}>
                {audioLevels.slice(2, 5).map((lvl, i) => (
                  <motion.div 
                    key={`r-${i}`} 
                    animate={{ height: Math.max(4, Math.round(lvl * 28)) }}
                    transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                    style={{ 
                      width: '3.5px', 
                      borderRadius: '2px', 
                      backgroundColor: 'var(--error-brick)'
                    }} 
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px', 
                fontWeight: 700, 
                color: 'var(--ink-secondary)',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)'
              }}
            >
              {(isProcessing || isWhisperTranscribing) ? (
                <>
                  <Loader2 size={12} className="grove-spin" color="var(--grove-moss)" />
                  <span style={{ color: 'var(--grove-moss)' }}>Analyzing Speech</span>
                </>
              ) : (
                <>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--grove-moss)' }} />
                  <span>Ready to Listen</span>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Primary Interactive Recording Button with Ambient Halo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer Ambient Ripple (Framer Motion) */}
          <motion.div 
            animate={isRecording ? {
              scale: [1, 1.28, 1],
              opacity: [0.45, 0.1, 0.45]
            } : {
              scale: [1, 1.08, 1],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{
              repeat: Infinity,
              duration: isRecording ? 1.6 : 3.4,
              ease: "easeInOut"
            }}
            style={{
              position: 'absolute',
              width: '144px',
              height: '144px',
              borderRadius: '50%',
              backgroundColor: isRecording ? 'rgba(178, 74, 60, 0.15)' : (isProcessing || isWhisperTranscribing) ? 'rgba(47, 75, 60, 0.12)' : 'rgba(47, 75, 60, 0.08)',
              border: isRecording ? '1.5px solid rgba(178, 74, 60, 0.3)' : (isProcessing || isWhisperTranscribing) ? '2px dashed var(--grove-moss)' : '1px solid var(--border-subtle)',
              pointerEvents: 'none'
            }}
          />

          {/* Secondary Harmonic Ripple during active recording */}
          {isRecording && (
            <motion.div 
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.02, 0.3]
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: "easeOut"
              }}
              style={{
                position: 'absolute',
                width: '144px',
                height: '144px',
                borderRadius: '50%',
                backgroundColor: 'rgba(178, 74, 60, 0.08)',
                pointerEvents: 'none'
              }}
            />
          )}

          {/* Core Tactile Touch Button */}
          <motion.button
            onClick={toggleRecording}
            disabled={isProcessing || isWhisperTranscribing}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            animate={!isRecording && !isProcessing && !isWhisperTranscribing ? {
              boxShadow: [
                '0 12px 32px rgba(47, 75, 60, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                '0 14px 38px rgba(47, 75, 60, 0.40), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                '0 12px 32px rgba(47, 75, 60, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
              ]
            } : {}}
            transition={{
              repeat: Infinity,
              duration: 3.2,
              ease: "easeInOut"
            }}
            style={{ 
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isRecording ? 'var(--error-brick)' : 'var(--grove-moss)',
              color: '#ffffff',
              border: 'none',
              cursor: (isProcessing || isWhisperTranscribing) ? 'not-allowed' : 'pointer',
              boxShadow: isRecording 
                ? '0 0 36px rgba(178, 74, 60, 0.55), 0 8px 24px rgba(178, 74, 60, 0.35)' 
                : '0 12px 32px rgba(47, 75, 60, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              transition: 'background-color 0.25s ease',
              outline: 'none',
              zIndex: 2,
              position: 'relative'
            }}
            aria-label={isRecording ? "Stop Recording" : "Start Recording"}
          >
            {(isProcessing || isWhisperTranscribing) ? (
              <Loader2 size={36} className="grove-spin" color="#ffffff" />
            ) : isRecording ? (
              <Square size={28} fill="#ffffff" color="#ffffff" />
            ) : (
              <Mic size={38} color="#ffffff" strokeWidth={2.2} />
            )}
          </motion.button>
        </div>

        {/* Action Caption / Guidance */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          {isRecording ? (
            <motion.div 
              initial={{ opacity: 0, y: 6 }} 
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(178, 74, 60, 0.09)',
                padding: '4px 12px',
                borderRadius: '100px'
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '4px', backgroundColor: 'var(--error-brick)', display: 'inline-block' }} className="animate-pulse" />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--error-brick)' }}>
                Recording Active · Tap when done
              </span>
            </motion.div>
          ) : (isProcessing || isWhisperTranscribing) ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '14px', fontWeight: 500, color: 'var(--grove-moss)', fontFamily: 'var(--font-display)' }}>
              Analyzing speech clarity & grammar...
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--ink-base)' }}>
                Tap to Speak
              </span>
              <span style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                Express your thoughts naturally in English
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Dynamic Speech Transcription / Prompt Card */}
      <motion.div 
        ref={transcriptScrollRef}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        style={{ 
          width: '100%', 
          maxWidth: '420px',
          minHeight: '88px',
          maxHeight: '120px',
          padding: '14px 18px', 
          borderRadius: '22px',
          backgroundColor: isRecording ? 'rgba(31, 122, 108, 0.05)' : 'var(--surface-raised)',
          border: isRecording ? '1.5px solid var(--grove-moss)' : '1px solid var(--border-subtle)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start', 
          justifyContent: transcription || error ? 'flex-start' : 'center',
          overflowY: 'auto',
          flexShrink: 0,
          boxSizing: 'border-box',
          WebkitOverflowScrolling: 'touch',
          transition: 'all 0.25s ease'
        }}
      >
        {error ? (
          <span style={{ color: 'var(--error-brick)', fontSize: '13.5px', fontWeight: 500, margin: 'auto 0' }}>{error}</span>
        ) : transcription ? (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grove-moss)', fontFamily: 'var(--font-display)' }}>
                Live Spoken Stream
              </span>
              <Volume2 size={13} color="var(--grove-moss)" className="animate-pulse" />
            </div>
            <p style={{ fontSize: '14.5px', color: 'var(--ink-base)', margin: 0, lineHeight: 1.5, fontStyle: 'italic', wordBreak: 'break-word', textAlign: 'left' }}>
              "{transcription}"
            </p>
          </div>
        ) : isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--grove-moss)', margin: 'auto 0' }}>
            <Volume2 size={18} className="animate-pulse" />
            <span style={{ fontSize: '14.5px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Listening to your voice...</span>
          </div>
        ) : isWhisperTranscribing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--grove-moss)', margin: 'auto 0' }}>
            <Sparkles size={16} className="grove-spin" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Transcribing with Whisper AI...</span>
          </div>
        ) : isProcessing ? (
          <span style={{ fontSize: '14px', color: 'var(--grove-moss)', fontWeight: 600, margin: 'auto 0' }}>
            Evaluating pronunciation, grammar & flow...
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', textAlign: 'left', width: '100%', margin: 'auto 0' }}>
            <Sparkles size={16} color="var(--grove-moss)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grove-moss)', marginBottom: '3px', fontFamily: 'var(--font-display)' }}>
                {activePrompt ? 'Speaking Prompt' : 'Free Speaking Mode'}
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '14.5px', color: 'var(--ink-base)', lineHeight: 1.45 }}>
                {activePrompt ? `"${activePrompt}"` : "Share a thought, describe your day, or explain an idea freely."}
              </div>
            </div>
          </div>
        )}
      </motion.div>

    </div>
  );
};
