# Project Context: Articulate 🎙️🌿

## 1. Overview
**Articulate** is an AI-powered conversational English fluency coach web & mobile app built to cultivate daily speaking habits through frictionless zero-scroll practice sessions, real-time audio visualization, ultra-fast Whisper speech-to-text, and deep linguistic feedback powered by LLMs (Groq Llama 3.3 70B & Gemini Flash).

---

## 2. Core Product & Design Principles
1. **Zero-Scroll Minimalist UI:** Single-viewport mobile layouts with zero unnecessary scrolling on practice and context screens.
2. **Text-Only AI Coach:** Feedback and follow-up conversational replies are displayed purely as crisp, readable text (TTS audio is disabled by design).
3. **Themed Aesthetic & Zero Emojis:** Strictly themed UI using monochromatic & theme-tinted Lucide stroke icons (`Target`, `Flame`, `Trophy`, `Sparkles`, `Settings`).
4. **Micro-Habit Daily Progress:** Practice goals configured in daily minutes (2m, 5m, 10m, 15m) tracked live against session duration in a dynamic SVG progress ring.
5. **Interactive 3D Mascot Orb:** Procedurally generated Three.js orb mascot reacting to user state (idle, listening, thinking, celebrating, sleeping).

---

## 3. Tech Stack & Architecture

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 18 (TypeScript), Vite 5, React Router v6 |
| **Styling & Animations** | Custom CSS Variables (`theme.css`), Tailwind CSS, Framer Motion |
| **3D Canvas & Mascot** | Three.js (`GroveOrb.jsx`, `GroveMascot3D.jsx`) |
| **Voice & Speech Engine** | Dual-Engine: `MediaRecorder` + Web Audio API Analyser + Web Speech API (live preview) + Groq Whisper Large V3 Turbo API (sub-300ms transcription) |
| **AI LLM Engine** | Primary: Groq API (`llama-3.3-70b-versatile` JSON mode) • Fallback: Google Gemini API (`gemini-3.6-flash`) |
| **Backend & Database** | Supabase (Auth, Profiles, Row Level Security) |
| **Mobile Runtime** | Capacitor 8 (iOS & Android) |
| **Hosting & CI/CD** | Vercel (with `vercel.json` SPA rewrite rules) |

---

## 4. Key Application Modules & File Structure

```
D:\grove\ (or articulate)
├── src/
│   ├── components/
│   │   ├── BottomNavigation.tsx     # Clean bottom tab bar (Home, Practice, Progress, Context)
│   │   ├── Button.tsx               # Reusable styled button component
│   │   ├── Card.tsx                 # Base container cards
│   │   ├── GroveOrb.jsx             # Three.js interactive 3D mascot orb
│   │   ├── Layout.tsx               # Base layout wrapper with safe margins
│   │   ├── Mascot.tsx               # Mascot wrapper supporting states
│   │   ├── NavigationBar.tsx        # Top navigation header with topic shuffle
│   │   ├── PracticeSheet.tsx        # Quick practice modal sheet
│   │   ├── ProgressRing.tsx         # SVG daily practice circular progress indicator
│   │   └── VoiceRecorder.tsx        # Audio recorder, real-time waveform visualizer, Whisper pipeline
│   ├── contexts/
│   │   └── AuthContext.tsx          # Supabase auth session, profile listener, and fail-safe timeout
│   ├── lib/
│   │   ├── ai.ts                    # Groq/Gemini/Whisper speech evaluation & topic generation logic
│   │   └── supabase.ts              # Supabase client with graceful unconfigured fallback
│   ├── pages/
│   │   ├── AccountDetails.tsx       # User account details and preferences
│   │   ├── CoachContext.tsx         # 4 Coach Context questions (Goal, Level, Topics, Daily Minutes) with glowing save button
│   │   ├── Home.tsx                 # Mascot dashboard and daily quick-start
│   │   ├── Login.tsx                # Google OAuth login with dynamic redirect
│   │   ├── Onboarding.tsx           # 4-step first-time setup flow
│   │   ├── Practice.tsx             # Core speaking practice arena & feedback sheet
│   │   ├── Profile.tsx              # User profile & settings
│   │   ├── Progress.tsx             # Daily goal circle, 3 milestone streaks, session history review
│   │   ├── SignUp.tsx               # Account creation
│   │   └── TermsAcceptance.tsx      # Terms of service acceptance gate
│   ├── types/
│   │   └── user.ts                  # TypeScript interfaces (UserContext, AISpeechEvaluation, TopicSuggestion)
│   ├── theme.css                    # Design token variables (Grove Moss `#1F7A6C`, dark/light surfaces)
│   ├── App.tsx                      # App router, protected routes, shell
│   └── main.tsx                     # Entry point
├── capacitor.config.ts              # Capacitor app ID `com.articulate.app`
├── vercel.json                      # Vercel SPA routing rewrites
├── package.json                     # Project dependencies
└── README.md                        # Project documentation
```

---

## 5. Speaking & AI Coaching Mechanics

1. **User Speaks:**
   - Real-time frequency analysis displays animated equalizer bars.
   - Web Speech API shows streaming live preview words on-screen.
   - `MediaRecorder` buffers raw audio chunks.
2. **User Finishes Speaking:**
   - Audio is sent to **Groq Whisper Large V3 Turbo** (`transcribeAudioWithWhisper`).
   - If Whisper succeeds, it replaces any partial speech recognition artifacts with high-precision text.
3. **Speaking Metrics Calculated:**
   - **Speaking Pace (WPM):** Words / minutes calculated and categorized (`Optimal`, `Deliberate`, `Fast`).
   - **Filler Word Detection:** Scans for `um`, `uh`, `like`, `you know`, `basically`, `actually`, etc.
4. **LLM Coaching Feedback:**
   - Evaluated by **Llama 3.3 70B** on Groq (or **Gemini 3.6 Flash**).
   - Returns structured JSON: `overallScore`, 4 sub-scores (fluency, grammar, vocabulary, confidence), appreciation + critical feedback, specific before/after sentence corrections with linguistic rationales, and an interactive conversational follow-up question.
5. **Session Saved:**
   - Full evaluation, metrics, and transcript are persisted to `localStorage` (`grove_session_history`) and Supabase.

---

## 6. Environment Variables

Create `.env.local` in the root:
```env
# Groq API (Inference & Whisper STT)
VITE_GROQ_API_KEY=gsk_...

# Gemini API (Fallback)
VITE_GEMINI_API_KEY=AIza...

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 7. Current Git Branches

* `main`: Stable production branch connected to Vercel auto-deploy.
* `feature/voice-mechanics-and-ai-coach`: Latest branch containing real-time audio waveform visualizer, WPM calculation, filler word detection, and conversational coach responses.
