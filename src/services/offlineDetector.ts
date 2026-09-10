import { LanguageCode } from '../types';

interface DetectionResult {
  language: LanguageCode;
  confidence: number;
  detectedDialect?: string;
  script: string;
  source: 'script-ranges' | 'vocabulary-n-gram' | 'fallback';
}

// Unicode script ranges for precise zero-latency offline detection
const SCRIPT_RANGES: { lang: LanguageCode; script: string; regex: RegExp }[] = [
  { lang: 'hi', script: 'Devanagari', regex: /[\u0900-\u097F]/g },
  { lang: 'ta', script: 'Tamil', regex: /[\u0B80-\u0BFF]/g },
  { lang: 'te', script: 'Telugu', regex: /[\u0C00-\u0C7F]/g },
  { lang: 'kn', script: 'Kannada', regex: /[\u0C80-\u0CFF]/g },
  { lang: 'ml', script: 'Malayalam', regex: /[\u0D00-\u0D7F]/g },
];

// Romanized / Transliterated vocabulary markers for offline detection
const ROMANIZED_VOCABULARY: Record<LanguageCode, { words: string[]; weight: number }[]> = {
  hi: [
    { words: ['namaste', 'kaise', 'kya', 'haal', 'hai', 'hain', 'aap', 'tum', 'theek', 'shukriya', 'dhanyawad', 'arre', 'bhai', 'yaar', 'bolo', 'chalo', 'kahan', 'kab', 'kyun', 'achha', 'bahut', 'badhiya', 'samajh', 'gaya', 'gayi'], weight: 2 },
    { words: ['apun', 'bambai', 'tapori', 'bindaas', 'jhakaas', 'dost'], weight: 3 }, // Bambaiya hint
  ],
  ta: [
    { words: ['vanakkam', 'eppadi', 'irukkeenga', 'irukkeergal', 'irukken', 'nandri', 'enna', 'enge', 'eppo', 'aama', 'illai', 'nalla', 'romba', 'sari', 'theriyum', 'theriyathu', 'vaanga', 'ponga', 'machan', 'thambi', 'akko', 'anna'], weight: 2 },
    { words: ['semma', 'gethu', 'thalaiva', 'vango', 'aenunga'], weight: 3 }, // Tamil slang / dialect
  ],
  ml: [
    { words: ['namaskaram', 'enthokkeyund', 'vishesham', 'nanni', 'enth', 'evide', 'eppol', 'athe', 'alla', 'nalla', 'valare', 'shari', 'ariyam', 'ariyilla', 'varu', 'poku', 'chechi', 'chetta', 'mone', 'ivide'], weight: 2 },
    { words: ['poli', 'kidu', 'enthuto', 'sukholle', 'scene'], weight: 3 }, // Malayalam slang
  ],
  kn: [
    { words: ['namaskara', 'hegiddira', 'hegiddeera', 'chennagiddira', 'dhanyavada', 'yenu', 'elli', 'yaavaga', 'houdu', 'illa', 'thumba', 'sarigide', 'gothu', 'gothilla', 'banni', 'hogi', 'avare', 'guru', 'neevu'], weight: 2 },
    { words: ['maga', 'hauda', 'maarre', 'hyangideeri', 'yappa'], weight: 3 }, // Kannada slang
  ],
  te: [
    { words: ['namaskaram', 'ela', 'unnaru', 'chala', 'bagunnara', 'dhanyavadalu', 'enti', 'ekkada', 'eppudu', 'avunu', 'kaadu', 'manchi', 'sare', 'telusu', 'teliyadu', 'randi', 'vellandi', 'garu', 'andi', 'meeru'], weight: 2 },
    { words: ['kirrak', 'gatlana', 'ettagunnaaru', 'nayana', 'avunaa'], weight: 3 }, // Telugu slang
  ],
  en: [
    { words: ['hello', 'hi', 'how', 'are', 'you', 'thank', 'thanks', 'what', 'where', 'when', 'yes', 'no', 'good', 'well', 'fine', 'understand', 'please', 'come', 'go', 'doing', 'can', 'help', 'friend'], weight: 1 },
    { words: ['prepone', 'revert', 'do one thing', 'first class', 'yaar', 'bhaiya'], weight: 2 }, // Indian English
  ],
};

