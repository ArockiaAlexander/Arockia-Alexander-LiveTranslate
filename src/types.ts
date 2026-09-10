export type LanguageCode = 'hi' | 'ta' | 'ml' | 'kn' | 'te' | 'en';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  script: string;
  bcp47: string;
  defaultDialect: string;
  dialects: {
    id: string;
    name: string;
    region: string;
    description: string;
    honorifics: string[];
    sampleSlang: string[];
  }[];
  fontFamily: string;
  color: string;
  bgLight: string;
}

export interface DialectNuance {
  dialectId: string;
  dialectName: string;
  region: string;
  nuanceExplanation: string;
  formalityLevel: 'informal' | 'polite' | 'formal';
  honorificUsed?: string;
}

export interface TranslationResponse {
  translatedText: string;
  transliteration: string;
  sourceText: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  sourceDialect?: string;
  targetDialect?: string;
  detectedLanguage?: LanguageCode;
  detectedDialect?: string;
  confidence: number;
  nuanceNotes?: string;
  pronunciationGuide?: string;
  latencyMs: number;
  engine: 'gemini' | 'offline-local' | 'cache';
  audioBase64?: string;
}

export interface ConversationTurn {
  id: string;
  sender: 'speakerA' | 'speakerB';
  speakerName: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  sourceDialect: string;
  targetDialect: string;
  originalText: string;
  translatedText: string;
  transliteration: string;
  detectedLang?: LanguageCode;
  detectedDialect?: string;
  nuanceNotes?: string;
  timestamp: number;
  latencyMs: number;
  engine: 'gemini' | 'offline-local' | 'cache';
  isPlaying?: boolean;
}

export interface SystemVoiceStatus {
  hasSpeechRecognition: boolean;
  hasSpeechSynthesis: boolean;
  availableVoices: {
    name: string;
    lang: string;
    isDefault: boolean;
    localService: boolean;
  }[];
  supportedLanguages: Record<LanguageCode, boolean>;
  indianVoicesCount?: number;
  hasIndianVoice?: boolean;
}

export type IndianVoicePersona = 'ananya' | 'arjun' | 'pooja';

export interface IndianVoiceConfig {
  persona: IndianVoicePersona;
  engine: 'neural' | 'device';
  speed: 'normal' | 'slow';
}
