import { LanguageCode } from '../types';

export interface DialectSample {
  id: string;
  lang: LanguageCode;
  dialectId: string;
  dialectName: string;
  phrase: string;
  transliteration: string;
  englishMeaning: string;
  nuanceContext: string;
  suggestedTargetLang: LanguageCode;
}

export const DIALECT_SAMPLES: DialectSample[] = [
  {
    id: 'hi-mumbai-sample',
    lang: 'hi',
    dialectId: 'hi-mumbai',
    dialectName: 'Bambaiya / Tapori Hindi',
    phrase: 'अरे बॉस, टेंशन मत ले, अपुन सब सेट कर देगा!',
    transliteration: 'Arre boss, tension mat le, apun sab set kar dega!',
    englishMeaning: 'Hey boss, do not worry at all, I will manage and fix everything!',
    nuanceContext: 'Famous Mumbai street slang using "Apun" (I/myself) and "Boss".',
    suggestedTargetLang: 'ta',
  },
  {
    id: 'ta-chennai-sample',
    lang: 'ta',
    dialectId: 'ta-chennai',
    dialectName: 'Chennai Madras Bashai',
    phrase: 'மச்சான், இன்னைக்கு செம்ம கெத்தா இருக்கு, கண்டிப்பா வரணும்!',
    transliteration: 'Machan, innaikku semma gethaa irukku, kandippa varanum!',
    englishMeaning: 'Bro, today is super awesome and grand, you definitely must come!',
    nuanceContext: 'Colloquial Chennai friendship terms "Machan" (pal) and "Semma Gethu" (super stylish).',
    suggestedTargetLang: 'hi',
  },
  {
    id: 'ml-malabar-sample',
    lang: 'ml',
    dialectId: 'ml-malabar',
    dialectName: 'Malabar / Kozhikode Malayalam',
    phrase: 'എന്തൂട്ടാ ഇക്കാ വിശേഷം, സുഖല്ലേ? വീട്ടിൽ എല്ലാവരും സുഖമായിട്ടിരിക്കുന്നോ?',
    transliteration: 'Enthoottu ikka vishesham, sukholle? Veettil ellaavarum sukhamaayittirikkunno?',
    englishMeaning: 'What is the news brother, all well? Is everyone at home doing good?',
    nuanceContext: 'Warm northern Kerala hospitality using "Enthoottu" and "Ikka" (brother).',
    suggestedTargetLang: 'kn',
  },
  {
    id: 'kn-karavali-sample',
    lang: 'kn',
    dialectId: 'kn-karavali',
    dialectName: 'Coastal / Mangaluru Kannada',
    phrase: 'ನಮಸ್ಕಾರ ಮಾರ್ರೆ, ಊಟ ಆಯ್ತಾ? ಇವತ್ತು ಸಮುದ್ರ ಕಡೆ ಹೋಗುವಿರಾ?',
    transliteration: 'Namaskara maarre, oota aaytha? Ivatthu samudra kade hoguvira?',
    englishMeaning: 'Hello dear friend, did you finish your meal? Are you heading towards the beach today?',
    nuanceContext: 'Distinct coastal intonation with the affectionate moniker "Maarre".',
    suggestedTargetLang: 'te',
  },
  {
    id: 'te-telangana-sample',
    lang: 'te',
    dialectId: 'te-telangana',
    dialectName: 'Telangana / Hyderabad Telugu',
    phrase: 'అన్నా కిర్రాక్ ఉంది కదా! రేపు బిర్యానీ తినడానికి చార్మినార్ పోదాం!',
    transliteration: 'Anna kirraak undi kada! Repu biryani tinadaaniki Charminar podham!',
    englishMeaning: 'Brother, this is totally mindblowing! Let us go to Charminar tomorrow for biryani!',
    nuanceContext: 'Signature Hyderabadi vibrancy featuring "Kirraak" (terrific) and "Podham" (let us go).',
    suggestedTargetLang: 'ml',
  },
  {
    id: 'en-indian-sample',
    lang: 'en',
    dialectId: 'en-indian',
    dialectName: 'Colloquial Indian English',
    phrase: 'Do one thing, kindly prepone the meeting so we can reach on time, no issue at all!',
    transliteration: 'Do one thing, kindly prepone the meeting so we can reach on time, no issue at all!',
    englishMeaning: 'Suggestion to advance the scheduled appointment to avoid delay.',
    nuanceContext: 'Unique pan-Indian idioms: "Do one thing" and "Prepone" (opposite of postpone).',
    suggestedTargetLang: 'hi',
  },
  {
    id: 'hi-shuddh-sample',
    lang: 'hi',
    dialectId: 'hi-standard',
    dialectName: 'Formal / Shuddh Hindi',
    phrase: 'इस तकनीकी संवाद मंच पर आपका हार्दिक स्वागत एवं अभिनंदन है।',
    transliteration: 'Is takneeki samvaad manch par aapka haardik swaagat evam abhinandan hai.',
    englishMeaning: 'A warm and gracious welcome to you on this technological dialogue platform.',
    nuanceContext: 'Refined formal register ideal for academic or official addresses.',
    suggestedTargetLang: 'ta',
  },
  {
    id: 'ta-kongu-sample',
    lang: 'ta',
    dialectId: 'ta-kongu',
    dialectName: 'Kongu Tamil (Coimbatore)',
    phrase: 'வாங்கண்ணே வாங்க, டீ சாப்டீங்களா? என்ன விசேஷமுங்க?',
    transliteration: 'Vaanganne vaanga, tea saapteengala? Enna visheshamunga?',
    englishMeaning: 'Welcome brother welcome, did you have tea? What is the special occasion?',
    nuanceContext: 'Ultra-courteous Kongu hospitality with the respectful melodic "nga" ending.',
    suggestedTargetLang: 'te',
  },
];
