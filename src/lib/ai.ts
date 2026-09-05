import { TopicSuggestion, AISpeechEvaluation, UserContext } from '../types/user';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const GROQ_CHAT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'];
const GEMINI_CHAT_MODELS = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-flash-latest'];

const CONTEXT_FALLBACK_TOPICS: Record<string, TopicSuggestion[]> = {
  interview: [
    {
      id: 'int-1',
      title: 'Handling Unexpected Pressure',
      description: 'Describe a high-stakes moment at work where priorities shifted rapidly.',
      category: 'Job Interviews',
      starterPrompt: 'Tell me about a time when you had to manage unexpected workplace pressure or tight deadlines. How did you adapt your strategy?',
      emoji: '💼'
    },
    {
      id: 'int-2',
      title: 'Navigating Team Conflict',
      description: 'Explain your approach to resolving disagreements with colleagues professionally.',
      category: 'Job Interviews',
      starterPrompt: 'Could you share an example of a disagreement with a team member or manager, and how you worked together toward a constructive resolution?',
      emoji: '🤝'
    },
    {
      id: 'int-3',
      title: 'Architecting a Complex Solution',
      description: 'Explain a technical or operational challenge you designed a solution for.',
      category: 'Technical & Career',
      starterPrompt: 'Walk me through a project or technical achievement where you took the lead from problem definition to execution.',
      emoji: '🚀'
    },
    {
      id: 'int-4',
      title: 'Your 5-Year Impact Vision',
      description: 'Articulate your trajectory, ambition, and industry perspective.',
      category: 'Career Vision',
      starterPrompt: 'Where do you see your industry evolving over the next few years, and what role do you plan to play in shaping it?',
      emoji: '🎯'
    }
  ],
  tech: [
    {
      id: 'tech-1',
      title: 'Generative AI in Daily Workflows',
      description: 'Analyze the balance between AI automation and human creativity.',
      category: 'Tech & AI',
      starterPrompt: 'How has generative AI changed the way you solve problems or learn new skills in your daily life?',
      emoji: '🤖'
    },
    {
      id: 'tech-2',
      title: 'The Future of Autonomous Agents',
      description: 'Debate how autonomous agents will interact with human teams.',
      category: 'Tech & AI',
      starterPrompt: 'If autonomous software agents could handle 50% of routine knowledge work, what new skills should professionals focus on developing?',
      emoji: '⚡'
    },
    {
      id: 'tech-3',
      title: 'Privacy in an Hyper-Connected Era',
      description: 'Discuss data ethics, privacy trade-offs, and emerging tech standards.',
      category: 'Tech & Society',
      starterPrompt: 'What do you think is the biggest ethical challenge facing the tech industry today, and how should we address it?',
      emoji: '🔒'
    }
  ],
  startups: [
    {
      id: 'startup-1',
      title: 'Finding Product-Market Fit',
      description: 'Discuss the crucial indicators that a product truly solves a market need.',
      category: 'Startups & Business',
      starterPrompt: 'In your view, what is the most common mistake early-stage startups make when trying to find product-market fit?',
      emoji: '📈'
    },
    {
      id: 'startup-2',
      title: 'Disrupting Traditional Markets',
      description: 'Examine a legacy industry that is ripe for disruption.',
      category: 'Business Strategy',
      starterPrompt: 'If you had the resources to build any startup tomorrow, which industry would you disrupt first and why?',
      emoji: '💡'
    }
  ],
  casual: [
    {
      id: 'cas-1',
      title: 'A Perspective-Shifting Habit',
      description: 'Reflect on a daily ritual that significantly improves your focus or mindset.',
      category: 'Daily Life',
      starterPrompt: 'What is one micro-habit or routine you adopted that has had a surprisingly large positive impact on your life?',
      emoji: '☕'
    },
    {
      id: 'cas-2',
      title: 'A Story Behind a Favorite Book/Movie',
      description: 'Share a narrative that changed the way you think about people or society.',
      category: 'Culture & Stories',
      starterPrompt: 'What is a book, film, or piece of art that genuinely altered your perspective on something important?',
      emoji: '🎬'
    },
    {
      id: 'cas-3',
      title: 'Travel Moments of Wonder',
      description: 'Describe an encounter or landscape that took your breath away.',
      category: 'Travel & Culture',
      starterPrompt: 'Can you describe a place you visited or an encounter while traveling that completely surprised your expectations?',
      emoji: '🌍'
    }
  ]
};

