export interface UserContext {
  goal: string;
  level: string;
  interests: string[];
  dailyGoalMinutes?: number;
  profession?: string;
  challenge?: string;
  preferredFormat?: string;
  customInterests?: string;
  feedbackStyle?: 'balanced' | 'strict' | 'gentle';
  speakingTone?: 'executive' | 'charismatic' | 'intellectual' | 'casual' | string;
  completedAt?: string;
}

export interface TopicSuggestion {
  id: string;
  title: string;
  category: string;
  description: string;
  starterPrompt: string;
  emoji: string;
  archetype?: 'roleplay' | 'debate' | 'dilemma' | 'storytelling' | 'prediction' | string;
}

export interface AICorrection {
  original: string;
  better: string;
  reason: string;
}

export interface AISpeechEvaluation {
  overallScore: number;
  scores: {
    fluency: number;
    grammar: number;
    vocabulary: number;
    confidence: number;
  };
  feedback: string;
  keyPoints?: string[];
  corrections: AICorrection[];
  reply: string;
  followUpQuestion?: string;
  wpm?: number;
  fillerWords?: string[];
  pacingNote?: string;
}

