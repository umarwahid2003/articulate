import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpeechRecognition as CapacitorSpeech } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';
import { transcribeAudioWithWhisper, isMeaningfulSpeech } from '../lib/ai';

interface VoiceRecorderProps {
  onTranscriptionComplete?: (text: string, durationSeconds: number) => void;
  onRecordingStart?: () => void;
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
  onRecordingStart,
  isProcessing = false,
  activePrompt
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isWhisperTranscribing, setIsWhisperTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [audioLevels, setAudioLevels] = useState<number[]>([0.15, 0.2, 0.3, 0.2, 0.15]);
  
  const hasAudibleVoiceRef = useRef<boolean>(false);
  
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

        // Acoustic energy calculation: check if voice exceeded ambient silence floor
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avgEnergy = sum / (bufferLength * 255);
        if (avgEnergy > 0.04) {
          hasAudibleVoiceRef.current = true;
        }

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
    
    // 1. Stop Web Speech Recognition safely without re-triggering onend
    if (webRecognitionRef.current) {
      const rec = webRecognitionRef.current;
      webRecognitionRef.current = null;
      try {
        rec.onend = null;
        rec.stop();
      } catch (e) {}
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
    if (recordedBlob && recordedBlob.size > 1500 && hasAudibleVoiceRef.current) {
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
    const detectedAcousticSound = audioContextRef.current ? hasAudibleVoiceRef.current : true;

    // STRICT VALIDATION: Must have acoustic sound AND meaningful spoken words
    if (!detectedAcousticSound || !isMeaningfulSpeech(finalText)) {
      setIsWhisperTranscribing(false);
      setTranscription('');
      transcriptionRef.current = '';
      setError("No speech detected. Try again.");
      return;
    }

    if (onTranscriptionComplete && finalText) {
      onTranscriptionComplete(finalText, recordedSeconds);
    }
  }, [onTranscriptionComplete]);

  const startRecording = async () => {
    setError(null);
    setTranscription('');
    transcriptionRef.current = '';
    accumulatedFinalRef.current = '';
    currentSessionFinalRef.current = '';
    audioChunksRef.current = [];
    hasAudibleVoiceRef.current = false;
    onRecordingStart?.();
    
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

  const isBusy = isProcessing || isWhisperTranscribing;

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
      {/* Central Voice Hub */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        flex: 1,
        width: '100%',
        position: 'relative'
      }}>
        {/* Status — timer when recording, nothing when idle */}
        <div style={{ 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: '16px'
        }}>
          {isRecording ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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
                      width: '3px', 
                      borderRadius: '2px', 
                      backgroundColor: 'var(--error-brick)'
                    }} 
                  />
                ))}
              </div>

              {/* Timer */}
              <div style={{ 
                fontSize: '24px', 
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
                      width: '3px', 
                      borderRadius: '2px', 
                      backgroundColor: 'var(--error-brick)'
                    }} 
                  />
                ))}
              </div>
            </motion.div>
          ) : isBusy ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px', 
                color: 'var(--grove-moss)',
                fontFamily: 'var(--font-body)'
              }}
            >
              <Loader2 size={13} className="grove-spin" />
              <span>Analyzing...</span>
            </motion.div>
          ) : null}
        </div>

        {/* Mic Button with single breathing halo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Single ambient halo */}
          <motion.div 
            animate={isRecording ? {
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.1, 0.4]
            } : isBusy ? {
              scale: 1,
              opacity: 0.15
            } : {
              scale: [1, 1.06, 1],
              opacity: [0.15, 0.35, 0.15]
            }}
            transition={{
              repeat: Infinity,
              duration: isRecording ? 1.6 : 3.4,
              ease: "easeInOut"
            }}
            style={{
              position: 'absolute',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              backgroundColor: isRecording ? 'rgba(178, 74, 60, 0.12)' : 'rgba(47, 75, 60, 0.06)',
              pointerEvents: 'none'
            }}
          />

          {/* Mic button */}
          <motion.button
            onClick={toggleRecording}
            disabled={isBusy}
            whileTap={{ scale: 0.94 }}
            style={{ 
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isRecording ? 'var(--error-brick)' : 'var(--grove-moss)',
              color: '#ffffff',
              border: 'none',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              boxShadow: isRecording 
                ? '0 0 28px rgba(178, 74, 60, 0.4)' 
                : '0 8px 24px rgba(47, 75, 60, 0.2)',
              transition: 'background-color 0.25s ease, box-shadow 0.25s ease',
              outline: 'none',
              zIndex: 2,
              position: 'relative'
            }}
            aria-label={isRecording ? "Stop Recording" : "Start Recording"}
          >
            {isBusy ? (
              <Loader2 size={34} className="grove-spin" color="#ffffff" />
            ) : isRecording ? (
              <Square size={26} fill="#ffffff" color="#ffffff" />
            ) : (
              <Mic size={36} color="#ffffff" strokeWidth={2} />
            )}
          </motion.button>
        </div>

        {/* Caption */}
        <div style={{ marginTop: '18px', textAlign: 'center' }}>
          {isRecording ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ 
                fontSize: '14px', 
                color: 'var(--error-brick)', 
                fontWeight: 500,
                fontFamily: 'var(--font-body)'
              }}
            >
              Tap to stop
            </motion.span>
          ) : !isBusy ? (
            <motion.span 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              style={{ 
                fontSize: '15px', 
                color: 'var(--ink-secondary)',
                fontFamily: 'var(--font-body)'
              }}
            >
              Tap to speak
            </motion.span>
          ) : null}
        </div>
      </div>

      {/* Transcript / Prompt area */}
      <motion.div 
        ref={transcriptScrollRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ 
          width: '100%', 
          maxWidth: '420px',
          minHeight: '80px',
          maxHeight: '110px',
          padding: '14px 16px', 
          borderRadius: '16px',
          backgroundColor: 'var(--surface-raised)',
          border: '1px solid var(--border-subtle)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start', 
          justifyContent: transcription || error ? 'flex-start' : 'center',
          overflowY: 'auto',
          flexShrink: 0,
          boxSizing: 'border-box',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {error ? (
          <span style={{ color: 'var(--error-brick)', fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-body)', margin: 'auto 0' }}>{error}</span>
        ) : transcription ? (
          <p style={{ fontSize: '14px', color: 'var(--ink-base)', margin: 0, lineHeight: 1.55, fontFamily: 'var(--font-body)', fontStyle: 'italic', wordBreak: 'break-word', textAlign: 'left' }}>
            "{transcription}"
          </p>
        ) : isRecording ? (
          <span style={{ fontSize: '14px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-body)', margin: 'auto 0' }}>
            Listening...
          </span>
        ) : isBusy ? (
          <span style={{ fontSize: '14px', color: 'var(--grove-moss)', fontFamily: 'var(--font-body)', margin: 'auto 0' }}>
            Analyzing...
          </span>
        ) : (
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '14px', color: 'var(--ink-secondary)', lineHeight: 1.5, margin: 'auto 0' }}>
            {activePrompt ? `"${activePrompt}"` : "Say anything that comes to mind."}
          </div>
        )}
      </motion.div>

    </div>
  );
};
