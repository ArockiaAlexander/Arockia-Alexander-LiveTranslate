import { LanguageCode, SystemVoiceStatus, IndianVoicePersona } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';

const MALE_INDIAN_KEYWORDS = ['rishi', 'ravi', 'hemant', 'mohan', 'valluvar', 'gagan', 'midhun', 'prabhat', 'male'];
const FEMALE_INDIAN_KEYWORDS = ['sangeeta', 'veena', 'lekha', 'kalyani', 'neerja', 'heera', 'kalpana', 'shruti', 'kani', 'sapna', 'sobhana', 'meera', 'tara', 'deepa', 'female'];

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
      ...MALE_INDIAN_KEYWORDS,
      ...FEMALE_INDIAN_KEYWORDS,
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
   * Find the best matching browser voice for the given language and persona, strictly prioritizing Indian voices
   */
  public findBestVoice(lang: LanguageCode, persona?: IndianVoicePersona): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    const bcp47 = SUPPORTED_LANGUAGES[lang]?.bcp47.toLowerCase() || lang;
    const isMalePref = persona === 'arjun';
    const isFemalePref = persona === 'ananya' || persona === 'pooja';

    const matchesGender = (v: SpeechSynthesisVoice) => {
      const n = v.name.toLowerCase();
      if (isMalePref) return MALE_INDIAN_KEYWORDS.some((kw) => n.includes(kw));
      if (isFemalePref) return FEMALE_INDIAN_KEYWORDS.some((kw) => n.includes(kw));
      return true;
    };

    // 1. Exact locale match with preferred persona gender (e.g. 'hi-in' + female)
    let matched = this.voices.find((v) => v.lang.toLowerCase() === bcp47 && matchesGender(v));
    if (matched) return matched;

    // 2. Exact locale match (any gender)
    matched = this.voices.find((v) => v.lang.toLowerCase() === bcp47);
    if (matched) return matched;

    // 3. Exact language match with Indian voice and preferred gender
    matched = this.voices.find((v) => v.lang.toLowerCase().startsWith(lang) && this.isIndianVoice(v) && matchesGender(v));
    if (matched) return matched;

    // 4. Exact language match with Indian voice
    matched = this.voices.find((v) => v.lang.toLowerCase().startsWith(lang) && this.isIndianVoice(v));
    if (matched) return matched;

    // 5. Name contains language name (e.g. "Google Tamil", "Hindi India")
    const langName = SUPPORTED_LANGUAGES[lang]?.name.toLowerCase() || '';
    matched = this.voices.find((v) => v.name.toLowerCase().includes(langName) && matchesGender(v));
    if (matched) return matched;

    matched = this.voices.find((v) => v.name.toLowerCase().includes(langName));
    if (matched) return matched;

    // 6. Any voice starting with that language
    matched = this.voices.find((v) => v.lang.toLowerCase().startsWith(lang));
    if (matched) return matched;

    // 7. Strictly prioritize an Indian English voice with gender matching
    matched = this.voices.find(
      (v) =>
        ((v.lang.toLowerCase() === 'en-in' || v.lang.toLowerCase().startsWith('en-in')) ||
          (v.lang.toLowerCase().startsWith('en') && this.isIndianVoice(v))) &&
        matchesGender(v),
    );
    if (matched) return matched;

    // 8. Any Indian English voice
    matched = this.voices.find(
      (v) =>
        v.lang.toLowerCase() === 'en-in' ||
        v.lang.toLowerCase().startsWith('en-in') ||
        (v.lang.toLowerCase().startsWith('en') && this.isIndianVoice(v)),
    );
    if (matched) return matched;

    // 9. Any Indian voice on the system
    matched = this.voices.find((v) => this.isIndianVoice(v) && matchesGender(v));
    if (matched) return matched;

    matched = this.voices.find((v) => this.isIndianVoice(v));
    if (matched) return matched;

    // 10. Fallback: general English voice
    matched = this.voices.find((v) => v.lang.toLowerCase().startsWith('en') && matchesGender(v));
    if (matched) return matched;

    matched = this.voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    return matched || this.voices[0] || null;
  }

  /**
   * Speak text offline using the browser's speech synthesis engine with authentic Indian prosody
   */
  public speak(
    text: string,
    lang: LanguageCode,
    options: {
      transliteration?: string;
      persona?: IndianVoicePersona;
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

    const voice = this.findBestVoice(lang, options.persona);
    const hasDirectLanguageVoice =
      voice &&
      (voice.lang.toLowerCase().startsWith(lang) ||
        voice.name.toLowerCase().includes(SUPPORTED_LANGUAGES[lang]?.name.toLowerCase()));

    // If native voice is not installed locally on this OS, but we have Romanized transliteration,
    // read the transliteration with an authentic Indian English voice
    let textToSpeak = text;
    let voiceToUse = voice;
    let utteranceLang = SUPPORTED_LANGUAGES[lang]?.bcp47 || 'en-IN';

    if (!hasDirectLanguageVoice && options.transliteration && lang !== 'en') {
      textToSpeak = options.transliteration;
      const indianEnVoice =
        this.voices.find(
          (v) =>
            (v.lang.toLowerCase().startsWith('en-in') || this.isIndianVoice(v)) &&
            (options.persona === 'arjun'
              ? MALE_INDIAN_KEYWORDS.some((kw) => v.name.toLowerCase().includes(kw))
              : FEMALE_INDIAN_KEYWORDS.some((kw) => v.name.toLowerCase().includes(kw))),
        ) ||
        this.voices.find((v) => v.lang.toLowerCase().startsWith('en-in') || this.isIndianVoice(v)) ||
        this.voices.find((v) => v.lang.toLowerCase().startsWith('en'));

      if (indianEnVoice) {
        voiceToUse = indianEnVoice;
        utteranceLang = indianEnVoice.lang;
      }
    }

    // Persona pitch adjustments for authentic natural tone
    let defaultPitch = 1.0;
    if (options.persona === 'arjun') {
      defaultPitch = 0.90; // Natural Indian baritone
    } else if (options.persona === 'ananya') {
      defaultPitch = 1.04; // Expressive melodious Indian tone
    } else if (options.persona === 'pooja') {
      defaultPitch = 0.98; // Gentle clear tone
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (voiceToUse) utterance.voice = voiceToUse;
    utterance.lang = utteranceLang;
    utterance.rate = options.rate ?? 0.92; // Natural, measured South Asian cadence
    utterance.pitch = options.pitch ?? defaultPitch;
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
