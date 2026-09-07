# Articulate

> **The Spoken Fluency Studio for Non-Native English Speakers**  
> An AI-powered speech coach designed to break the mental translation loop, conquer speaking anxiety, and build effortless English spoken fluency through low-friction daily practice, real-time voice capture, and native phrasing upgrades.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/umarwahid2003/articulate)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646cff.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Overview

Over 1.2 billion non-native English speakers understand English well, yet millions of talented engineers, researchers, and global professionals face a frustrating career ceiling: they read technical documents with ease and write clean emails, but when placed under spontaneous speaking pressure (job interviews, executive meetings, architectural debates), they freeze, get caught in the mental translation loop, or default to stiff, textbook-like phrasing.

**Articulate** is built specifically for non-native speakers on the premise that spoken fluency is a physical and cognitive reflex—not a multiple-choice vocabulary drill. In just 3 to 5 minutes a day, users engage in private, unscripted spoken practice against tailored scenarios, receiving immediate objective scoring and surgical before-and-after native sentence upgrades.

---

## Key Capabilities

- **Deep Student Context Matrix:** Customizes scenarios based on:
  - **Field & Profession:** Software & Engineering, Business & Leadership, Creative, Healthcare, Law & Policy, Academic.
  - **Primary Speaking Hurdle:** Freezing on the spot, rambling, vocabulary bottlenecks, executive presence, textbook stiffness.
  - **Desired Speaking Vibe:** Executive & Decisive, Charismatic & Magnetic, Intellectual & Nuanced, Casual & Conversational.
  - **Custom Niche Keywords:** AI & ML, Venture Capital, Distributed Systems, Product Strategy, etc.
- **5 Dynamic Conversational Archetypes:** Prevents repetitive drills by enforcing variety:
  1. *Roleplay* — High-stakes workplace and interview simulations.
  2. *Dilemma* — Ethical, technical, or strategic trade-offs with no easy answer.
  3. *Debate* — Defending or dismantling controversial viewpoints.
  4. *Storytelling* — Formative personal narratives and reflections.
  5. *Prediction* — Visionary forecasting and structured persuasive pitches.
- **Harmonic Voice Resonance Visualizer:** Custom Web Audio API frequency analysis computing real-time acoustic energy with smooth harmonic equalizers.
- **Precision Speech Evaluation:** Instant breakdown of:
  - Overall Performance Score (0–100)
  - Fluency, Grammar, Vocabulary, and Confidence sub-scores
  - Speaking Pace (Words Per Minute) & Crutch Filler Word detection (`um`, `uh`, `like`, `basically`)
  - Sentence-by-sentence before-and-after corrections with linguistic rationales
  - Conversational follow-up questions to continue deliberate practice
- **Minimalist Editorial Design:** Zero-distraction UI styled with warm paper surfaces, Grove Moss accents (`#2F4B3C`), and Georgia serif typography.
- **Responsive Architecture:** Optimized for both mobile viewports and spacious 2-column desktop workspaces.
- **Progress Tracking & Daily Habits:** Dynamic SVG progress rings, weekly streak tracking, and archived session review history.

---

## Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite 5 |
| **Routing & State** | React Router v6, React Context API |
| **Styling & Animations** | Custom CSS Design Tokens (`theme.css`), Framer Motion, Lucide Icons |
| **AI LLM Inference** | Primary: Groq API (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`) • Fallback: Google Gemini (`gemini-3.6-flash`) |
| **Speech Pipeline** | Web Speech API (streaming recognition) + Web Audio API `AnalyserNode` (frequency analysis) |
| **Backend & Auth** | Supabase (Authentication, Profiles, Session History with offline fallback) |
| **Mobile Runtime** | Capacitor 8 (iOS & Android cross-platform packaging) |
| **Deployment** | Vercel (SPA routing configuration via `vercel.json`) |

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

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
Copy the template file to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your API keys in `.env.local`:
```env
# Groq API (Inference & Speech Evaluation)
VITE_GROQ_API_KEY=your_groq_api_key_here

# Google Gemini API (Fallback)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (Authentication & Persistence)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```
*(Note: If Supabase is unconfigured, the app automatically runs in resilient local-storage mode).*

### 4. Run development server
```bash
npm run dev
```

### 5. Verify build & linting
```bash
npm run lint
npm run build
```

---

## Mobile Build (Capacitor)

Articulate includes Capacitor 8 configuration for native mobile packaging:

```bash
# Sync web build to native platform folders
npx cap sync

# Open in Android Studio
npx cap open android

# Open in Xcode (macOS)
npx cap open ios
```

---

## Security & Secrets Policy

This repository is publicly shared and contains **zero secrets, API keys, or credentials**. All sensitive values are accessed via runtime environment variables and excluded through `.gitignore`. See [`.env.example`](.env.example) for required keys.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
