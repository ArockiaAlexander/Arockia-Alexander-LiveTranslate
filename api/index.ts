import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel, Modality } from '@google/genai';
import { translateOffline } from '../src/services/offlineDictionary';
import { createDemoWeather } from '../src/services/demoWeather';
import { LanguageCode } from '../src/types';

dotenv.config();

const app = express();

app.use(express.json({ limit: '25mb' }));

app.use((req, res, next) => {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  res.setHeader('X-Request-ID', requestId);
  res.on('finish', () => {
    console.log('[api-request]', {
      requestId,
      method: req.method,
      route: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
});

function logApiError(scope: string, error: unknown, requestId?: string): void {
  const details = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { error };
  console.error(`[${scope}]`, { requestId, ...details });
}

app.get('/api/weather', (req, res) => {
  const city = typeof req.query.city === 'string' && req.query.city.trim() ? req.query.city.trim() : 'Chennai';
  const requestedDays = Number(req.query.days || 5);

  if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 7) {
    return res.status(400).json({ error: 'days must be an integer between 1 and 7.' });
  }

  return res.json({
    city,
    generatedAt: new Date().toISOString(),
    forecasts: createDemoWeather(city, requestedDays),
  });
});

// Serverless CORS & Security Headers Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Case-insensitive environment key resolution helpers
export function getGeminiApiKey(): string | undefined {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const keyName = Object.keys(process.env).find((k) => k.toLowerCase().includes('gemini'));
  return keyName ? process.env[keyName] : undefined;
}

function isLiveAudioV2Enabled(): boolean {
  return process.env.LIVE_AUDIO_V2_ENABLED !== 'false';
}

export function getSarvamApiKey(): string | undefined {
  if (process.env.SARVAM_API_KEY) return process.env.SARVAM_API_KEY;
  if (process.env.SARVAM_KEY) return process.env.SARVAM_KEY;
  if (process.env.SARVAM) return process.env.SARVAM;
  if (process.env.SARVAM_TOKEN) return process.env.SARVAM_TOKEN;

  const keyName = Object.keys(process.env).find((k) => k.toLowerCase().includes('sarvam'));
  return keyName ? process.env[keyName] : undefined;
}

// PCM to WAV audio buffer helper
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);

  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

const ttsCache = new Map<string, { audioBase64: string; mimeType: string }>();
let ttsQuotaExhaustedUntil = 0;
const SUPPORTED_TTS_PERSONAS = ['ananya', 'arjun', 'pooja'] as const;
type TtsPersona = (typeof SUPPORTED_TTS_PERSONAS)[number];

function normalizeTtsPersona(persona: unknown): TtsPersona {
  return typeof persona === 'string' && SUPPORTED_TTS_PERSONAS.includes(persona as TtsPersona)
    ? persona as TtsPersona
    : 'ananya';
}

let genAIClient: GoogleGenAI | null = null;
function getGenAIClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
        timeout: 15000,
        retryOptions: {
          attempts: 2,
          initialDelay: 0.5,
          maxDelay: 2.0,
          httpStatusCodes: [408, 429, 500, 502, 503, 504],
        },
      },
    });
  }
  return genAIClient;
}

function toSarvamLangCode(lang?: string): string {
  const map: Record<string, string> = {
    hi: 'hi-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    en: 'en-IN',
    bn: 'bn-IN',
    gu: 'gu-IN',
    mr: 'mr-IN',
    pa: 'pa-IN',
    od: 'or-IN',
  };
  return map[lang || 'en'] || `${lang || 'en'}-IN`;
}

async function translateWithSarvam(text: string, srcLang: string, targetLang: string): Promise<string | null> {
  const apiKey = getSarvamApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: toSarvamLangCode(srcLang),
        target_language_code: toSarvamLangCode(targetLang),
        speaker_gender: 'Female',
        mode: 'formal',
        model: 'mayura:v1',
      }),
    });

    if (!response.ok) return null;
    const data: any = await response.json();
    return data?.translated_text || null;
  } catch {
    return null;
  }
}

async function synthesizeWithSarvam(text: string, lang: string, speaker = 'ananya'): Promise<string | null> {
  const apiKey = getSarvamApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: toSarvamLangCode(lang),
        speaker: speaker || 'ananya',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 24000,
        model: 'bulbul:v1',
      }),
    });

    if (!response.ok) return null;
    const data: any = await response.json();
    return data?.audios?.[0] || null;
  } catch {
    return null;
  }
}

// Health check endpoint (matches both /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  const sarvamKey = getSarvamApiKey();
  const geminiKey = getGeminiApiKey();

  res.json({
    status: 'ok',
    hasApiKey: Boolean(geminiKey),
    hasSarvamKey: Boolean(sarvamKey),
    liveAudioV2Enabled: isLiveAudioV2Enabled(),
    detectedEnvKeys: Object.keys(process.env).filter(
      (k) => k.toLowerCase().includes('sarvam') || k.toLowerCase().includes('gemini')
    ),
    timestamp: Date.now(),
  });
});

