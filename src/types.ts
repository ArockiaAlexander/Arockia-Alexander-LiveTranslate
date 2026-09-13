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

export type LatencyProfile = 'ultra-low' | 'balanced' | 'deep-context';

export interface LatencyBreakdown {
  asrMs: number;
  translationMs: number;
  ttsMs: number;
  totalMs: number;
}

export interface ConferenceSpeechSegment {
  id: string;
  index: number;
  speakerText: string;
  speakerLang: LanguageCode;
  speakerName?: string;
  speakerRole?: string;
  stageRole?: 'chair' | 'host' | 'keynote' | 'moderator' | 'panelist' | 'audience';
  timestamp: number;
  durationSec?: number;
  latencyMs?: number;
  latencyBreakdown?: LatencyBreakdown;
  audioVolumeLevel?: number;
  translations: Partial<
    Record<
      LanguageCode,
      {
        translatedText: string;
        transliteration: string;
        nuanceNotes?: string;
        pronunciationGuide?: string;
      }
    >
  >;
  status: 'pending' | 'translating' | 'ready';
}

export type LiveAudienceState = 'connected' | 'audio-ready';

export interface LiveAudiencePresence {
  id: string;
  language: LanguageCode;
  state: LiveAudienceState;
  joinedAt: number;
  lastSeenAt: number;
}

export interface LivePresenceSnapshot {
  connected: number;
  audioReady: number;
  byLanguage: Partial<Record<LanguageCode, number>>;
  audience: LiveAudiencePresence[];
}

export type LiveClientMessage =
  | { type: 'join'; role: 'operator' | 'audience'; sessionId: string; language?: LanguageCode }
  | { type: 'heartbeat'; language?: LanguageCode; audioReady?: boolean }
  | { type: 'segment'; segment: ConferenceSpeechSegment }
  | { type: 'clear' };

export type LiveServerMessage =
  | { type: 'joined'; connectionId: string; sessionId: string; role: 'operator' | 'audience' }
  | { type: 'presence'; snapshot: LivePresenceSnapshot }
  | { type: 'segment'; segment: ConferenceSpeechSegment }
  | { type: 'clear' }
  | { type: 'error'; message: string };

export interface ConferenceSpeaker {
  id: string;
  name: string;
  role: string;
  organization: string;
  defaultLang: LanguageCode;
  stageRole: 'chair' | 'host' | 'keynote' | 'moderator' | 'panelist' | 'audience';
}

export interface ConferenceSession {
  id: string;
  sessionNumber: number;
  title: string;
  sessionType: 'inauguration' | 'plenary' | 'panel' | 'qa_floor' | 'technical' | 'valedictory';
  sessionTypeName: string;
  track: string;
  timeSlot: string;
  description: string;
  speakers: ConferenceSpeaker[];
  segments: {
    speakerName: string;
    speakerRole: string;
    stageRole: 'chair' | 'host' | 'keynote' | 'moderator' | 'panelist' | 'audience';
    speakerLang: LanguageCode;
    speakerText: string;
    translations: Record<
      LanguageCode,
      {
        translatedText: string;
        transliteration: string;
        nuanceNotes?: string;
      }
    >;
  }[];
}

export interface ConferenceKeynotePreset {
  id: string;
  title: string;
  category: string;
  speakerName: string;
  speakerRole: string;
  speakerOrganization: string;
  speakerLang: LanguageCode;
  speakerDialect: string;
  estimatedMinutes: number;
  description: string;
  segments: {
    speakerText: string;
    translations: Record<
      LanguageCode,
      {
        translatedText: string;
        transliteration: string;
        nuanceNotes?: string;
      }
    >;
  }[];
}