function getFallbackTopicList(userContext?: UserContext | null): TopicSuggestion[] {
  const ctx = userContext || getUserContext();
  const goalLower = (ctx?.goal || '').toLowerCase();
  const interests = (ctx?.interests || []).map(i => i.toLowerCase());

  const pool: TopicSuggestion[] = [];
  if (goalLower.includes('interview') || goalLower.includes('career')) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.interview);
  }
  if (interests.some(i => i.includes('tech') || i.includes('ai'))) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.tech);
  }
  if (interests.some(i => i.includes('startup') || i.includes('business'))) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.startups);
  }
  pool.push(...CONTEXT_FALLBACK_TOPICS.casual);

  // Shuffle the pool
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

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

export function safeParseJson<T = any>(raw: string | undefined | null): T | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const cleaned = trimmed.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const startObj = cleaned.indexOf('{');
      const endObj = cleaned.lastIndexOf('}');
      if (startObj !== -1 && endObj > startObj) {
        try {
          return JSON.parse(cleaned.substring(startObj, endObj + 1));
        } catch {}
      }
      const startArr = cleaned.indexOf('[');
      const endArr = cleaned.lastIndexOf(']');
      if (startArr !== -1 && endArr > startArr) {
        try {
          return JSON.parse(cleaned.substring(startArr, endArr + 1));
        } catch {}
      }
      return null;
    }
  }
}

export function sanitizePromptText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/`/g, "'")
    .trim();
}

/**
 * Detect if text represents authentic, evaluatable human speech
 * Filters out:
 * - Empty or whitespace-only inputs
 * - Whisper silence hallucinations ("Thank you.", "Thanks for watching", etc.)
 * - Isolated filler words ("um", "uh", "okay", "yeah")
 * - Audio bracket tokens ([music], [silence], etc.)
 * - Inputs with fewer than 3 words or only 1 distinct word repeated
 */
export function isMeaningfulSpeech(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;

  // 1. Remove bracketed audio tags (e.g., [music], [applause], [silence], (bell), etc.)
  const stripped = text
    .replace(/[\[\({].*?[\]\)}]/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’“”…–—\\]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped || stripped.length < 2) return false;

  // 2. Known Whisper silence hallucinations and background noise artifacts
  const SILENCE_HALLUCINATIONS = new Set([
    'thank you',
    'thank you so much',
    'thank you very much',
    'thank you for watching',
    'thanks for watching',
    'thanks for watching and subscribing',
    'thank you bye',
    'thanks bye',
    'thank you all',
    'thank you everyone',
    'thanks for listening',
    'thank you for listening',
    'thanks',
    'bye',
    'bye bye',
    'goodbye',
    'please subscribe',
    'subscribe',
    'like and subscribe',
    'subtitles by',
    'translated by',
    'amara org',
    'you',
    'okay',
    'ok',
    'yes',
    'no',
    'yeah',
    'yep',
    'nope',
    'hello',
    'hi',
    'hey',
    'so',
    'uh',
    'um',
    'ah',
    'er',
    'mm',
    'hmm',
    'huh',
    'silence',
    'music',
    'applause',
    'laughter',
    'cheering',
    'the end'
  ]);

  if (SILENCE_HALLUCINATIONS.has(stripped)) {
    return false;
  }

  // 3. Count meaningful words (exclude pure filler grunts)
  const words = stripped.split(' ').filter(Boolean);
  const FILLERS = new Set(['um', 'uh', 'er', 'ah', 'mm', 'hmm', 'huh', 'like', 'you', 'so', 'ok', 'okay', 'yeah', 'yep']);
  const nonFillerWords = words.filter(w => !FILLERS.has(w));

  // Must have at least 3 words total AND at least 2 non-filler meaningful words
  if (words.length < 3 || nonFillerWords.length < 2) {
    return false;
  }

  // 4. Reject single-word repetition (e.g., "you you you", "thank thank thank")
  const uniqueWords = new Set(words);
  if (uniqueWords.size === 1) {
    return false;
  }

  return true;
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
    if (data && typeof data.text === 'string') {
      const trimmed = data.text.trim();
      if (isMeaningfulSpeech(trimmed)) {
        return trimmed;
      }
    }
    return null;
  } catch (err) {
    console.warn("Error transcribing with Groq Whisper:", err);
    return null;
  }
}

/**
 * Generate 5 novel, highly personalized speaking topics tailored directly to the user's context
 */
export async function generatePersonalizedTopics(
  userContext?: UserContext | null,
  excludeTitles: string[] = []
): Promise<TopicSuggestion[]> {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const ctx = userContext || getUserContext();
  const goal = ctx?.goal || 'Job Interviews & Career';
  const level = ctx?.level || 'Intermediate';
  const interests = (ctx?.interests && ctx.interests.length > 0) ? ctx.interests.join(', ') : 'Technology, Business & Startups, Daily Life';
  const tone = ctx?.speakingTone || 'Professional & Articulate';

  const excludeClause = excludeTitles.length > 0
    ? `IMPORTANT: Do NOT generate any of these already seen topics: ${JSON.stringify(excludeTitles)}.`
    : '';

  const prompt = `You are Articulate, an elite, creative English speaking coach.
