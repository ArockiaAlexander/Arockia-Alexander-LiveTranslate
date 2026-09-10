import { LanguageCode, SystemVoiceStatus } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';

class OfflineTTSService {
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices();
    this.isInitialized = true;
  }

  public isIndianVoice(voice: SpeechSynthesisVoice): boolean {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();

    // 1. Language tag checks
    if (
      lang.includes('-in') ||
      lang.includes('_in') ||
      lang.startsWith('hi') ||
      lang.startsWith('ta') ||
      lang.startsWith('te') ||
      lang.startsWith('kn') ||
      lang.startsWith('ml') ||
      lang.startsWith('mr') ||
      lang.startsWith('pa') ||
      lang.startsWith('gu') ||
      lang.startsWith('bn') ||
      lang.startsWith('ur-in')
    ) {
      return true;
    }

    // 2. Known Indian voice names across Windows, Apple, Android, ChromeOS
    const indianKeywords = [
      'india',
      'indian',
      'hindi',
      'tamil',
      'telugu',
      'kannada',
      'malayalam',
      // Apple Indian voices
      'rishi',
      'sangeeta',
      'veena',
      'lekha',
      'kalyani',
      'neerja',
      'prabhat',
      'meera',
      'tara',
      'nivya',
      'deepa',
      // Microsoft Indian voices
      'heera',
      'ravi',
      'kalpana',
      'hemant',
      'shruti',
      'mohan',
      'valluvar',
      'kani',
      'gagan',
      'sapna',
      'sobhana',
      'midhun',
    ];

    return indianKeywords.some((kw) => name.includes(kw));
  }

  public getSystemVoiceStatus(): SystemVoiceStatus {
    const hasSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const hasRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    if (this.voices.length === 0 && hasSynthesis) {
      this.loadVoices();
    }

    const supportedLangs: Record<LanguageCode, boolean> = {
      hi: false,
      ta: false,
      ml: false,
      kn: false,
      te: false,
      en: false,
    };

    let indianVoicesCount = 0;

    for (const voice of this.voices) {
      const vLang = voice.lang.toLowerCase();
      if (vLang.startsWith('hi')) supportedLangs.hi = true;
      if (vLang.startsWith('ta')) supportedLangs.ta = true;
      if (vLang.startsWith('ml')) supportedLangs.ml = true;
      if (vLang.startsWith('kn')) supportedLangs.kn = true;
      if (vLang.startsWith('te')) supportedLangs.te = true;
      if (vLang.startsWith('en')) supportedLangs.en = true;

      if (this.isIndianVoice(voice)) {
        indianVoicesCount++;
      }
    }

    return {
      hasSpeechRecognition: hasRecognition,
      hasSpeechSynthesis: hasSynthesis,
      availableVoices: this.voices.map((v) => ({
        name: v.name,
        lang: v.lang,
        isDefault: v.default,
        localService: v.localService,
      })),
      supportedLanguages: supportedLangs,
      indianVoicesCount,
      hasIndianVoice: indianVoicesCount > 0,
    };
  }

  /**
   * Find the best matching browser voice for the given language, strictly prioritizing Indian voices
   */
  public findBestVoice(lang: LanguageCode): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    const bcp47 = SUPPORTED_LANGUAGES[lang]?.bcp47.toLowerCase() || lang;

    // 1. Exact locale match (e.g. 'ta-in', 'hi-in', 'te-in', 'kn-in', 'ml-in', 'en-in')
    let matched = this.voices.find((v) => v.lang.toLowerCase() === bcp47);
    if (matched) return matched;

    // 2. Exact language match with Indian voice
    matched = this.voices.find((v) => v.lang.toLowerCase().startsWith(lang) && this.isIndianVoice(v));
    if (matched) return matched;

    // 3. Name contains language name (e.g. "Google Tamil", "Hindi India")
    const langName = SUPPORTED_LANGUAGES[lang]?.name.toLowerCase() || '';
    matched = this.voices.find((v) => v.name.toLowerCase().includes(langName));
    if (matched) return matched;

    // 4. Any voice starting with that language
    matched = this.voices.find((v) => v.lang.toLowerCase().startsWith(lang));
    if (matched) return matched;

    // 5. Strictly prioritize an Indian English voice over generic US/UK voices
    matched = this.voices.find((v) => (v.lang.toLowerCase() === 'en-in' || v.lang.toLowerCase().startsWith('en-in')) || (v.lang.toLowerCase().startsWith('en') && this.isIndianVoice(v)));
    if (matched) return matched;

    // 6. Any Indian voice on the system (e.g. Hindi or Tamil device voice)
    matched = this.voices.find((v) => this.isIndianVoice(v));
    if (matched) return matched;

    // 7. Last resort: standard English voice
    matched = this.voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    return matched || this.voices[0] || null;
  }

  /**
   * Speak text offline using the browser's speech synthesis engine
   */
  public speak(
    text: string,
    lang: LanguageCode,
    options: {
      transliteration?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {},
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (options.onError) options.onError(new Error('SpeechSynthesis not supported on this browser.'));
      return false;
    }

    this.stop();

    const voice = this.findBestVoice(lang);
    const hasDirectLanguageVoice = voice && (voice.lang.toLowerCase().startsWith(lang) || voice.name.toLowerCase().includes(SUPPORTED_LANGUAGES[lang]?.name.toLowerCase()));

    // If native voice is not installed locally on this OS, but we have Romanized transliteration,
    // read the transliteration with an Indian English voice so the listener still hears the pronunciation!
    let textToSpeak = text;
    let voiceToUse = voice;
    let utteranceLang = SUPPORTED_LANGUAGES[lang]?.bcp47 || 'en-IN';

    if (!hasDirectLanguageVoice && options.transliteration && lang !== 'en') {
      textToSpeak = options.transliteration;
      const enVoice = this.voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) || this.voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      if (enVoice) {
        voiceToUse = enVoice;
        utteranceLang = enVoice.lang;
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (voiceToUse) utterance.voice = voiceToUse;
    utterance.lang = utteranceLang;
    utterance.rate = options.rate ?? 0.95; // Slightly slower for clear regional articulation
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    utterance.onstart = () => {
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      if (options.onError) options.onError(e);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return window.speechSynthesis.speaking;
  }
}

export const offlineTTS = new OfflineTTSService();
