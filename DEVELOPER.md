# IndicVoice Live — Developer Documentation & Router Architecture

Welcome to the **IndicVoice Live** developer documentation. This document provides a complete technical breakdown of the codebase, routing architecture, audio pipeline, backend proxy endpoints, state management, and deployment guidelines.

---

## 1. System Overview & Architecture

**IndicVoice Live** (`ConferenceTranslateWebApp`) is a full-stack real-time speech-to-speech interpretation console engineered for live auditorium conferences, keynote stages, and floor Q&A across **Hindi, Tamil, Malayalam, Kannada, Telugu, and English**.

```
                           ┌──────────────────────────┐
                           │   Stage Mic / Floor Mic  │
                           └────────────┬─────────────┘
                                        │ (Web Audio API / Web Speech API)
                                        ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                         React 19 Frontend                           │
    │  - React Router (react-router-dom)                                  │
    │  - App.tsx (Main Layout & Route Orchestrator)                        │
    │  - Views: /operator, /audience, /studio, /dual, /dialect, /offline  │
    └────────────────                  ───────────────────────────────────┘
                                        │ HTTP POST (/api/translate-speech, /api/synthesize-speech)
                                        ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                      Node.js / Express Server                       │
    │  - server.ts (Proxy & Security Layer)                               │
    │  - Google GenAI SDK (@google/genai)                                 │
    │  - PCM-to-WAV Transcoder & In-Memory TTS Cache                      │
    └────────────────                  ───────────────────────────────────┘
                                        │ API Request
                                        ▼
                           ┌──────────────────────────┐
                           │     Google Gemini AI     │
                           │   (Gemini Flash & TTS)   │
                           └──────────────────────────┘
```

---

## 2. Client Router Architecture & Route Map

The application uses **`react-router-dom`** for declarative SPA routing. The root route redirects operators to `/operator` by default, while attendees access `/audience` via QR code scanning.

| URL Route | View Component | Description & Key Responsibilities |
| :--- | :--- | :--- |
| **`/`** | `<Navigate to="/operator" />` | Root URL redirecting to the main Stage Operator Console. |
| **`/operator`** | `[ConferenceView.tsx](file:///d:/Alex/SSVP/Communications/NCI%20Website/ConferenceTranslateWebApp/src/components/ConferenceView.tsx)` | **Stage Operator Console**: Podium mic controls, floor intercom, live telemetry (latency & audio level), transcript export (`.txt`/`.json`), and auditorium projector mode. |
| **`/audience`** | `[AudienceView.tsx](file:///d:/Alex/SSVP/Communications/NCI%20Website/ConferenceTranslateWebApp/src/components/AudienceView.tsx)` | **Audience Listener Web View**: Mobile attendee interface for selecting 1 of 6 Indic language audio channels, headset playback controls, and live stage subtitles. |
| **`/studio`** | `[SingleTranslatorView.tsx](file:///d:/Alex/SSVP/Communications/NCI%20Website/ConferenceTranslateWebApp/src/components/SingleTranslatorView.tsx)` | **Live Mic Studio**: Dedicated one-on-one speech translation studio with manual or continuous speech recognition. |
| **`/dual`** | `[DualSpeakerMode.tsx](file:///d:/Alex/SSVP/Communications/NCI%20Website/ConferenceTranslateWebApp/src/components/DualSpeakerMode.tsx)` | **Face-to-Face Dual Mode**: Split-screen two-way conversation view between two speakers speaking different languages. |
| **`/dialect`** | `[DialectPlayground.tsx](file:///d:/Alex/SSVP/Communications/NCI%20Website/ConferenceTranslateWebApp/src/components/DialectPlayground.tsx)` | **Dialect Lab**: Interactive regional dialect nuance exploration and honorific tuning across regional Indian languages. |
| **`/offline`** | `[OfflinePhrasebook.tsx](file:///d:/Alex/SSVP/Communications/NCI%20Website/ConferenceTranslateWebApp/src/components/OfflinePhrasebook.tsx)` | **Offline Phrasebook**: Zero-network fallback phrase lookup for emergency and venue connectivity drops. |
| **`*`** | `<Navigate to="/operator" />` | Fallback wild-card route redirecting unknown paths to `/operator`. |

---

## 3. Directory Structure & Key Modules

