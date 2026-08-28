import { TopicSuggestion, AISpeechEvaluation, UserContext } from '../types/user';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_TOPICS: TopicSuggestion[] = [
  {
    id: 'topic-1',
    title: 'Introduce Yourself & Ambitions',
    description: 'Share your background, current focus, and what you hope to achieve next.',
    category: 'Career & Ambition',
    starterPrompt: 'Hi there! Tell me a bit about yourself, what you are working on, and where you want to be in the next few years.',
    emoji: '💼'
  },
  {
    id: 'topic-2',
    title: 'How AI is Changing the World',
    description: 'Discuss how artificial intelligence is transforming daily life and work.',
    category: 'Tech & Trends',
    starterPrompt: 'How do you think AI and modern technology will impact your daily work and future career?',
    emoji: '🤖'
  },
  {
    id: 'topic-3',
    title: 'A Memorable Life Experience',
    description: 'Talk about a challenge you overcame or a trip that broadened your perspective.',
    category: 'Life & Stories',
    starterPrompt: 'Could you share an unforgettable experience or challenge that taught you something valuable?',
    emoji: '🌱'
  }
];

export function getUserContext(): UserContext | null {
  try {
    const raw = localStorage.getItem('grove_user_context');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading user context", e);
  }
  return null;
}

/**
 * Calculate speaking rate (Words Per Minute) and detect filler words
 */
export function calculateSpeakingMetrics(text: string, durationSeconds: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minutes = Math.max(durationSeconds / 60, 0.08);
  const wpm = Math.round(wordCount / minutes);

  const fillerRegex = /\b(um|uh|er|ah|like|you know|basically|actually|literally|sort of|kind of)\b/gi;
  const matches = text.match(fillerRegex) || [];
  const fillerWords = matches.map(m => m.toLowerCase());

  let pacingNote = 'Optimal Pace';
  if (wpm < 110) pacingNote = 'Deliberate / Slow';
  else if (wpm > 165) pacingNote = 'Fast / Hurried';
  else pacingNote = 'Natural & Fluid';

  return { wpm, fillerWords, pacingNote };
}

/**
 * Transcribe audio blob with Groq Whisper Large V3 Turbo (high precision, sub-300ms)
 */
export async function transcribeAudioWithWhisper(audioBlob: Blob): Promise<string | null> {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!groqKey) {
    return null;
  }

  try {
    const formData = new FormData();
    const mimeType = audioBlob.type || 'audio/webm';
    let filename = 'recording.webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      filename = 'recording.m4a';
    } else if (mimeType.includes('wav')) {
      filename = 'recording.wav';
    } else if (mimeType.includes('ogg')) {
      filename = 'recording.ogg';
    }

    formData.append('file', audioBlob, filename);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');
    formData.append('response_format', 'json');
    formData.append('temperature', '0.0');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`
      },
      body: formData
    });

    if (!response.ok) {
      console.warn(`Groq Whisper error ${response.status}:`, await response.text());
      return null;
    }

    const data = await response.json();
    if (data && typeof data.text === 'string' && data.text.trim()) {
      return data.text.trim();
    }
    return null;
  } catch (err) {
    console.warn("Error transcribing with Groq Whisper:", err);
    return null;
  }
}

/**
 * Generate 3 personalized speaking topics using Groq (Llama 3.3 70B) or Gemini
 */
export async function generatePersonalizedTopics(
  userContext?: UserContext | null
): Promise<TopicSuggestion[]> {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    return DEFAULT_TOPICS;
  }

  const ctx = userContext || getUserContext();
  const goal = ctx?.goal || 'Job Interviews & Career';
  const level = ctx?.level || 'Intermediate';
  const interests = ctx?.interests?.join(', ') || 'Technology, Startups, Daily Life';
  const tone = ctx?.speakingTone || 'Professional & Articulate';

  const prompt = `You are Articulate, a warm, elite English speaking mentor.
Generate 3 distinct, stimulating speaking topics specifically for a student practicing English:
- Speaking Goal: "${goal}"
- Current Proficiency Level: "${level}"
- Personal Interests: "${interests}"
- Desired Speaking Tone: "${tone}"

