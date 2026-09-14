# Comprehensive Migration & Multi-Language Matrix Integration Blueprint

This document details the production architecture required to scale **IndicVoice Live** for a 2-day conference of 100-125 attendees. It handles the migration from Vercel/Gemini to a monolithic, long-lived process on **Railway**, introduces a **6-language matrix backend**, and provides a **React 19 interactive audience interface** with raw binary WebSocket audio streaming.

---

## 1. Global Language Mapping Specifications

The platform natively maps, tracks, and handles cross-translation across the following 6 core language channels:

| Language Token | Native String | ISO Code | Default Neural Voice | Code-Switching Profile |
| :--- | :--- | :---: | :--- | :--- |
| **Tamil** | தமிழ் | `ta-IN` | `meera` (Female) | Natively supports Tanglish stage speech |
| **English** | English | `en-IN` | `karan` (Male) | Indian English cadence & pacing |
| **Malayalam** | മലയാളம் | `ml-IN` | `rahul` (Male) | Full regional dialect tracking |
| **Hindi** | हिन्दी | `hi-IN` | `preeti` (Female) | Natively supports Hinglish blending |
| **Kannada** | ಕನ್ನಡ | `kn-IN` | `kavya` (Female) | High-fidelity sentence structure |
| **Telugu** | తెలుగు | `te-IN` | `vani` (Female) | Real-time structural stabilization |

---

## 2. Server Architecture & Matrix Controller (`server.ts`)

Because Vercel serverless environments enforce hard execution limits and tear down containers, this monolithic script combines your static React asset hosting, an Express API router, and a persistent WebSocket engine into a single Railway instance.

