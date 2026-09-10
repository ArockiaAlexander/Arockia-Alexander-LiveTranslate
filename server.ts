import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Helper to convert 16-bit mono PCM to standard RIFF WAV buffer
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // Format chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // Linear PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // 16 bits per sample

  // Data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// In-memory cache for synthesized speech
const ttsCache = new Map<string, { audioBase64: string; mimeType: string }>();

// Lazy GoogleGenAI initialization helper
let genAIClient: GoogleGenAI | null = null;
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: Date.now(),
  });
});

// AI Neural Indian Voice Speech Synthesis Endpoint
app.post('/api/synthesize-speech', async (req, res) => {
  const { text, lang, persona = 'ananya', speed = 'normal' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text string is required for speech synthesis.' });
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
    });
  }

  try {
    const ai = getGenAIClient();

    // Map voice persona to Gemini prebuilt voice
    // ananya: warm feminine Indic voice (Kore)
    // arjun: articulate masculine Indic voice (Puck)
    // pooja: calm, pleasant feminine Indic voice (Zephyr)
    let voiceName = 'Kore';
    if (persona === 'arjun') voiceName = 'Puck';
    if (persona === 'pooja') voiceName = 'Zephyr';

    // Construct prompt to specifically demand an authentic Indian accent and intonation
    const speedInstruction = speed === 'slow' ? 'Speak slowly and deliberately with clear articulation: ' : 'Speak naturally: ';
    let speechPrompt = '';

    switch (lang) {
      case 'en':
        speechPrompt = `${speedInstruction}Speak in an authentic, natural, polite Indian English accent with genuine Indian rhythm and pronunciation: "${cleanText}"`;
        break;
      case 'hi':
        speechPrompt = `${speedInstruction}Speak fluently and naturally in Hindi with an authentic Indian voice and clear pronunciation: "${cleanText}"`;
        break;
      case 'ta':
        speechPrompt = `${speedInstruction}Speak fluently and naturally in Tamil with an authentic Indian voice and clear pronunciation: "${cleanText}"`;
        break;
      case 'te':
        speechPrompt = `${speedInstruction}Speak fluently and naturally in Telugu with an authentic Indian voice and clear pronunciation: "${cleanText}"`;
        break;
      case 'kn':
        speechPrompt = `${speedInstruction}Speak fluently and naturally in Kannada with an authentic Indian voice and clear pronunciation: "${cleanText}"`;
        break;
      case 'ml':
        speechPrompt = `${speedInstruction}Speak fluently and naturally in Malayalam with an authentic Indian voice and clear pronunciation: "${cleanText}"`;
        break;
      default:
        speechPrompt = `${speedInstruction}Speak in an authentic Indian voice with clear regional cadence: "${cleanText}"`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: speechPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!candidate?.data) {
      throw new Error('No audio data received from Gemini speech model.');
    }

    // Convert 24kHz raw PCM to standard playable WAV
    const pcmBuf = Buffer.from(candidate.data, 'base64');
    const wavBuf = pcmToWav(pcmBuf, 24000, 1);
    const audioBase64 = wavBuf.toString('base64');

    if (ttsCache.size > 200) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, { audioBase64, mimeType: 'audio/wav' });

    res.json({
      audioBase64,
      mimeType: 'audio/wav',
      persona,
      cached: false,
      isIndianVoice: true,
    });
  } catch (error: any) {
    console.error('Speech synthesis error in Gemini endpoint:', error);
    res.status(500).json({
      error: error.message || 'Failed to synthesize Indian speech.',
      isIndianVoice: false,
    });
  }
});

