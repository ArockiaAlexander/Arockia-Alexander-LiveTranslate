import { LanguageCode, IndianVoicePersona, IndianVoiceConfig } from '../types';
import { offlineTTS } from './offlineTTS';

type SpeechCallback = () => void;
type ErrorCallback = (err: any) => void;

export interface SpeakOptions {
  transliteration?: string;
  dialect?: string;
  speed?: 'normal' | 'slow';
  rate?: number;
  pitch?: number;
  onStart?: SpeechCallback;
  onEnd?: SpeechCallback;
  onError?: ErrorCallback;
}

class IndicSpeechService {
  private currentPersona: IndianVoicePersona = 'ananya';
  private currentEngine: 'neural' | 'device' = 'neural';
  private currentSpeed: 'normal' | 'slow' = 'normal';
  private currentAudio: HTMLAudioElement | null = null;
  private isCurrentlySpeaking = false;
  private listeners: Set<(isSpeaking: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedPersona = localStorage.getItem('indic_voice_persona') as IndianVoicePersona | null;
        if (savedPersona && ['ananya', 'arjun', 'pooja'].includes(savedPersona)) {
          this.currentPersona = savedPersona;
        }
        const savedEngine = localStorage.getItem('indic_voice_engine') as 'neural' | 'device' | null;
        if (savedEngine && ['neural', 'device'].includes(savedEngine)) {
          this.currentEngine = savedEngine;
        }
        const savedSpeed = localStorage.getItem('indic_voice_speed') as 'normal' | 'slow' | null;
        if (savedSpeed && ['normal', 'slow'].includes(savedSpeed)) {
          this.currentSpeed = savedSpeed;
        }
      } catch {
        // localStorage may be restricted in sandbox
      }
    }
  }

  public getConfig(): IndianVoiceConfig {
    return {
      persona: this.currentPersona,
      engine: this.currentEngine,
      speed: this.currentSpeed,
    };
  }

  public setPersona(persona: IndianVoicePersona) {
    this.currentPersona = persona;
    try {
      localStorage.setItem('indic_voice_persona', persona);
    } catch {
      // ignore storage errors
    }
  }

  public setEngine(engine: 'neural' | 'device') {
    this.currentEngine = engine;
    try {
      localStorage.setItem('indic_voice_engine', engine);
    } catch {
      // ignore storage errors
    }
  }

  public setSpeed(speed: 'normal' | 'slow') {
    this.currentSpeed = speed;
    try {
      localStorage.setItem('indic_voice_speed', speed);
    } catch {
      // ignore storage errors
    }
  }

  public subscribe(listener: (isSpeaking: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(isSpeaking: boolean) {
    this.isCurrentlySpeaking = isSpeaking;
    for (const listener of this.listeners) {
      listener(isSpeaking);
    }
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking || offlineTTS.isSpeaking();
  }

  public stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {
        // ignore
      }
      this.currentAudio = null;
    }
    offlineTTS.stop();
    this.notifyListeners(false);
  }

  /**
   * Primary speech synthesis function:
   * Uses Studio AI Neural Indian Voice by default when online,
   * with seamless fallback to offline Indian device voices.
   */
  public async speak(
    text: string,
    lang: LanguageCode,
    options: SpeakOptions = {},
  ): Promise<boolean> {
    if (!text || !text.trim()) return false;

    this.stop();

    const speed = options.speed || this.currentSpeed;
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

    // 1. If Neural Indian voice is active and device is online, attempt server TTS
    if (this.currentEngine === 'neural' && isOnline) {
      try {
        this.notifyListeners(true);
        if (options.onStart) options.onStart();

        const res = await fetch('/api/synthesize-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            lang,
            persona: this.currentPersona,
            dialect: options.dialect,
            speed,
          }),
        });

        if (!res.ok) {
          throw new Error(`Indian voice synthesis error (${res.status})`);
        }

        const data = await res.json();
        if (!data.audioBase64) {
          throw new Error('No audio returned from voice synthesizer.');
        }

        const audioUri = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
        const audio = new Audio(audioUri);
        this.currentAudio = audio;

        audio.onended = () => {
          this.currentAudio = null;
          this.notifyListeners(false);
          if (options.onEnd) options.onEnd();
        };

        audio.onerror = (e) => {
          console.warn('Audio playback error, falling back to device Indian voice:', e);
          this.currentAudio = null;
          this.fallbackToOfflineTTS(text, lang, options);
        };

        await audio.play();
        return true;
      } catch (err) {
        console.warn('Neural Indian voice synthesis failed, falling back to device voice:', err);
        return this.fallbackToOfflineTTS(text, lang, options);
      }
    }

    // 2. Offline or device engine mode
    return this.fallbackToOfflineTTS(text, lang, options);
  }

  private fallbackToOfflineTTS(
    text: string,
    lang: LanguageCode,
    options: SpeakOptions,
  ): boolean {
    const rate = options.rate ?? (options.speed === 'slow' || this.currentSpeed === 'slow' ? 0.78 : 0.95);

    return offlineTTS.speak(text, lang, {
      transliteration: options.transliteration,
      rate,
      pitch: options.pitch ?? 1.0,
      onStart: () => {
        this.notifyListeners(true);
        if (options.onStart) options.onStart();
      },
      onEnd: () => {
        this.notifyListeners(false);
        if (options.onEnd) options.onEnd();
      },
      onError: (err) => {
        this.notifyListeners(false);
        if (options.onError) options.onError(err);
      },
    });
  }

  /**
   * Test current Indian Voice persona with an authentic regional greeting
   */
  public async testIndianVoice(persona?: IndianVoicePersona, lang: LanguageCode = 'en') {
    const selectedPersona = persona || this.currentPersona;
    const previousPersona = this.currentPersona;
    this.currentPersona = selectedPersona;

    const testPhrases: Record<LanguageCode, string> = {
      en: 'Namaste! This is your authentic Indian voice. Regional speech translation is active.',
      hi: 'नमस्ते! यह आपकी प्रामाणिक भारतीय आवाज़ है, स्पष्ट और सहज।',
      ta: 'வணக்கம்! இது உங்கள் உண்மையான இந்தியக் குரல்.',
      te: 'నమస్కారం! ఇది మీ సహజమైన భారతీయ స్వరం.',
      kn: 'ನಮಸ್ಕಾರ! ಇದು ನಿಮ್ಮ ಅಧಿಕೃತ ಭಾರತೀಯ ಧ್ವನಿ.',
      ml: 'നമസ്കാരം! ഇത് നിങ്ങളുടെ സ്വാഭാവികമായ ഇന്ത്യൻ ശബ്ദമാണ്.',
    };

    const phrase = testPhrases[lang] || testPhrases.en;
    await this.speak(phrase, lang);
    this.currentPersona = previousPersona;
  }
}

export const indicSpeech = new IndicSpeechService();
