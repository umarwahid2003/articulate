import { TopicSuggestion, AISpeechEvaluation, UserContext } from '../types/user';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const GROQ_CHAT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
const GEMINI_CHAT_MODELS = ['gemini-3.6-flash', 'gemini-3-flash-preview'];

export function cleanNoEmoji(str?: string): string {
  if (!str) return '';
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, '').replace(/\s+/g, ' ').trim();
}

const CONTEXT_FALLBACK_TOPICS: Record<string, TopicSuggestion[]> = {
  interview_career: [
    {
      id: 'fb-int-1',
      title: 'Handling Unexpected Pressure',
      description: 'Describe a high-stakes moment where priorities shifted rapidly and deadlines loomed.',
      category: 'Job Interviews',
      archetype: 'roleplay',
      starterPrompt: 'Imagine your interviewer asks: "Can you tell me about a time when an unexpected crisis hit your team with tight deadlines? Walk me through how you prioritized your response and kept your composure."',
      emoji: '💼'
    },
    {
      id: 'fb-int-2',
      title: 'Navigating Cross-Functional Conflict',
      description: 'Explain your approach to resolving disagreements with strong-willed colleagues.',
      category: 'Workplace Dilemma',
      archetype: 'dilemma',
      starterPrompt: 'A key stakeholder disagrees with your recommendation and is pushing back hard in front of leadership. How do you de-escalate the tension and steer the conversation toward constructive consensus?',
      emoji: '🤝'
    },
    {
      id: 'fb-int-3',
      title: 'Explaining a Major Failure',
      description: 'Reflect on a professional mistake, the lessons learned, and the rebound.',
      category: 'Career Storytelling',
      archetype: 'storytelling',
      starterPrompt: 'Describe a project or decision you owned that did not go according to plan. What went wrong, what was your immediate reaction, and how did that experience reshape the way you work today?',
      emoji: '🌱'
    },
    {
      id: 'fb-int-4',
      title: 'Your 5-Year Industry Vision',
      description: 'Articulate your trajectory, ambition, and industry perspective with conviction.',
      category: 'Executive Presence',
      archetype: 'prediction',
      starterPrompt: 'Where do you see your field evolving over the next five years, and what distinct value or leadership role do you intend to bring to that future?',
      emoji: '🎯'
    },
    {
      id: 'fb-int-5',
      title: 'Salary & Value Negotiation',
      description: 'Make a compelling case for a promotion or compensation adjustment.',
      category: 'Professional Simulation',
      archetype: 'roleplay',
      starterPrompt: 'Roleplay a conversation with your manager: articulate why your contributions over the past year warrant a promotion and higher compensation, backing it up with measurable impact.',
      emoji: '📊'
    }
  ],
  tech_engineering: [
    {
      id: 'fb-tech-1',
      title: 'Autonomous Agents in Knowledge Work',
      description: 'Debate how autonomous AI agents will reshape human software teams.',
      category: 'Tech Debate',
      archetype: 'debate',
      starterPrompt: 'If autonomous AI agents can independently write, test, and deploy 60% of routine code within three years, how should software engineers redefine their unique value proposition?',
      emoji: '🤖'
    },
    {
      id: 'fb-tech-2',
      title: 'Technical Debt vs Ship Velocity',
      description: 'Navigate the trade-off between architectural cleanliness and product speed.',
      category: 'Engineering Dilemma',
      archetype: 'dilemma',
      starterPrompt: 'Your startup needs to launch a feature in two weeks to secure a vital contract, but cutting corners will introduce severe technical debt. Do you take the shortcut or push back? How do you justify your stance?',
      emoji: '⚡'
    },
    {
      id: 'fb-tech-3',
      title: 'Data Privacy vs Hyper-Personalization',
      description: 'Analyze whether modern digital consumers have permanently conceded their privacy.',
      category: 'Tech & Society',
      archetype: 'debate',
      starterPrompt: 'Consumers demand hyper-personalized AI experiences, but these require invasive data harvesting. Is true privacy still achievable in modern software, or is it an outdated illusion?',
      emoji: '🔒'
    },
    {
      id: 'fb-tech-4',
      title: 'Explaining Architecture to Non-Techies',
      description: 'Translate complex technical architecture into plain business language.',
      category: 'Communication Simulation',
      archetype: 'roleplay',
      starterPrompt: 'Explain how cloud microservices and event-driven architecture work to an investor with zero technical background, using a simple real-world analogy.',
      emoji: '🧩'
    },
    {
      id: 'fb-tech-5',
      title: 'The Next Computing Paradigm',
      description: 'Predict which emerging technology will replace the smartphone.',
      category: 'Visionary Prediction',
      archetype: 'prediction',
      starterPrompt: 'Will spatial computing, brain-computer interfaces, or ambient voice wearables replace the smartphone as our primary computing device? Make your case.',
      emoji: '🚀'
    }
  ],
  business_startups: [
    {
      id: 'fb-biz-1',
      title: 'The Unforgiving Search for PMF',
      description: 'Discuss the true signals that prove a company has achieved product-market fit.',
      category: 'Startup Strategy',
      archetype: 'dilemma',
      starterPrompt: 'Many founders confuse early traction with true product-market fit. What is the single most reliable indicator that customers genuinely cannot live without your product?',
      emoji: '📈'
    },
    {
      id: 'fb-biz-2',
      title: 'Bootstrapping vs Venture Capital',
      description: 'Defend whether entrepreneurs should bootstrap or raise venture capital.',
      category: 'Business Debate',
      archetype: 'debate',
      starterPrompt: 'Take a clear stance: is it better to maintain 100% equity ownership through cautious bootstrapping, or raise millions in VC to capture the market before competitors wake up?',
      emoji: '💡'
    },
    {
      id: 'fb-biz-3',
      title: 'Disrupting a Stagnant Legacy Market',
      description: 'Pitch a modern solution that upends an entrenched traditional industry.',
      category: 'Elevator Pitch',
      archetype: 'prediction',
      starterPrompt: 'If you had unlimited capital to disrupt one legacy industry today—like healthcare, real estate, or banking—which would you attack first, and what would your unfair advantage be?',
      emoji: '🏢'
    },
    {
      id: 'fb-biz-4',
      title: 'Delivering Tough News to Investors',
      description: 'Roleplay communicating missed targets transparently while keeping confidence high.',
      category: 'Leadership Roleplay',
      archetype: 'roleplay',
      starterPrompt: 'Your startup missed its quarterly revenue target by 35%. Deliver an opening 90-second address to your board of directors that acknowledges the shortfall and outlines your recovery plan.',
      emoji: '🎙️'
    }
  ],
  science_healthcare: [
    {
      id: 'fb-sci-1',
      title: 'AI in Clinical Diagnosis',
      description: 'Weigh the promises and ethical risks of AI diagnostic systems in medicine.',
      category: 'Bioethics Dilemma',
      archetype: 'dilemma',
      starterPrompt: 'If an AI model demonstrates 98% accuracy in diagnosing rare conditions compared to an 85% human physician benchmark, should hospitals allow AI to make final diagnostic decisions without human sign-off?',
      emoji: '🧬'
    },
    {
      id: 'fb-sci-2',
      title: 'Communicating Scientific Urgency',
      description: 'Practice translating scientific consensus to a skeptical public.',
      category: 'Public Speaking',
      archetype: 'roleplay',
      starterPrompt: 'How do you communicate urgent scientific findings—like antibiotic resistance or climate impact—without resorting to sensationalism that makes audiences defensive?',
      emoji: '🔬'
    },
    {
      id: 'fb-sci-3',
      title: 'Gene Editing & Human Enhancement',
      description: 'Debate where humanity should draw the ethical line on CRISPR genetic editing.',
      category: 'Ethics Debate',
      archetype: 'debate',
      starterPrompt: 'Should CRISPR gene editing be restricted solely to curing fatal hereditary diseases, or should societies eventually permit genetic enhancements for memory, longevity, and physical stamina?',
      emoji: '🧪'
    }
  ],
  debates_persuasion: [
    {
      id: 'fb-deb-1',
      title: 'The Future of Remote Work',
      description: 'Argue whether remote work enhances innovation or gradually erodes company culture.',
      category: 'Cultural Debate',
      archetype: 'debate',
      starterPrompt: 'Does complete remote work accelerate individual productivity, or does it erode serendipitous creativity and mentorship? Take a definitive side and defend it with compelling examples.',
      emoji: '⚖️'
    },
    {
      id: 'fb-deb-2',
      title: 'Is College Still Worth It?',
      description: 'Examine whether traditional higher education justifies its massive price tag.',
      category: 'Education Debate',
      archetype: 'debate',
      starterPrompt: 'With self-directed online learning, AI tutors, and portfolio-based hiring, is a 4-year college degree still an indispensable launchpad, or is it becoming an overpriced credential?',
      emoji: '🎓'
    },
    {
      id: 'fb-deb-3',
      title: 'The Attention Economy & Deep Focus',
      description: 'Discuss whether short-form media has permanently altered human cognition.',
      category: 'Psychology & Focus',
      archetype: 'dilemma',
      starterPrompt: 'Has algorithmic short-form video permanently degraded our capacity for deep, sustained contemplation, or are human minds simply adapting to higher bandwidth information processing?',
      emoji: '📱'
    },
    {
      id: 'fb-deb-4',
      title: 'Speed vs Perfection in Decision-Making',
      description: 'Defend whether fast flawed decisions beat slow perfect decisions in leadership.',
      category: 'Philosophy of Leadership',
      archetype: 'debate',
      starterPrompt: 'Jeff Bezos argues that most decisions should be made with 70% of the information you wish you had. In your view, when is bias for action a virtue, and when does it become reckless?',
      emoji: '⏱️'
    }
  ],
  storytelling_reflection: [
    {
      id: 'fb-sto-1',
      title: 'A Perspective-Altering Habit',
      description: 'Reflect on a small routine that completely transformed your focus or mindset.',
      category: 'Personal Narrative',
      archetype: 'storytelling',
      starterPrompt: 'What is one micro-habit or daily ritual you adopted that yielded a surprisingly outsized positive transformation in your life? Walk me through what changed.',
      emoji: '☕'
    },
    {
      id: 'fb-sto-2',
      title: 'The Art Piece That Shook You',
      description: 'Share a narrative about a book, film, or artwork that shifted your worldview.',
      category: 'Cultural Reflection',
      archetype: 'storytelling',
      starterPrompt: 'Describe a book, film, speech, or piece of art that fundamentally altered how you think about human nature or society. What was the central insight that stayed with you?',
      emoji: '🎬'
    },
    {
      id: 'fb-sto-3',
      title: 'An Encounter with Serendipity',
      description: 'Describe an unexpected encounter or journey that defied your expectations.',
      category: 'Travel & Wonder',
      archetype: 'storytelling',
      starterPrompt: 'Share a story about an unexpected conversation with a stranger or an unforeseen detour while traveling that completely flipped your assumptions about a place or culture.',
      emoji: '🌍'
    },
    {
      id: 'fb-sto-4',
      title: 'Overcoming Spoken Hesitation',
      description: 'Reflect on a moment where you hesitated to speak up and what it taught you.',
      category: 'Vulnerability & Growth',
      archetype: 'storytelling',
      starterPrompt: 'Think back to a moment in school, work, or your personal life where you had an important thought but hesitated to speak up. How did that feel, and what did it teach you about your voice?',
      emoji: '🎙️'
    }
  ]
};