// Translation Endpoint with Dialect & Nuance Adaptation
app.post('/api/translate', async (req, res) => {
  const startTime = Date.now();
  const { text, sourceLang, targetLang, sourceDialect, targetDialect, autoDetect, conversationContext } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text string is required for translation.' });
  }

  try {
    const ai = getGenAIClient();

    const systemInstruction = `You are IndicVoice Live, an elite real-time speech-to-speech translation engine specializing in South Asian multilingual communication between:
- Hindi (hi)
- Tamil (ta)
- Malayalam (ml)
- Kannada (kn)
- Telugu (te)
- English (en)

Your paramount strengths are:
1. Low latency and high accuracy across diverse regional dialects:
   - Hindi: Standard Khariboli, Bambaiya/Tapori, Awadhi/Purvanchal, Rajasthani
   - Tamil: Standard Senthamizh, Chennai Madras Bashai, Madurai/Pandiya, Kongu (Coimbatore)
   - Malayalam: Standard Central, Malabar (Kozhikode/Kannur), Travancore (Southern)
   - Kannada: Bengaluru/Mysuru Standard, Coastal/Mangaluru (Karavali), Uttara Karnataka (Hubballi-Dharwad)
   - Telugu: Coastal Andhra (Godavari/Krishna standard), Telangana (Hyderabad colloquial/slang), Rayalaseema
   - English: Indian English colloquial (Pan-Indian nuances, idioms like "do one thing", respectful suffixes) vs International English
2. Honorifics and Cultural Register:
   Preserve respectful registers ("Ji" in Hindi, "Garu/Andi" in Telugu, "Avargal/Nga" in Tamil, "Avare/Ree" in Kannada, "Chechi/Chetta" in Malayalam).
3. Transliteration:
   Always generate a crystal-clear Romanized (Latin alphabet) phonetic transliteration of the target output so that speakers who cannot read the native script can articulate it accurately.
4. Output JSON adhering strictly to the schema.`;

    const prompt = `Translate the following text:
Source text: "${text}"
${autoDetect ? 'Detect source language and dialect automatically.' : `Specified Source Language: ${sourceLang || 'auto'} (${sourceDialect || 'default dialect'})`}
Target Language: ${targetLang} (${targetDialect || 'default dialect'})
${conversationContext ? `Recent conversation context: "${conversationContext}"` : ''}

Deliver accurate translation capturing natural colloquial phrasing for the target dialect.
Provide:
- translatedText in the authentic native script of the target language
- transliteration in clear English letters for phonetic reading
- detectedLanguage (one of: 'hi', 'ta', 'ml', 'kn', 'te', 'en')
- detectedDialect (description of detected regional dialect or cadence)
- confidence (0.0 to 1.0)
- nuanceNotes (concise explanation of cultural idioms, honorifics, or dialectal adaptations used)
- pronunciationGuide (brief tips for tricky consonants like retroflex letters, zh, lh, etc.)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            transliteration: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
            detectedDialect: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            nuanceNotes: { type: Type.STRING },
            pronunciationGuide: { type: Type.STRING },
          },
          required: ['translatedText', 'transliteration'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const latencyMs = Date.now() - startTime;

    res.json({
      translatedText: parsed.translatedText || '',
      transliteration: parsed.transliteration || '',
      sourceText: text,
      sourceLang: parsed.detectedLanguage || sourceLang || 'auto',
      targetLang: targetLang,
      sourceDialect: parsed.detectedDialect || sourceDialect,
      targetDialect: targetDialect,
      detectedLanguage: parsed.detectedLanguage,
      detectedDialect: parsed.detectedDialect,
      confidence: parsed.confidence ?? 0.95,
      nuanceNotes: parsed.nuanceNotes || '',
      pronunciationGuide: parsed.pronunciationGuide || '',
      latencyMs,
      engine: 'gemini',
    });
  } catch (error: any) {
    console.error('Translation error in Gemini endpoint:', error);
    res.status(500).json({
      error: error.message || 'Failed to process translation with Gemini.',
      details: error.toString(),
    });
  }
});

// Audio Transcription Endpoint (Accepts base64 audio snippet)
app.post('/api/transcribe-audio', async (req, res) => {
  const { audioBase64, mimeType, expectedLang } = req.body;
  if (!audioBase64) {
    return res.status(400).json({ error: 'Missing audioBase64 string.' });
  }

  try {
    const ai = getGenAIClient();
    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: cleanBase64,
            },
          },
          {
            text: `Transcribe this spoken audio exactly in its original spoken language and script (Hindi, Tamil, Malayalam, Kannada, Telugu, or English). If expected language is ${expectedLang || 'unknown'}, prioritize detecting accents and regional vernacular. Return JSON: {"transcript": string, "detectedLanguage": string, "detectedDialect": string, "confidence": number}`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
            detectedDialect: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ['transcript'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    res.status(500).json({ error: error.message || 'Failed to transcribe audio.' });
  }
});

// Dialect analysis endpoint
app.post('/api/dialect-insights', async (req, res) => {
  const { text, lang } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required.' });

  try {
    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze this ${lang || 'Indic'} sentence for regional dialect markers, slang, tone formality, and cultural context: "${text}".
Return JSON adhering to schema with:
- dialectName
- region
- formality (casual, polite, formal)
- keySlangTokens: array of {token: string, meaning: string}
- explanation: brief 2-sentence summary`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dialectName: { type: Type.STRING },
            region: { type: Type.STRING },
            formality: { type: Type.STRING },
            explanation: { type: Type.STRING },
            keySlangTokens: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  token: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    res.json(JSON.parse(response.text?.trim() || '{}'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IndicVoice server running on http://localhost:${PORT}`);
  });
}

startServer();
