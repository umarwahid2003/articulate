# Articulate 🎙️🌿

**Articulate** is an AI-powered conversational English fluency coach designed to build speaking confidence through zero-scroll, micro-habit daily practice sessions, instant native speech evaluation, and structured linguistic feedback.

---

## ✨ Features

- **Personalized Context Engine:** Calibrates speech evaluations and conversational prompts to your exact speaking goal (Job Interviews, IELTS, Casual, Presentations), current fluency level, and personal interests.
- **Micro-Habit Daily Goals:** Set customized daily practice goals in minutes (2m, 5m, 10m, 15m) with a dynamic progress ring tracking today's progress.
- **Precision Speech Evaluation:** Powered by Google Gemini 3.6 Flash JSON structured evaluations for fluency, grammar, vocabulary, and confidence sub-scores.
- **Specific Linguistic Upgrades:** Highlights precise sentences spoken, alongside native-speaker alternatives and concise grammatical rationales.
- **Session History & Review:** Complete archive of past speaking sessions with detailed interactive review sheets.
- **Milestone Achievements:** Track your Daily Goal, Weekly Streak, and Monthly Streak.
- **Minimalist Design & Interactive 3D Mascot:** Zero-scroll UI with smooth Three.js procedural mascot and dark-mode native styling.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite 5, Framer Motion, Lucide Icons
- **3D Engine:** Three.js
- **AI Backend:** Google Gemini API (`gemini-3.6-flash`)
- **Backend / Database:** Supabase (Auth, Profiles, Progress)
- **Mobile Runtime:** Capacitor 8 (iOS & Android ready)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/umarwahid2003/articulate.git
cd articulate
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file in the root directory:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Run development server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```

---

## 📱 Mobile Build (Capacitor)

```bash
# Sync web build to native platforms
npx cap sync

# Open Android Studio
npx cap open android

# Open Xcode (macOS)
npx cap open ios
```

---

## 📄 License
MIT License