```
ConferenceTranslateWebApp/
├── server.ts                       # Express backend proxy & Vite dev middleware
├── package.json                    # Project dependencies & npm scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite build & Tailwind CSS plugin configuration
├── public/                         # Static root assets (ssvp-logo.svg, favicons, public media)
└── src/
    ├── main.tsx                    # React root entry point with BrowserRouter wrapper
    ├── App.tsx                     # Top-level layout, Header container & Routes definition
    ├── types.ts                    # Core TypeScript interfaces & types
    ├── components/
    │   ├── Header.tsx              # Navigation bar, Indian voice modal & master volume popover
    │   ├── ConferenceView.tsx      # Stage operator console & projector display
    │   ├── AudienceView.tsx        # Mobile attendee earphone listener view
    │   ├── AudienceShareModal.tsx  # Audience QR code & link distribution modal
    │   ├── VolumeLatencyConsole.tsx# Audio VU level & round-trip latency telemetry bar
    │   ├── SingleTranslatorView.tsx# One-on-one speech translation studio
    │   ├── DualSpeakerMode.tsx     # Face-to-face split conversation view
    │   ├── DialectPlayground.tsx   # Regional dialect lab
    │   ├── OfflinePhrasebook.tsx   # Local offline dictionary catalog
    │   ├── AudioWaveform.tsx       # Live mic audio wave animation component
    │   └── LanguageSelector.tsx    # Source & target language selector bar
    ├── services/
    │   ├── conferenceSpeechManager.ts # Continuous Web Speech API & audio queue manager
    │   ├── indicSpeechService.ts      # Speech synthesis manager & voice persona controller
    │   ├── offlineTTS.ts              # Native browser SpeechSynthesis fallback wrapper
    │   ├── offlineDictionary.ts       # Localized phrase translation engine
    │   ├── offlineDetector.ts         # Network status detector service
    │   └── translator.ts              # Server translation API fetch wrapper
    └── data/
        ├── conferenceProgram.ts    # Sample conference tracks & session configurations
        ├── dialectSamples.ts       # Dialect phrase samples & regional nuances
        └── languages.ts            # Supported languages metadata (BCP-47 codes, fonts, scripts)
```

---

## 4. Backend API Endpoints (`server.ts`)

The Express server (`server.ts`) acts as a secure backend proxy to Google Gemini AI APIs, preventing client-side API key exposure.

### 1. `GET /api/health`
* **Purpose**: Health check endpoint returning API key configuration status and timestamp.
* **Response**: `{ status: "ok", hasApiKey: boolean, timestamp: number }`

### 2. `POST /api/translate-speech`
* **Purpose**: Translates spoken text to the target language and generates Romanized phonetic transliteration.
* **Payload**: `{ text: string, sourceLang: LanguageCode, targetLang: LanguageCode, sourceDialect?: string, targetDialect?: string }`
* **Engine**: Calls `gemini-3.1-flash-lite` (with `gemini-3.8-flash` backup) using JSON Schema response mode.

### 3. `POST /api/synthesize-speech`
* **Purpose**: Synthesizes high-fidelity Indian neural voice audio.
* **Payload**: `{ text: string, lang: LanguageCode, persona: 'ananya' | 'arjun' | 'pooja', speed: 'normal' | 'slow' }`
* **Processing**: Converts 16-bit Mono PCM buffer to standard RIFF WAV buffer (`pcmToWav()`).
* **Caching**: Stores generated audio in `ttsCache` map to eliminate duplicate API requests.

### 4. `POST /api/dialect-insights`
* **Purpose**: Analyzes regional dialect phrasing, honorifics, and formality levels.

---

## 5. Speech & Audio Fallback Pipeline

IndicVoice Live guarantees **Zero Silence** during live stage broadcasts through a tri-tier speech fallback hierarchy:

```
                      [Speech Input Captured]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Server Neural Speech  │ (Gemini Speech Synthesis)
                     └───────────┬───────────┘
                                 │ Quota Exhausted / API Offline
                                 ▼
                     ┌───────────────────────┐
                     │  Device Native Speech │ (Web SpeechSynthesis API with Indian accents)
                     └───────────┬───────────┘
                                 │ Language Voice Pack Missing
                                 ▼
                     ┌───────────────────────┐
                     │  Phonetic Romanized   │ (Zero Silence Guarantee Text Output)
                     │     Transliteration   │
                     └───────────────────────┘
```

---

## 6. Local Development Setup & Commands

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **GEMINI_API_KEY**: Set in `.env` file (`GEMINI_API_KEY=your_key_here`)

### Available Commands

| Command | Action |
| :--- | :--- |
| **`npm run dev`** | Starts Express server with Vite middleware mode on `http://localhost:3000`. |
| **`npm run lint`** | Runs `tsc --noEmit` to verify type safety across the entire codebase. |
| **`npm run build`** | Builds static frontend assets to `dist/` and compiles `server.ts` into `dist/server.cjs` via `esbuild`. |
| **`npm start`** | Runs the production build (`node dist/server.cjs`). |
| **`npm run clean`** | Cleans build artifacts (`dist/` directory). |

---

## 7. Production Deployment Instructions

1. **Build Production Artifacts**:
   ```bash
   npm run build
   ```
2. **Environment Configuration**:
   Ensure `GEMINI_API_KEY` is provided as an environment variable in your production container/host.
3. **Execute Container / Server**:
   ```bash
   npm start
   ```
4. **Single Page App Routing**:
   In production mode, `server.ts` automatically serves `dist/index.html` for all unknown routes, ensuring `react-router-dom` handles deep URL links (`/audience`, `/operator`, etc.) seamlessly.