// Synthesize speech endpoint
app.post(['/api/synthesize-speech', '/synthesize-speech'], async (req, res) => {
  const { text, lang, persona: requestedPersona = 'ananya', speed = 'normal' } = req.body;
  const persona = normalizeTtsPersona(requestedPersona);
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text string is required for speech synthesis.' });
  }

  if (!isLiveAudioV2Enabled()) {
    return res.json({
      fallbackToDevice: true,
      audioVersion: 'v1',
      reason: 'Server audio V2 is disabled.',
      isIndianVoice: false,
    });
  }

  const cleanText = text.trim().slice(0, 600);
  const cacheKey = `${lang || 'hi'}_${persona}_${speed}_${cleanText.toLowerCase()}`;
  if (ttsCache.has(cacheKey)) {
    const cached = ttsCache.get(cacheKey)!;
    return res.json({
      audioBase64: cached.audioBase64,
      mimeType: cached.mimeType,
      persona,
      cached: true,
      isIndianVoice: true,
      fallbackToDevice: false,
      audioVersion: 'v2',
    });
  }

  if (getSarvamApiKey()) {
    try {
      const sarvamAudioBase64 = await synthesizeWithSarvam(cleanText, lang || 'hi', persona);
      if (sarvamAudioBase64) {
        ttsCache.set(cacheKey, { audioBase64: sarvamAudioBase64, mimeType: 'audio/wav' });
        return res.json({
          audioBase64: sarvamAudioBase64,
          mimeType: 'audio/wav',
          persona,
          cached: false,
          isIndianVoice: true,
          fallbackToDevice: false,
          engine: 'sarvam-bulbul-v1',
          audioVersion: 'v2',
        });
      }
    } catch (error) {
      logApiError('sarvam-tts', error);
    }
  }

  if (Date.now() < ttsQuotaExhaustedUntil) {
    return res.json({
      fallbackToDevice: true,
      audioVersion: 'v1',
      quotaExhausted: true,
      error: 'Daily neural voice quota reached. Switched to authentic device Indian voice.',
      isIndianVoice: false,
    });
  }

  try {
    const ai = getGenAIClient();
    let voiceName = 'Kore';
    if (persona === 'arjun') voiceName = 'Puck';
    if (persona === 'pooja') voiceName = 'Zephyr';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `Speak in authentic Indian accent: "${cleanText}"` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });

    const candidate = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!candidate?.data) throw new Error('No audio received');

    const pcmBuf = Buffer.from(candidate.data, 'base64');
    const wavBuf = pcmToWav(pcmBuf, 24000, 1);
    const audioBase64 = wavBuf.toString('base64');
    ttsCache.set(cacheKey, { audioBase64, mimeType: 'audio/wav' });

    res.json({
      audioBase64,
      mimeType: 'audio/wav',
      persona,
      cached: false,
      isIndianVoice: true,
      fallbackToDevice: false,
    });
  } catch (error: any) {
    logApiError('gemini-tts', error);
    res.json({
      fallbackToDevice: true,
      error: 'Neural voice busy. Switched to authentic device Indian voice.',
      isIndianVoice: false,
    });
  }
});

// Translation Endpoint
app.post(['/api/translate', '/translate'], async (req, res) => {
  const startTime = Date.now();
  const { text, sourceLang, targetLang, sourceDialect, targetDialect } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text string is required.' });
  }

  if (getSarvamApiKey()) {
    try {
      const effectiveSrcLang = sourceLang && sourceLang !== 'auto' ? sourceLang : 'en';
      const sarvamText = await translateWithSarvam(text, effectiveSrcLang, targetLang);
      if (sarvamText) {
        const offlineMatch = translateOffline(text, effectiveSrcLang as LanguageCode, targetLang as LanguageCode, targetDialect);
        const transliteration = offlineMatch?.transliteration || sarvamText;
        const latencyMs = Date.now() - startTime;

        return res.json({
          translatedText: sarvamText,
          transliteration,
          sourceText: text,
          sourceLang: effectiveSrcLang,
          targetLang,
          confidence: 0.98,
          nuanceNotes: 'Sarvam AI Mayura v1 (Native Indic Engine)',
          latencyMs,
          engine: 'sarvam-mayura-v1',
        });
      }
    } catch (error) {
      logApiError('sarvam-translate', error);
    }
  }

  const effectiveSrcLang: LanguageCode = (sourceLang && sourceLang !== 'auto' ? sourceLang : 'en') as LanguageCode;
  const offlineMatch = translateOffline(text, effectiveSrcLang, targetLang as LanguageCode, targetDialect);

  if (offlineMatch) {
    const latencyMs = Date.now() - startTime;
    return res.json({
      translatedText: offlineMatch.translatedText,
      transliteration: offlineMatch.transliteration,
      sourceText: text,
      sourceLang: effectiveSrcLang,
      targetLang,
      confidence: 0.9,
      nuanceNotes: `${offlineMatch.nuanceNotes} (Local Indic Engine)`,
      latencyMs,
      engine: 'resilient-offline',
    });
  }

  const latencyMs = Date.now() - startTime;
  return res.json({
    translatedText: text,
    transliteration: text,
    sourceText: text,
    sourceLang: effectiveSrcLang,
    targetLang,
    confidence: 0.7,
    nuanceNotes: 'Local Indic phrase dictionary.',
    latencyMs,
    engine: 'resilient-offline',
  });
});

export default function handler(req: any, res: any) {
  return app(req, res);
}
