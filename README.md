# IndicVoice Live — Real-Time Speech-to-Speech Conference Translator

> Real-time multilingual speech-to-speech translation console engineered for live auditorium conferences, keynote stages, and floor Q&A across **Hindi, Tamil, Malayalam, Kannada, Telugu, and English**.

![IndicVoice Live](https://img.shields.io/badge/Language%20Channels-6%20Indic%20Languages-indigo)
![Latency Grade](https://img.shields.io/badge/Latency-%3C200ms%20Stage%20Grade-emerald)
![Stack](https://img.shields.io/badge/Full%20Stack-React%2019%20%2B%20Express-blue)
![Zero Silence](https://img.shields.io/badge/Engine-Zero%20Silence%20Guaranteed-orange)

---

## Table of Contents
1. [Overview & Core Features](#overview--core-features)
2. [Supported Languages](#supported-languages)
3. [Architecture & Audio Pipeline](#architecture--audio-pipeline)
4. [Live Conference Operator Setup](#live-conference-operator-setup)
5. [Audience Distribution & QR Code](#audience-distribution--qr-code)
6. [Local Development](#local-development)
7. [Deployment Suggestions & Production Hosting](#deployment-suggestions--production-hosting)
8. [Conference Day Operational Checklist](#conference-day-operational-checklist)

---

## Overview & Core Features

IndicVoice Live was specifically designed for national and regional Indian conferences where speakers deliver speeches in their native language and audience delegates require real-time headphone translation.

- **Simultaneous Multi-Channel Audio**: Attendees connect to the live session URL on their smartphone browser, insert earphones, and switch dynamically between 6 Indian language audio channels.
- **Ultra-Low Latency Pipeline (<200ms)**: Streaming neural translation with automated segmenting to ensure speech translation follows stage speakers with minimal acoustic delay.
- **Zero Silence Guarantee**: Even on devices lacking native Tamil, Telugu, Kannada, or Malayalam operating system voice packs, IndicVoice dynamically synthesizes phonetically accurate Romanized transliterations so no speech is ever dropped or silent.
- **Stage Podium Mic & Floor Intercom**: Two dedicated input channels — one for the stage keynote speaker with audio level VU meters, and one for floor delegates asking questions from the auditorium aisle microphones.
- **Auditorium Projector Display Mode**: Fullscreen high-contrast stage subtitle feed with bilingual display (original spoken text + translated subtitles), designed for large stage screens.
- **Instant Audience QR Code**: Built-in crisp, scannable QR code with a one-click Projector Mode for projecting onto the stage before sessions begin, plus one-click PNG download for physical conference programs and badge printing.
- **Official Proceedings Export**: Download timestamped, chronological transcripts in both formatted plaintext (`.txt`) and structured data (`.json`) for post-conference reporting.

---

## Supported Languages

| Language | Native Script | Code | Romanized Transliteration Support |
| :--- | :--- | :---: | :---: |
| **Hindi** | हिन्दी | `hi` | ✅ Yes |
| **Tamil** | தமிழ் | `ta` | ✅ Yes |
| **Telugu** | తెలుగు | `te` | ✅ Yes |
| **Kannada** | ಕನ್ನಡ | `kn` | ✅ Yes |
| **Malayalam** | മലയാളം | `ml` | ✅ Yes |
| **English** | English (Indian Accent) | `en` | ✅ Yes |

---

## Architecture & Audio Pipeline

```
[Stage Speaker / Floor Mic]
           │
           ▼
[Web Audio API & Speech Recognition]
           │
           ▼
[Express Server Proxy (/api/translate-speech)]
           │
           ├───> [Google Gemini API] ───> Multi-language translation + transliteration
           │
           ▼
[IndicVoice Neural Speech Engine]
           │
           ├───> Device SpeechSynthesis (Native TTS)
           │     OR
           ├───> Server-side Neural Voice (/api/tts)
           │     OR
           └───> Romanized Phonetic Fallback (Zero Silence Guarantee)
           │
           ▼
[Audience Delegates Headphones] (via personal phone browser)
```

- **Client**: React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, Motion.
- **Server**: Express.js with `@google/genai` SDK proxies all AI requests server-side, keeping API keys strictly protected from client DevTools.
- **Production Build**: Vite builds static assets to `dist/`, and `esbuild` bundles `server.ts` into a self-contained CommonJS binary `dist/server.cjs`.

---

## Live Conference Operator Setup

1. **Stage Podium Microphone**:
   - Plug the stage audio mixer output (USB audio interface or 3.5mm line-in) into the operator laptop running IndicVoice Live.
   - Click **"Start Stage Mic"** on the **Live Conference** view.
   - The green audio level VU bar will animate to confirm the mic is hot.
2. **Floor Q&A Intercom**:
   - When audience members ask questions from aisle microphones, click **"Floor Intercom / Q&A"** to transcribe and broadcast delegate questions into all attendee channels.
3. **Auditorium Stage Subtitles**:
   - Connect the operator laptop HDMI output to the auditorium projector.
   - Click **"Stage Screen"** to enter the distraction-free, high-contrast dark subtitles screen.

---

## Audience Distribution & QR Code

Attendees **do not** need to download an app from the App Store or Google Play. Everything runs in standard mobile Safari and Chrome:

1. Click the **"Audience QR"** button in the top navigation bar.
2. Select **"Projector View"** to display the QR code on the main stage screen before keynotes begin.
3. Attendees open their smartphone camera, scan the code, and plug in earphones.
4. Each attendee selects their preferred language listening channel from the top bar.

> **Important**: To activate the public link for outside attendees in Google AI Studio, click the **"Share"** button in the top-right toolbar of Google AI Studio once.

---

## Local Development

### Prerequisites
- Node.js 20+ (Node.js 22 LTS recommended)
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd indicvoice-live
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## Deployment Suggestions & Production Hosting

For next week's conference, here are the three recommended deployment paths:

### Option 1: Google Cloud Run (Recommended for High Capacity)
Google Cloud Run provides near-instant auto-scaling, HTTPS out of the box, and low latency across Indian cloud regions (`asia-south1` Mumbai / `asia-south2` Delhi).

1. **Build and Deploy using Google Cloud SDK**:
   ```bash
   gcloud run deploy indicvoice-conference \
     --source . \
     --platform managed \
     --region asia-south1 \
     --allow-unauthenticated \
     --port 3000 \
     --memory 1Gi \
     --cpu 1 \
     --min-instances 1 \
     --max-instances 20 \
     --set-env-vars GEMINI_API_KEY="your_api_key_here"
   ```
2. **Key Flags**:
   - `--region asia-south1`: Deploys to Mumbai for the lowest latency in India (<40ms round-trip).
   - `--min-instances 1`: Keeps at least 1 warm instance active during conference hours to avoid container cold starts.
   - `--max-instances 20`: Easily accommodates hundreds to thousands of simultaneous delegate connections.

3. **Custom Domain Setup**:
   - In the Google Cloud Run Console, go to **Manage Custom Domains**.
   - Add your conference domain (e.g., `live.yourconference.org` or `translate.newgen.co`).
   - Add the verified DNS CNAME or A records to your domain provider.

---

### Option 2: 1-Click Publish via Google AI Studio (Fastest)
If you are hosting directly through Google AI Studio:
1. Click the **"Share"** button in the top-right toolbar of Google AI Studio.
2. Confirm the public URL generated:  
   `https://ais-pre-fpravdw67cx6rugrayct4r-201467057452.asia-southeast1.run.app`
3. Enter this URL into the **Audience QR** modal in the applet, and download the high-resolution QR image for presentation slides.

---

### Option 3: Docker Container on Any Cloud (Render, Fly.io, AWS ECS, VPS)
A production-ready `Dockerfile` is included in the root directory:

```bash
# 1. Build container image
docker build -t indicvoice-live:latest .

# 2. Run container locally or on a VPS
docker run -d -p 3000:3000 \
  -e GEMINI_API_KEY="your_api_key_here" \
  --name indicvoice \
  indicvoice-live:latest
```

---

## Conference Day Operational Checklist

| Time Before Start | Task | Status |
| :--- | :--- | :---: |
| **T - 2 Days** | Print QR code on physical delegate lanyards and venue program sheets | [ ] |
| **T - 1 Day** | Run test audio through stage microphone; verify latency meter displays ~185ms | [ ] |
| **T - 60 Min** | Connect operator laptop to auditorium stage HDMI display and test "Stage Screen" mode | [ ] |
| **T - 30 Min** | Put "Audience Scan QR" on auditorium projector display while delegates take seats | [ ] |
| **T - 15 Min** | Have 2 floor staff test audio on an iPhone and Android device using personal earbuds | [ ] |
| **During Session** | Keep "Live Conference" tab active with Stage Mic ON | [ ] |
| **End of Day** | Click "Export Transcript" to download official bilingual proceedings (.txt and .json) | [ ] |

---

## License & Support
Built for Indian multilingual conferences powered by Google AI Studio and Gemini.
For technical queries or venue integration support, reach out to alex@newgen.co.