// Dialect heuristic rules
const DIALECT_CLUES: Record<string, { lang: LanguageCode; dialectId: string; tokens: string[] }> = {
  'hi-mumbai': {
    lang: 'hi',
    dialectId: 'hi-mumbai',
    tokens: ['अपुन', 'झकास', 'बिंदास', 'apun', 'jhakaas', 'bindaas', 'tere ko', 'mere ko'],
  },
  'ta-chennai': {
    lang: 'ta',
    dialectId: 'ta-chennai',
    tokens: ['மச்சான்', 'கெத்து', 'செம்ம', 'machan', 'gethu', 'semma', 'matteru', 'kashtam'],
  },
  'ta-kongu': {
    lang: 'ta',
    dialectId: 'ta-kongu',
    tokens: ['ஏனுங்க', 'வாங்கண்ணே', 'aenunga', 'vaanganne', 'kedasi'],
  },
  'ml-malabar': {
    lang: 'ml',
    dialectId: 'ml-malabar',
    tokens: ['എന്തൂട്ടാ', 'സുഖല്ലേ', 'enthoottu', 'sukholle', 'ikka'],
  },
  'kn-karavali': {
    lang: 'kn',
    dialectId: 'kn-karavali',
    tokens: ['ಮಾರ್ರೆ', 'maarre', 'entha samachara', 'tuluva'],
  },
  'te-telangana': {
    lang: 'te',
    dialectId: 'te-telangana',
    tokens: ['కిర్రాక్', 'గట్లనా', 'kirrak', 'gatlana', 'endi ba'],
  },
};

/**
 * Detect language completely offline in under 1ms
 */
export function detectLanguageOffline(text: string): DetectionResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      language: 'en',
      confidence: 0,
      script: 'Latin',
      source: 'fallback',
    };
  }

  // 1. Check Native Script Unicode character frequencies
  const scriptMatches: Record<LanguageCode, number> = {
    hi: 0,
    ta: 0,
    te: 0,
    kn: 0,
    ml: 0,
    en: 0,
  };

  for (const s of SCRIPT_RANGES) {
    const matches = trimmed.match(s.regex);
    if (matches) {
      scriptMatches[s.lang] += matches.length;
    }
  }

  let highestScriptLang: LanguageCode | null = null;
  let highestScriptCount = 0;
  for (const [lang, count] of Object.entries(scriptMatches) as [LanguageCode, number][]) {
    if (count > highestScriptCount) {
      highestScriptCount = count;
      highestScriptLang = lang;
    }
  }

  if (highestScriptLang && highestScriptCount >= 2) {
    const totalChars = trimmed.replace(/\s+/g, '').length;
    const ratio = Math.min(0.99, Number((highestScriptCount / totalChars).toFixed(2)));

    // Check dialect clues for native script
    let detectedDialect: string | undefined;
    for (const [key, clue] of Object.entries(DIALECT_CLUES)) {
      if (clue.lang === highestScriptLang) {
        for (const token of clue.tokens) {
          if (trimmed.includes(token)) {
            detectedDialect = clue.dialectId;
            break;
          }
        }
      }
    }

    const scriptName = SCRIPT_RANGES.find((s) => s.lang === highestScriptLang)?.script || 'Indic';
    return {
      language: highestScriptLang,
      confidence: Math.max(0.85, ratio),
      detectedDialect,
      script: scriptName,
      source: 'script-ranges',
    };
  }

  // 2. Transliterated / Romanized Token Scoring
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  const scores: Record<LanguageCode, number> = {
    hi: 0,
    ta: 0,
    ml: 0,
    kn: 0,
    te: 0,
    en: 0,
  };

  for (const [lang, groups] of Object.entries(ROMANIZED_VOCABULARY) as [LanguageCode, { words: string[]; weight: number }[]][]) {
    for (const group of groups) {
      for (const vocab of group.words) {
        for (const word of words) {
          if (word === vocab) {
            scores[lang] += group.weight * 2;
          } else if (word.length >= 4 && vocab.length >= 4 && (word.startsWith(vocab) || vocab.startsWith(word))) {
            scores[lang] += group.weight;
          }
        }
      }
    }
  }

  // Add default baseline for pure English common grammatical words
  const englishBasics = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'with', 'you', 'it', 'can', 'are'];
  for (const word of words) {
    if (englishBasics.includes(word)) {
      scores.en += 1.5;
    }
  }

  let topLang: LanguageCode = 'en';
  let topScore = 0;
  let totalScore = 0;

  for (const [lang, sc] of Object.entries(scores) as [LanguageCode, number][]) {
    totalScore += sc;
    if (sc > topScore) {
      topScore = sc;
      topLang = lang;
    }
  }

  // Check dialect clues for Romanized text
  let detectedDialect: string | undefined;
  for (const [key, clue] of Object.entries(DIALECT_CLUES)) {
    if (clue.lang === topLang) {
      for (const token of clue.tokens) {
        if (normalized.includes(token.toLowerCase())) {
          detectedDialect = clue.dialectId;
          break;
        }
      }
    }
  }

  const confidence = totalScore > 0 ? Math.min(0.95, Number((topScore / Math.max(totalScore, words.length)).toFixed(2))) : 0.6;

  return {
    language: topLang,
    confidence: Math.max(0.65, confidence),
    detectedDialect,
    script: 'Latin',
    source: totalScore > 0 ? 'vocabulary-n-gram' : 'fallback',
  };
}