```typescript
import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import fetch from 'node-fetch';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/live' });

app.use(express.json());

// Serve production static React assets built by Vite
app.use(express.static(path.join(__dirname, 'client')));

const languagesList = ['ta-IN', 'en-IN', 'ml-IN', 'hi-IN', 'kn-IN', 'te-IN'];

// Tracks active WebSocket sockets partitioned by their selected language channel
const channelsMap = new Map<string, Set<WebSocket>>();
languagesList.forEach(lang => channelsMap.set(lang, new Set<WebSocket>()));

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    // Parse target room via URL query string: ws://your-app.railway.app/live?channel=ta-IN
    const urlParams = new URLSearchParams(req.url?.split('?')[1]);
    let activeChannel = urlParams.get('channel') || 'en-IN';

    if (!channelsMap.has(activeChannel)) {
        activeChannel = 'en-IN';
    }

    channelsMap.get(activeChannel)?.add(ws);
    console.log(`Attendee joined listening channel room: [${activeChannel}]`);

    // Handle structural mid-session channel updates initiated by the user
    ws.on('message', (message: string) => {
        try {
            const data = JSON.parse(message);
            if (data.action === 'switch_channel' && channelsMap.has(data.newChannel)) {
                channelsMap.get(activeChannel)?.delete(ws);
                activeChannel = data.newChannel;
                channelsMap.get(activeChannel)?.add(ws);
            }
        } catch (e) {
            // Keep container process safe from parsing anomalies
        }
    });

    ws.on('close', () => {
        channelsMap.get(activeChannel)?.delete(ws);
    });
});

/**
 * Multicasts raw stage audio strings to all 6 language outputs simultaneously
 */
async function processConferenceAudioMatrix(rawTranscript: string, detectedSourceLang: string) {
    const processingPromises = languagesList.map(async (targetLang) => {
        const clientSet = channelsMap.get(targetLang);
        if (!clientSet || clientSet.size === 0) return; // Skip compute logic if channel is empty

        // Performance Optimization Bypass: Skip translation step if target matches stage speaker
        if (targetLang === detectedSourceLang) {
            try {
                const nativeAudioBuffer = await generateBulbulVoiceStream(rawTranscript, targetLang);
                broadcastToRoom(targetLang, nativeAudioBuffer);
            } catch (err) {
                console.error(`Native voice processing error on [${targetLang}]:`, err);
            }
            return;
        }

        // Cross-Translation Processing Path
        try {
            const translationResponse = await fetch('https://sarvam.ai', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    text: rawTranscript,
                    model: 'sarvam-translate:v1',
                    source_language_code: detectedSourceLang,
                    target_language_code: targetLang
                })
            });

            if (!translationResponse.ok) return;
            const transData = await translationResponse.json();
            
            const regionalAudioBuffer = await generateBulbulVoiceStream(transData.translated_text, targetLang);
            broadcastToRoom(targetLang, regionalAudioBuffer);
        } catch (error) {
            console.error(`Pipeline drop encountered on channel [${targetLang}]:`, error);
        }
    });

    await Promise.all(processingPromises);
}

async function generateBulbulVoiceStream(text: string, langCode: string): Promise<ArrayBuffer> {
    const response = await fetch('https://sarvam.ai', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ text, model: 'bulbul:v4', language_code: langCode })
    });
    return await response.arrayBuffer();
}

function broadcastToRoom(room: string, buffer: ArrayBuffer) {
    const targets = channelsMap.get(room);
    if (!targets) return;
    targets.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(buffer); // Stream audio array buffers down the network pipe
        }
    });
}

// Fallback path routes all non-API web traffic back to React router base
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Production Monolith listening on port ${PORT}`));
```

---

## 3. Front-End Interactive UI Component (`AudienceConsole.tsx`)

This React 19 component gives attendees an intuitive interface to select their preferred language channel, handles network state changes, and plays raw binary audio buffers with minimal latency using the Web Audio API.

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Radio, Globe } from 'lucide-react';

const supportedLanguages = [
    { code: 'ta-IN', nativeName: 'தமிழ்', englishName: 'Tamil' },
    { code: 'en-IN', nativeName: 'English', englishName: 'English' },
    { code: 'ml-IN', nativeName: 'മലയാളம்', englishName: 'Malayalam' },
    { code: 'hi-IN', nativeName: 'हिन्दी', englishName: 'Hindi' },
    { code: 'kn-IN', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada' },
    { code: 'te-IN', nativeName: 'తెలుగు', englishName: 'Telugu' }
];

export const AudienceConsole: React.FC = () => {
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN');
    const [isAudioReady, setIsAudioReady] = useState<boolean>(false);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    
    const wsRef = useRef<WebSocket | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Initialise audio architecture securely following user gestures
    const initializeAudioPlayback = async () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
        }
        setIsAudioReady(true);
    };

    useEffect(() => {
        // Compute WebSocket location dynamically based on runtime parameters
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/live?channel=${selectedLanguage}`;
        
        const socket = new WebSocket(wsUrl);
        socket.binaryType = 'arraybuffer'; // Crucial for receiving raw PCM audio packets
        wsRef.current = socket;

        socket.onopen = () => setIsConnected(true);
        socket.onclose = () => setIsConnected(false);
        
        socket.onmessage = async (event: MessageEvent) => {
            if (!isAudioReady || !audioCtxRef.current) return;

            try {
                const arrayBuffer = event.data as ArrayBuffer;
                // Process and decode the incoming Sarvam Bulbul audio buffer
                const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
                
                const source = audioCtxRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtxRef.current.destination);
                source.start(0);
            } catch (err) {
                // Catches and bypasses local audio packet dropouts safely
            }
        };

        return () => {
            socket.close();
        };
    }, [selectedLanguage, isAudioReady]);

    const handleLanguageChange = (newLanguage: string) => {
        setSelectedLanguage(newLanguage);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
Use code with caution.wsRef.current.send(JSON.stringify({action: 'switch_channel',newChannel: newLanguage}));}};return ({/* Header Room Indicator Status */}<Radio className={w-5 h-5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}} />{isConnected ? 'LIVE INTERCOMMUNICATION' : 'DISCONNECTED'}Auditorium Feed{/* Primary User Gesture Trigger Hook */}{!isAudioReady ? (Tap to Connect Earphones) : (Audio streaming engine active. Put on your headphones.)}{/* Grid Channel Selection Dashboard Component */}{supportedLanguages.map((lang) => {const isCurrent = selectedLanguage === lang.code;return (<buttonkey={lang.code}onClick={() => handleLanguageChange(lang.code)}className={p-4 rounded-xl flex flex-col items-start transition-all border text-left ${ isCurrent  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/30'  : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-slate-300' }}>{lang.nativeName}<span className={text-xs ${isCurrent ? 'text-indigo-200' : 'text-slate-400'}}>{lang.englishName});})}{/* Warning Reminder Alert banner for native audio packs */}Network: Serverless proxy bypassed. Powered directly via Railway Edge Core & Sarvam Bulbul Neural TTS.);};```4. Final Deployment Execution GuideVite Distribution Target: Ensure your configuration file matches Vite packaging criteria. Compiling the package outputs frontend bundles to dist/client, which matches what the Express server expects on line 17.Railway Environment Variable Injections: Add these parameters under the service panel management settings interface:NODE_ENV = productionPORT = 3000SARVAM_API_KEY = your_active_sarvam_developer_token
<FollowUp>
To finalize your setup before the event, please let me know:
* Do you want the production **`package.json` compilation scripts** matching this file tree layout?
* Do you need assistance creating a **system connection logging dashboard** to help your technical team monitor the connection status of all 125 attendees during the event?
</FollowUp>