Return STRICTLY a JSON object with a "topics" array containing 3 objects with this exact structure:
{
  "topics": [
    {
      "id": "topic-1",
      "title": "Short punchy topic title (max 5 words)",
      "description": "1 clear sentence explaining what to discuss",
      "category": "1-2 word category (e.g. Job Interview, Tech & AI, Daily Life)",
      "starterPrompt": "A natural, open-ended question the AI coach asks to start the conversation",
      "emoji": "Relevant emoji"
    }
  ]
}`;

  try {
    if (groqKey) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);
        const list = Array.isArray(content) ? content : content.topics || content.items;
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    }

    if (geminiKey) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : parsed.topics || parsed.items;
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    }

    return DEFAULT_TOPICS;
  } catch (err) {
    console.error("Error generating topics:", err);
    return DEFAULT_TOPICS;
  }
}

/**
 * Process spoken transcript and evaluate speech with enhanced human-like coaching
 */
export async function processSpeechWithAI(
  transcribedText: string, 
  history: Message[],
  activeTopic?: TopicSuggestion | null,
  durationSeconds: number = 30
): Promise<{ evaluation: AISpeechEvaluation; newHistory: Message[] }> {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

  const metrics = calculateSpeakingMetrics(transcribedText, durationSeconds);

  const ctx = getUserContext();
  const goal = ctx?.goal || 'General Speaking Fluency';
  const level = ctx?.level || 'Intermediate';
  const interests = ctx?.interests?.join(', ') || 'General Knowledge';
  const feedbackStyle = ctx?.feedbackStyle || 'balanced';
  const tone = ctx?.speakingTone || 'Professional & Articulate';

  const styleInstruction = feedbackStyle === 'strict'
    ? 'CRITIQUE RIGOR: STRICT. Zero sugarcoating. Analyze with exceptional linguistic precision. Catch subtle grammar flaws, awkward preposition usage, filler words, and informal register.'
    : feedbackStyle === 'gentle'
    ? 'CRITIQUE RIGOR: GENTLE & ENCOURAGING. Emphasize confidence, flow, and communication intent. Only correct 1-2 major grammatical issues.'
    : 'CRITIQUE RIGOR: BALANCED & ACTIONABLE. Acknowledge great communicative flow while directly showing 1-2 precise grammatical/idiomatic upgrades.';

  const topicContext = activeTopic ? `Current Session Topic: "${activeTopic.title}". Prompt was: "${activeTopic.starterPrompt}"` : 'Free speaking session.';

  const systemPrompt = `You are Articulate, an elite, highly empathetic AI English speaking coach and conversational partner.
${topicContext}

STUDENT PROFILE:
- Target Goal: "${goal}"
- Proficiency Level: "${level}"
- Interests: "${interests}"
- Desired Tone/Register: "${tone}"
- ${styleInstruction}

STUDENT SPOKE:
"${transcribedText}"

COACHING MANDATE:
1. APPRECIATION & VALUE: Genuinely acknowledge the core idea they communicated and validate their point.
2. CRITICAL LINGUISTIC UPGRADES: Identify awkward prepositions, grammatical tenses, sentence transitions, or word choices. Provide natural, native-level phrasing with clear rationales.
3. CONVERSATIONAL REPLY & ACTIVE LISTENING: Reply naturally to what they actually said with warmth, and ask 1 engaging, insightful follow-up question to keep the conversation flowing.

Respond STRICTLY in JSON format matching this schema:
{
  "overallScore": 82, // Integer 0-100 reflecting grammar, fluency, vocabulary, and communication clarity
  "scores": {
    "fluency": 8,     // Integer 1-10 (flow, coherence, naturalness)
    "grammar": 7,     // Integer 1-10 (tense accuracy, prepositions, agreement)
    "vocabulary": 8,  // Integer 1-10 (word variety and contextual precision)
    "confidence": 8   // Integer 1-10 (assertiveness, direct expression)
  },
  "feedback": "2 concise sentences: first validate what was expressed clearly, second provide the single most important linguistic upgrade.",
  "corrections": [
    {
      "original": "Exact phrase from student's speech with mistake or clumsy wording",
      "better": "Native, polished phrasing",
      "reason": "Clear linguistic explanation of why this upgrade sounds more natural"
    }
  ],
  "reply": "A warm, natural 2-sentence conversational response answering their point and asking a thoughtful follow-up question."
}`;

  const userMessage: Message = { role: 'user', content: transcribedText };
  const currentHistory = [...history, userMessage];

  try {
    let evaluation: AISpeechEvaluation | null = null;

    if (groqKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              ...currentHistory
            ],
            response_format: { type: 'json_object' },
            temperature: 0.35
          })
        });

        if (response.ok) {
          const data = await response.json();
          evaluation = JSON.parse(data.choices[0].message.content);
        }
      } catch (groqErr) {
        console.warn("Groq request fallback:", groqErr);
      }
    }

    if (!evaluation && geminiKey) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const contentText = data.candidates[0].content.parts[0].text;
        evaluation = JSON.parse(contentText);
      }
    }

    if (!evaluation && deepseekKey) {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'system', content: systemPrompt }, ...currentHistory],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        evaluation = JSON.parse(data.choices[0].message.content);
      }
    }

    if (!evaluation) {
      throw new Error("No AI response generated.");
    }

    // Attach calculated speaking metrics
    evaluation.wpm = metrics.wpm;
    evaluation.fillerWords = metrics.fillerWords;
    evaluation.pacingNote = metrics.pacingNote;

    const aiMessage: Message = { role: 'assistant', content: JSON.stringify(evaluation) };
    return {
      evaluation,
      newHistory: [...currentHistory, aiMessage]
    };
  } catch (error: any) {
    console.error("Error communicating with AI Coach:", error);
    
    const fallbackEval: AISpeechEvaluation = {
      overallScore: 78,
      scores: { fluency: 7, grammar: 7, vocabulary: 8, confidence: 8 },
      feedback: "Great clarity and expression! Focus on polish and preposition accuracy to reach native fluency.",
      corrections: [
        {
          original: transcribedText.length > 30 ? transcribedText.slice(0, 30) + '...' : transcribedText,
          better: "Ensure complete clauses with precise tenses and transition words.",
          reason: "Focus on subject-verb agreement and professional phrasing."
        }
      ],
      reply: "Thank you for sharing your thoughts! How did you first get interested in this area?",
      wpm: metrics.wpm,
      fillerWords: metrics.fillerWords,
      pacingNote: metrics.pacingNote
    };

    return {
      evaluation: fallbackEval,
      newHistory: history
    };
  }
}