Generate 5 completely fresh, highly stimulating, and diverse speaking topics specifically customized for this student:
- Main Speaking Goal: "${goal}"
- English Proficiency Level: "${level}"
- Passions & Interests: "${interests}"
- Desired Speaking Style: "${tone}"
- Randomization seed: ${Date.now()}-${Math.floor(Math.random() * 10000)}
${excludeClause}

GUIDELINES FOR INTRIGUING TOPICS:
1. Make them provocative, conversational, and directly applicable to their goal ("${goal}").
2. Include varied formats: an interview behavioral scenario, a future trend prediction, a critical decision dilemma, a startup pitch simulation, and a philosophical reflection.
3. The "starterPrompt" MUST sound like a warm, supportive human coach asking an insightful question that invites an extended, fluent response.

Return STRICTLY a JSON object matching this schema:
{
  "topics": [
    {
      "id": "topic-unique-${Date.now()}-1",
      "title": "Concise Engaging Title (max 5 words)",
      "description": "1 engaging sentence describing the focus of the speaking topic",
      "category": "Category tag matching their interest or goal",
      "starterPrompt": "A warm, natural question from the AI mentor to begin speaking",
      "emoji": "Relevant icon emoji"
    }
  ]
}`;

  // 1. Try Groq with working chat models
  if (groqKey) {
    for (const model of GROQ_CHAT_MODELS) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.95
          })
        });

        if (response.ok) {
          const data = await response.json();
          const raw = safeParseJson<any>(data.choices?.[0]?.message?.content);
          const list = Array.isArray(raw) ? raw : (raw?.topics || raw?.items || raw?.suggestions);
          if (Array.isArray(list) && list.length > 0) {
            return list.map((item, idx) => ({
              id: item.id || `gen-${Date.now()}-${idx}`,
              title: item.title || `Speaking Topic ${idx + 1}`,
              description: item.description || '',
              category: item.category || 'Speaking Practice',
              starterPrompt: item.starterPrompt || item.prompt || 'Share your thoughts on this topic.',
              emoji: item.emoji || '🎙️'
            }));
          }
        }
      } catch (groqErr) {
        console.warn(`Groq model ${model} attempt failed:`, groqErr);
      }
    }
  }

  // 2. Try Gemini with working models
  if (geminiKey) {
    for (const model of GEMINI_CHAT_MODELS) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.95 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const raw = safeParseJson<any>(text);
            const list = Array.isArray(raw) ? raw : (raw?.topics || raw?.items || raw?.suggestions);
            if (Array.isArray(list) && list.length > 0) {
              return list.map((item, idx) => ({
                id: item.id || `gem-${Date.now()}-${idx}`,
                title: item.title || `Speaking Topic ${idx + 1}`,
                description: item.description || '',
                category: item.category || 'Speaking Practice',
                starterPrompt: item.starterPrompt || item.prompt || 'Share your thoughts on this topic.',
                emoji: item.emoji || '🎙️'
              }));
            }
          }
        }
      } catch (geminiErr) {
        console.warn(`Gemini model ${model} attempt failed:`, geminiErr);
      }
    }
  }

  return getFallbackTopicList(ctx);
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
  if (!isMeaningfulSpeech(transcribedText)) {
    throw new Error("INSUFFICIENT_SPEECH");
  }

  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

  const cleanTranscript = sanitizePromptText(transcribedText);
  const metrics = calculateSpeakingMetrics(cleanTranscript, durationSeconds);

  const ctx = getUserContext();
  const goal = sanitizePromptText(ctx?.goal || 'General Speaking Fluency');
  const level = sanitizePromptText(ctx?.level || 'Intermediate');
  const interests = sanitizePromptText((ctx?.interests && ctx.interests.length > 0) ? ctx.interests.join(', ') : 'General Knowledge');
  const feedbackStyle = ctx?.feedbackStyle || 'balanced';
  const tone = sanitizePromptText(ctx?.speakingTone || 'Professional & Articulate');

  const styleInstruction = feedbackStyle === 'strict'
    ? 'CRITIQUE RIGOR: STRICT. Zero sugarcoating. Analyze with exceptional linguistic precision. Catch subtle grammar flaws, awkward preposition usage, filler words, and informal register.'
    : feedbackStyle === 'gentle'
    ? 'CRITIQUE RIGOR: GENTLE & ENCOURAGING. Emphasize confidence, flow, and communication intent. Only correct 1-2 major grammatical issues.'
    : 'CRITIQUE RIGOR: BALANCED & ACTIONABLE. Acknowledge great communicative flow while directly showing 1-2 precise grammatical/idiomatic upgrades.';

  const topicContext = activeTopic 
    ? `Current Session Topic: "${sanitizePromptText(activeTopic.title)}". Prompt was: "${sanitizePromptText(activeTopic.starterPrompt)}"` 
    : 'Free speaking session.';

  const systemPrompt = `You are Articulate, an elite, highly empathetic AI English speaking coach.
