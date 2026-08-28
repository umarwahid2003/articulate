export interface UserContext {
  goal: string;
  level: string;
  interests: string[];
  dailyGoalMinutes?: number;
  feedbackStyle?: 'balanced' | 'strict' | 'gentle';
  speakingTone?: 'professional' | 'casual' | 'persuasive' | string;
  completedAt?: string;
}

export interface TopicSuggestion {
  id: string;
  title: string;
  category: string;
  description: string;
  starterPrompt: string;
  emoji: string;
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

