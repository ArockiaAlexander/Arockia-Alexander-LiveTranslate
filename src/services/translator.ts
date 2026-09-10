import { LanguageCode, TranslationResponse } from '../types';
import { detectLanguageOffline } from './offlineDetector';
import { translateOffline } from './offlineDictionary';
import { indicSpeech } from './indicSpeechService';

// In-memory cache for recent translations
const translationCache = new Map<string, TranslationResponse>();

export interface TranslateOptions {
  text: string;
  sourceLang: LanguageCode | 'auto';
  targetLang: LanguageCode;
  sourceDialect?: string;
  targetDialect?: string;
  forceOffline?: boolean;
  conversationContext?: string;
}

export async function translateAndSpeak(
  options: TranslateOptions,
  ttsConfig?: {
    autoSpeak?: boolean;
    useGeminiAudio?: boolean;
    speechRate?: number;
    speechPitch?: number;
    onStartSpeaking?: () => void;
    onFinishSpeaking?: () => void;
  },
): Promise<TranslationResponse> {
  const startTime = Date.now();
  const cacheKey = `${options.sourceLang}_${options.targetLang}_${options.targetDialect || ''}_${options.text.trim().toLowerCase()}`;

  // Check cache first for sub-millisecond response
  if (translationCache.has(cacheKey) && !options.forceOffline) {
    const cached = translationCache.get(cacheKey)!;
    if (ttsConfig?.autoSpeak) {
      indicSpeech.speak(cached.translatedText, cached.targetLang, {
        transliteration: cached.transliteration,
        dialect: cached.targetDialect,
        rate: ttsConfig.speechRate ?? 0.95,
        pitch: ttsConfig.speechPitch ?? 1.0,
        onStart: ttsConfig.onStartSpeaking,
        onEnd: ttsConfig.onFinishSpeaking,
      });
    }
    return { ...cached, latencyMs: Date.now() - startTime, engine: 'cache' };
  }

  // Detect language if auto
  let effectiveSourceLang: LanguageCode = options.sourceLang === 'auto' ? 'en' : options.sourceLang;
  let detectedInfo = detectLanguageOffline(options.text);
  if (options.sourceLang === 'auto') {
    effectiveSourceLang = detectedInfo.language;
  }

  // If forced offline or device is offline
  const isOffline = options.forceOffline || (typeof navigator !== 'undefined' && !navigator.onLine);

  if (isOffline) {
    const offlineMatch = translateOffline(options.text, effectiveSourceLang, options.targetLang, options.targetDialect);

    if (offlineMatch) {
      const result: TranslationResponse = {
        translatedText: offlineMatch.translatedText,
        transliteration: offlineMatch.transliteration,
        sourceText: options.text,
        sourceLang: effectiveSourceLang,
        targetLang: options.targetLang,
        sourceDialect: options.sourceDialect,
        targetDialect: options.targetDialect,
        detectedLanguage: detectedInfo.language,
        detectedDialect: detectedInfo.detectedDialect,
        confidence: detectedInfo.confidence,
        nuanceNotes: offlineMatch.nuanceNotes + ' (Offline Phrasebook Translation)',
        latencyMs: Date.now() - startTime,
        engine: 'offline-local',
      };

      if (ttsConfig?.autoSpeak) {
        indicSpeech.speak(result.translatedText, result.targetLang, {
          transliteration: result.transliteration,
          dialect: result.targetDialect,
          rate: ttsConfig.speechRate ?? 0.95,
          pitch: ttsConfig.speechPitch ?? 1.0,
          onStart: ttsConfig.onStartSpeaking,
          onEnd: ttsConfig.onFinishSpeaking,
        });
      }

      return result;
    }

    // Heuristic transliteration/direct response if not in phrasebook
    const fallbackResult: TranslationResponse = {
      translatedText: options.text,
      transliteration: options.text,
      sourceText: options.text,
      sourceLang: effectiveSourceLang,
      targetLang: options.targetLang,
      sourceDialect: options.sourceDialect,
      targetDialect: options.targetDialect,
      detectedLanguage: detectedInfo.language,
      detectedDialect: detectedInfo.detectedDialect,
      confidence: 0.7,
      nuanceNotes: 'Offline local fallback: Phrase not in built-in offline phrasebook. Online mode provides full AI translation.',
      latencyMs: Date.now() - startTime,
      engine: 'offline-local',
    };

    if (ttsConfig?.autoSpeak) {
      indicSpeech.speak(fallbackResult.translatedText, fallbackResult.targetLang, {
        transliteration: fallbackResult.transliteration,
        dialect: fallbackResult.targetDialect,
        rate: ttsConfig.speechRate ?? 0.95,
        pitch: ttsConfig.speechPitch ?? 1.0,
        onStart: ttsConfig.onStartSpeaking,
        onEnd: ttsConfig.onFinishSpeaking,
      });
    }

    return fallbackResult;
  }

  // Online Gemini API call
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: options.text,
        sourceLang: options.sourceLang === 'auto' ? undefined : options.sourceLang,
        targetLang: options.targetLang,
        sourceDialect: options.sourceDialect,
        targetDialect: options.targetDialect,
        autoDetect: options.sourceLang === 'auto',
        conversationContext: options.conversationContext,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server translation error: ${res.statusText}`);
    }

    const data: TranslationResponse = await res.json();
    data.latencyMs = Date.now() - startTime;
    data.engine = 'gemini';

    translationCache.set(cacheKey, data);

    if (ttsConfig?.autoSpeak) {
      indicSpeech.speak(data.translatedText, data.targetLang, {
        transliteration: data.transliteration,
        dialect: data.targetDialect,
        rate: ttsConfig.speechRate ?? 0.95,
        pitch: ttsConfig.speechPitch ?? 1.0,
        onStart: ttsConfig.onStartSpeaking,
        onEnd: ttsConfig.onFinishSpeaking,
      });
    }

    return data;
  } catch (err) {
    console.warn('Gemini endpoint failed, falling back to offline engine:', err);
    // Graceful fallback to offline engine
    const offlineMatch = translateOffline(options.text, effectiveSourceLang, options.targetLang, options.targetDialect);
    const fallbackResult: TranslationResponse = {
      translatedText: offlineMatch?.translatedText || options.text,
      transliteration: offlineMatch?.transliteration || options.text,
      sourceText: options.text,
      sourceLang: effectiveSourceLang,
      targetLang: options.targetLang,
      sourceDialect: options.sourceDialect,
      targetDialect: options.targetDialect,
      detectedLanguage: detectedInfo.language,
      confidence: 0.8,
      nuanceNotes: offlineMatch?.nuanceNotes || 'Offline local fallback mode active.',
      latencyMs: Date.now() - startTime,
      engine: 'offline-local',
    };

    if (ttsConfig?.autoSpeak) {
      indicSpeech.speak(fallbackResult.translatedText, fallbackResult.targetLang, {
        transliteration: fallbackResult.transliteration,
        dialect: fallbackResult.targetDialect,
        rate: ttsConfig.speechRate ?? 0.95,
        pitch: ttsConfig.speechPitch ?? 1.0,
        onStart: ttsConfig.onStartSpeaking,
        onEnd: ttsConfig.onFinishSpeaking,
      });
    }

    return fallbackResult;
  }
}