${topicContext}

STUDENT PROFILE:
- Target Goal: "${goal}"
- Proficiency Level: "${level}"
- Interests: "${interests}"
- Desired Tone/Register: "${tone}"
- ${styleInstruction}

STUDENT SPOKE:
"${cleanTranscript}"

COACHING MANDATE:
1. KEY TAKEAWAYS (IN POINTS): Provide exactly 2 short, crisp bullet points. No long paragraphs.
   - Point 1: Validate communication clarity and strong expression.
   - Point 2: Specific high-impact tip on phrasing, vocabulary, or grammar.
2. LINGUISTIC PRECISION UPGRADES: Provide 1-2 native phrasing improvements with clear rationales.
3. CONVERSATIONAL FOLLOW-UP: 1 natural, thought-provoking question to prompt the next practice thought.

Respond STRICTLY in JSON format matching this schema:
{
  "overallScore": 82, // Integer 0-100 reflecting grammar, fluency, vocabulary, and communication clarity
  "scores": {
    "fluency": 8,     // Integer 1-10 (flow, coherence, naturalness)
    "grammar": 7,     // Integer 1-10 (tense accuracy, prepositions, agreement)
    "vocabulary": 8,  // Integer 1-10 (word variety and contextual precision)
    "confidence": 8   // Integer 1-10 (assertiveness, direct expression)
  },
  "keyPoints": [
    "Short punchy strength or observation (max 15 words)",
    "Short punchy actionable refinement tip (max 15 words)"
  ],
  "corrections": [
    {
      "original": "Exact phrase from student's speech with mistake or clumsy wording",
      "better": "Native, polished phrasing",
      "reason": "Clear linguistic explanation of why this upgrade sounds more natural"
    }
  ],
  "followUpQuestion": "A warm, engaging 1-sentence follow-up question to practice next."
}`;

  const userMessage: Message = { role: 'user', content: transcribedText };
  const currentHistory = [...history, userMessage];

  try {
    let evaluation: AISpeechEvaluation | null = null;

    // 1. Try Groq models
    if (groqKey) {
      for (const model of GROQ_CHAT_MODELS) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify({
              model,
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
            const content = data.choices?.[0]?.message?.content;
            evaluation = safeParseJson<AISpeechEvaluation>(content);
            if (evaluation && evaluation.overallScore) {
              break;
            }
          }
        } catch (groqErr) {
          console.warn(`Groq evaluation with ${model} failed:`, groqErr);
        }
      }
    }

    // 2. Try Gemini models
    if (!evaluation && geminiKey) {
      for (const model of GEMINI_CHAT_MODELS) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (contentText) {
              evaluation = safeParseJson<AISpeechEvaluation>(contentText);
              if (evaluation && evaluation.overallScore) {
                break;
              }
            }
          }
        } catch (geminiErr) {
          console.warn(`Gemini evaluation with ${model} failed:`, geminiErr);
        }
      }
    }

    // 3. Try DeepSeek fallback
    if (!evaluation && deepseekKey) {
      try {
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
          evaluation = safeParseJson<AISpeechEvaluation>(data.choices?.[0]?.message?.content);
        }
      } catch (dsErr) {
        console.warn("DeepSeek evaluation failed:", dsErr);
      }
    }

    if (!evaluation) {
      throw new Error("No AI response generated.");
    }

    // Ensure keyPoints are cleanly formatted points
    if (!evaluation.keyPoints || !Array.isArray(evaluation.keyPoints) || evaluation.keyPoints.length === 0) {
      if (evaluation.feedback) {
        evaluation.keyPoints = evaluation.feedback
          .split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(s => s.length > 5);
      } else {
        evaluation.keyPoints = [
          "Good communicative clarity and logical structure.",
          "Continue refining natural transitions and preposition precision."
        ];
      }
    }
    if (!evaluation.feedback) {
      evaluation.feedback = evaluation.keyPoints.join(' ');
    }
    if (!evaluation.followUpQuestion) {
      evaluation.followUpQuestion = evaluation.reply || "What is your main takeaway from this experience?";
    }
    if (!evaluation.reply) {
      evaluation.reply = evaluation.followUpQuestion;
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
    throw error;
  }
}