function getFallbackTopicList(userContext?: UserContext | null): TopicSuggestion[] {
  const ctx = userContext || getUserContext();
  const goalLower = (ctx?.goal || '').toLowerCase();
  const professionLower = (ctx?.profession || '').toLowerCase();
  const interests = (ctx?.interests || []).map(i => i.toLowerCase());
  const formatLower = (ctx?.preferredFormat || '').toLowerCase();

  const pool: TopicSuggestion[] = [];

  // Match profession first
  if (professionLower.includes('tech') || professionLower.includes('software') || professionLower.includes('engineer')) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.tech_engineering);
  } else if (professionLower.includes('business') || professionLower.includes('finance') || professionLower.includes('consulting')) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.business_startups);
  } else if (professionLower.includes('science') || professionLower.includes('health') || professionLower.includes('medicine')) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.science_healthcare);
  }

  // Match goal
  if (goalLower.includes('interview') || goalLower.includes('career') || goalLower.includes('meeting')) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.interview_career);
  }

  // Match interests
  if (interests.some(i => i.includes('tech') || i.includes('ai'))) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.tech_engineering);
  }
  if (interests.some(i => i.includes('startup') || i.includes('business'))) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.business_startups);
  }
  if (interests.some(i => i.includes('science'))) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.science_healthcare);
  }

  // Match format preferences
  if (formatLower.includes('debate') || formatLower.includes('controvers')) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.debates_persuasion);
  }
  if (formatLower.includes('story') || formatLower.includes('reflect')) {
    pool.push(...CONTEXT_FALLBACK_TOPICS.storytelling_reflection);
  }

  // Always include baseline debate and storytelling for well-rounded variety
  pool.push(...CONTEXT_FALLBACK_TOPICS.debates_persuasion);
  pool.push(...CONTEXT_FALLBACK_TOPICS.storytelling_reflection);

  // De-duplicate by id
  const seenIds = new Set<string>();
  const uniquePool = pool.filter(item => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  // Ensure diverse archetypes are represented in the returned 5
  const shuffled = [...uniquePool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5).map(t => ({
    id: t.id,
    title: cleanNoEmoji(t.title),
    description: cleanNoEmoji(t.description),
    category: cleanNoEmoji(t.category),
    archetype: t.archetype,
    starterPrompt: cleanNoEmoji(t.starterPrompt)
  }));
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
  const profession = ctx?.profession || 'General Professional / Student';
  const challenge = ctx?.challenge || 'Thinking on your feet and structuring thoughts clearly without hesitation';
  const preferredFormat = ctx?.preferredFormat || 'Realistic simulations, spicy debates, and decision dilemmas';
  const tone = ctx?.speakingTone || 'Executive, articulate, and compelling';
  const customInterests = ctx?.customInterests ? `Custom Focus: "${ctx.customInterests}"` : '';

  const excludeClause = excludeTitles.length > 0
    ? `IMPORTANT: Do NOT repeat any of these already seen topic titles: ${JSON.stringify(excludeTitles)}.`
    : '';

  const prompt = `You are Articulate, an elite AI speech and communication mentor.
Generate 5 completely fresh, intellectually stimulating, and varied speaking topics specifically customized for this student:
- Student Profession / Major: "${profession}"
- Primary Speaking Goal: "${goal}"
- Current English Proficiency Level: "${level}"
- Passions & Topic Interests: "${interests}"
- Biggest Speaking Hurdle: "${challenge}"
- Desired Speaking Vibe / Tone: "${tone}"
- Preferred Discussion Dynamic: "${preferredFormat}"
${customInterests ? `- ${customInterests}` : ''}
- Randomization seed: ${Date.now()}-${Math.floor(Math.random() * 10000)}
${excludeClause}

MANDATORY TOPIC DIVERSITY REQUIREMENT:
The 5 topics MUST represent 5 DISTINCT ARCHETYPES so the student practices varied communication modes:
1. "roleplay" (Workplace / Academic Simulation): A realistic, high-stakes conversational simulation directly grounded in their field ("${profession}") or goal ("${goal}").
2. "dilemma" (High-Stakes Decision Dilemma): A difficult ethical, technical, or strategic tradeoff with no clear right answer, forcing the student to weigh options.
3. "debate" (Thought-Provoking Debate / Hot Take): A controversial viewpoint or counter-intuitive trend in their interest area that requires defending a reasoned stance.
4. "storytelling" (Personal Narrative & Reflection): An invitation to articulate a formative failure, unexpected triumph, pivotal life lesson, or personal transformation.
5. "prediction" (Visionary Prediction / Pitch): Articulating what the future holds or pitching a bold vision with structured persuasiveness.

STARTER PROMPT MANDATE:
The "starterPrompt" MUST sound like a warm, supportive human mentor setting up the scene. It should set up the context in 1-2 vivid sentences and then ask an open-ended question that sparks a 1-2 minute spoken response.

CRITICAL FORMATTING RULE:
Do NOT include any emojis, pictograms, or decorative symbols anywhere in the title, description, category, or prompt. Keep all text purely typographic, intellectual, and clean.

Return STRICTLY a JSON object matching this schema:
{
  "topics": [
    {
      "id": "topic-unique-${Date.now()}-1",
      "title": "Concise Engaging Title (max 5 words, NO emojis)",
      "description": "1 engaging sentence describing the premise",
      "category": "Category tag matching their field or goal",
      "archetype": "roleplay | dilemma | debate | storytelling | prediction",
      "starterPrompt": "Warm, natural question from the mentor setting up the topic"
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
            temperature: 0.85,
            max_tokens: 1200
          })
        });

        if (response.ok) {
          const data = await response.json();
          const raw = safeParseJson<any>(data.choices?.[0]?.message?.content);
          const list = Array.isArray(raw) ? raw : (raw?.topics || raw?.items || raw?.suggestions);
          if (Array.isArray(list) && list.length > 0) {
            return list.map((item, idx) => ({
              id: item.id || `gen-${Date.now()}-${idx}`,
              title: cleanNoEmoji(item.title) || `Speaking Topic ${idx + 1}`,
              description: cleanNoEmoji(item.description) || '',
              category: cleanNoEmoji(item.category) || 'Speaking Practice',
              archetype: cleanNoEmoji(item.archetype) || (['roleplay', 'dilemma', 'debate', 'storytelling', 'prediction'][idx % 5]),
              starterPrompt: cleanNoEmoji(item.starterPrompt || item.prompt) || 'Share your thoughts on this topic.'
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
            generationConfig: { responseMimeType: 'application/json', temperature: 0.85 }
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
                title: cleanNoEmoji(item.title) || `Speaking Topic ${idx + 1}`,
                description: cleanNoEmoji(item.description) || '',
                category: cleanNoEmoji(item.category) || 'Speaking Practice',
                archetype: cleanNoEmoji(item.archetype) || (['roleplay', 'dilemma', 'debate', 'storytelling', 'prediction'][idx % 5]),
                starterPrompt: cleanNoEmoji(item.starterPrompt || item.prompt) || 'Share your thoughts on this topic.'
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

