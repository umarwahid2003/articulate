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

  const prompt = `You are Articulate, an expert English speaking coach.
Generate 3 distinct, engaging, and personalized speaking topics tailored specifically for an English learner with:
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
    // 1. Try Groq first if available (Llama 3.3 70B Versatile)
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

    // 2. Fallback to Gemini
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
 * Process spoken transcript and evaluate speech with Groq (Llama 3.3 70B) or Gemini
 */
export async function processSpeechWithAI(
  transcribedText: string, 
  history: Message[],
  activeTopic?: TopicSuggestion | null
): Promise<{ evaluation: AISpeechEvaluation; newHistory: Message[] }> {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

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
    : 'CRITIQUE RIGOR: BALANCED. Genuinely appreciate clear expression while directly highlighting critical grammar/preposition errors and concrete upgrade opportunities.';

  const topicContext = activeTopic ? `Current Session Topic: "${activeTopic.title}". Prompt was: "${activeTopic.starterPrompt}"` : 'Free speaking session.';

  const systemPrompt = `You are Articulate, an expert AI English speaking coach.
${topicContext}

USER PROFILE CONTEXT (The student configured these goals):
- Primary Goal: "${goal}"
- Target Level: "${level}"
- Topic Interests: "${interests}"
- Desired Speaking Register/Tone: "${tone}"
- ${styleInstruction}

The user just spoke the following words via speech recognition:
"${transcribedText}"

Perform a deep, precise, and authentic evaluation of what the user actually said.
1. APPRECIATION: Genuinely acknowledge what was expressed clearly, good vocabulary used, or strong communicative intent.
2. CRITICAL FEEDBACK: Specifically point out grammatical inaccuracies, incorrect prepositions, run-on sentences, clumsy phrasing, or missing words relative to their goal ("${goal}").
3. CONCRETE CORRECTIONS: Extract the exact flawed phrases from what they said and provide native, polished alternatives with clear explanations.

Respond STRICTLY in JSON format with this structure:
{
  "overallScore": 78, // Integer 0-100 reflecting genuine quality based on grammar, fluency, vocab, coherence
  "scores": {
    "fluency": 7,     // Integer 1-10 (flow, sentence connectedness)
    "grammar": 6,     // Integer 1-10 (tense accuracy, prepositions, agreement)
    "vocabulary": 7,  // Integer 1-10 (word choice variety, precision)
    "confidence": 8   // Integer 1-10 (assertiveness, directness)
  },
  "feedback": "2 sentences combining genuine appreciation for their clear ideas with constructive, critical advice on fixing specific errors.",
  "corrections": [
    {
      "original": "Exact phrase from user transcript that had an error or awkward phrasing",
      "better": "Polished, natural native speaker phrasing",
      "reason": "Clear linguistic explanation of why the upgrade is better"
    }
  ],
  "reply": "A natural, friendly 2-sentence conversational response answering their point and asking an engaging follow-up question to keep them speaking."
}`;

  const userMessage: Message = { role: 'user', content: transcribedText };
  const currentHistory = [...history, userMessage];

  try {
    let evaluation: AISpeechEvaluation | null = null;

    // 1. Try Groq if VITE_GROQ_API_KEY is provided
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
            temperature: 0.3
          })
        });

        if (response.ok) {
          const data = await response.json();
          evaluation = JSON.parse(data.choices[0].message.content);
        } else {
          console.warn(`Groq error ${response.status}: Falling back to backup model...`);
        }
      } catch (groqErr) {
        console.warn("Groq request failed, attempting fallback:", groqErr);
      }
    }

    // 2. Fallback to Gemini if evaluation not yet populated
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
      } else {
        throw new Error(`Gemini error: ${response.status}`);
      }
    }

    // 3. Fallback to DeepSeek if available
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
      throw new Error("No AI response could be generated from available providers.");
    }

    const aiMessage: Message = { role: 'assistant', content: JSON.stringify(evaluation) };
    return {
      evaluation,
      newHistory: [...currentHistory, aiMessage]
    };
  } catch (error: any) {
    console.error("Error communicating with AI Coach:", error);
    
    // Intelligent contextual fallback if all networks fail
    const fallbackEval: AISpeechEvaluation = {
      overallScore: 78,
      scores: { fluency: 7, grammar: 7, vocabulary: 8, confidence: 8 },
      feedback: "Good clarity in sharing your thoughts! Work on polishing your sentence transitions and preposition choices.",
      corrections: [
        {
          original: transcribedText.length > 30 ? transcribedText.slice(0, 30) + '...' : transcribedText,
          better: "Ensure complete clauses with proper prepositions and tenses.",
          reason: "Focus on subject-verb agreement and precise academic/professional terminology."
        }
      ],
      reply: "Thank you for sharing that! Could you elaborate on what inspired you in this direction?"
    };

    return {
      evaluation: fallbackEval,
      newHistory: history
    };
  }
}
