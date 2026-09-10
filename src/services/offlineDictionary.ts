import { LanguageCode } from '../types';

export interface OfflinePhrase {
  id: string;
  category: 'greetings' | 'conversational' | 'travel' | 'medical' | 'shopping' | 'emergency';
  englishConcept: string;
  translations: Record<
    LanguageCode,
    {
      text: string;
      transliteration: string;
      dialectVariants?: Record<string, string>;
      nuance: string;
    }
  >;
}

export const OFFLINE_PHRASES: OfflinePhrase[] = [
  {
    id: 'greeting_hello',
    category: 'greetings',
    englishConcept: 'Hello / Greetings, how are you?',
    translations: {
      en: {
        text: 'Hello, how are you doing?',
        transliteration: 'Hello, how are you doing?',
        dialectVariants: {
          'en-indian': 'Hello ji, how are you doing?',
          'en-formal': 'Good day, how do you do?',
        },
        nuance: 'Friendly universal greeting.',
      },
      hi: {
        text: 'नमस्ते, आप कैसे हैं?',
        transliteration: 'Namaste, aap kaise hain?',
        dialectVariants: {
          'hi-mumbai': 'अरे बॉस, क्या हाल-चाल?',
          'hi-awadhi': 'नमस्ते, रउआ कइसन बानी?',
          'hi-rajasthani': 'खम्मा घणी, आप कियां हो सा?',
        },
        nuance: 'Respectful greeting using honorific "Aap".',
      },
      ta: {
        text: 'வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?',
        transliteration: 'Vanakkam, neengal eppadi irukkeergal?',
        dialectVariants: {
          'ta-chennai': 'வணக்கம் பாஸ், எப்டி இருக்கீங்க?',
          'ta-madurai': 'வணக்கம்ணே, சௌக்கியமா இருக்கீகளா?',
          'ta-kongu': 'வணக்கமுங்க, நல்லா இருக்கீங்களா?',
        },
        nuance: 'Polite greeting suitable for all age groups.',
      },
      ml: {
        text: 'നമസ്കാരം, സുഖമാണോ?',
        transliteration: 'Namaskaram, sukhamaano?',
        dialectVariants: {
          'ml-malabar': 'നമസ്കാരം, എന്തൊക്കെയുണ്ട് വിശേഷം, സുഖല്ലേ?',
          'ml-travancore': 'നമസ്കാരം ചേട്ടാ, സുഖമാണോ?',
        },
        nuance: 'Warm standard Kerala greeting inquiry.',
      },
      kn: {
        text: 'ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?',
        transliteration: 'Namaskara, neevu hegiddiri?',
        dialectVariants: {
          'kn-karavali': 'ನಮಸ್ಕಾರ ಮಾರ್ರೆ, ಎಂತ ಸಮಾಚಾರ? ಆರಾಮಿದ್ದಿರಾ?',
          'kn-uttara': 'ನಮಸ್ಕಾರ ರೀ, ಹ್ಯಾಂಗಿದೀರಿ?',
        },
        nuance: 'Respectful Kannada greeting with plural honorific "Neevu".',
      },
      te: {
        text: 'నమస్కారం, మీరు ఎలా ఉన్నారు?',
        transliteration: 'Namaskaram, meeru ela unnaru?',
        dialectVariants: {
          'te-telangana': 'నమస్తే అన్నా, ఎట్లున్నవు? బాగున్నవా?',
          'te-rayalaseema': 'నమస్కారమయ్యా, ఎట్టాగున్నారు?',
        },
        nuance: 'Standard polite Telugu greeting.',
      },
    },
  },
  {
    id: 'thank_you',
    category: 'greetings',
    englishConcept: 'Thank you very much for your help.',
    translations: {
      en: {
        text: 'Thank you very much for your help.',
        transliteration: 'Thank you very much for your help.',
        dialectVariants: {
          'en-indian': 'Thanks a lot for the help ji!',
        },
        nuance: 'Heartfelt gratitude.',
      },
      hi: {
        text: 'आपकी मदद के लिए बहुत-बहुत धन्यवाद।',
        transliteration: 'Aapki madad ke liye bahut-bahut dhanyawad.',
        dialectVariants: {
          'hi-mumbai': 'हेल्प के लिए बहुत शुक्रिया भाई!',
        },
        nuance: 'Traditional and gracious expression of gratitude.',
      },
      ta: {
        text: 'உங்கள் உதவிக்கு மிக்க நன்றி.',
        transliteration: 'Ungal udhavikku mikka nandri.',
        dialectVariants: {
          'ta-chennai': 'ரொம்ப தேங்க்ஸ் மச்சான், பெரிய உதவி!',
          'ta-kongu': 'உங்க உதவிக்கு ரொம்ப நன்றிங்க.',
        },
        nuance: 'Formal and warm gratitude expression.',
      },
      ml: {
        text: 'നിങ്ങളുടെ സഹായത്തിന് വളരെ നന്ദി.',
        transliteration: 'Ningalude sahaayathinu valare nanni.',
        dialectVariants: {
          'ml-malabar': 'വലിയ ഉപകാരം, ഒരുപാട് നന്ദി!',
        },
        nuance: 'Expresses deep appreciation.',
      },
      kn: {
        text: 'ನಿಮ್ಮ ಸಹಾಯಕ್ಕೆ ತುಂಬಾ ಧನ್ಯವಾದಗಳು.',
        transliteration: 'Nimma sahaayakke thumba dhanyavaadagalu.',
        dialectVariants: {
          'kn-karavali': 'ಉಪಕಾರ ಆಯ್ತು ಮಾರ್ರೆ, ದೊಡ್ಡ ಧನ್ಯವಾದ.',
        },
        nuance: 'Standard respectful gratitude in Kannada.',
      },
      te: {
        text: 'మీ సహాయానికి చాలా ధన్యవాదాలు.',
        transliteration: 'Mee sahaayaniki chala dhanyavaadalu.',
        dialectVariants: {
          'te-telangana': 'మస్తు హెల్ప్ చేసిండ్రు అన్నా, చాలా థాంక్స్!',
        },
        nuance: 'Polite acknowledgement of generous help.',
      },
    },
  },
  {
    id: 'where_is_station',
    category: 'travel',
    englishConcept: 'Where is the railway station or bus stop?',
    translations: {
      en: {
        text: 'Excuse me, where is the railway station?',
        transliteration: 'Excuse me, where is the railway station?',
        nuance: 'Inquiring for transit directions.',
      },
      hi: {
        text: 'माफ़ कीजिए, रेलवे स्टेशन कहाँ है?',
        transliteration: 'Maaf kijiye, railway station kahan hai?',
        dialectVariants: {
          'hi-mumbai': 'सुनो भाई, स्टेशन किस तरफ पड़ेगा?',
        },
        nuance: 'Polite transit query with polite prefix.',
      },
      ta: {
        text: 'மன்னிக்கவும், ரயில் நிலையம் எங்கே இருக்கிறது?',
        transliteration: 'Mannikkavum, railway nilayam enge irukkiradhu?',
        dialectVariants: {
          'ta-chennai': 'கொஞ்சம் சொல்லுங்க, ரயில்வே ஸ்டேஷன் எந்த பக்கம்?',
        },
        nuance: 'Standard transit inquiry in Tamil Nadu.',
      },
      ml: {
        text: 'റെയിൽവേ സ്റ്റേഷൻ എവിടെയാണ്?',
        transliteration: 'Railway station evideyaanu?',
        dialectVariants: {
          'ml-malabar': 'സ്റ്റേഷൻ ഇങ്ങട് എങ്ങോട്ടാ പോവണ്ടേ?',
        },
        nuance: 'Direct and polite travel question in Kerala.',
      },
      kn: {
        text: 'ಕ್ಷಮಿಸಿ, ರೈಲ್ವೆ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?',
        transliteration: 'Kshamisi, railway nildaana ellide?',
        dialectVariants: {
          'kn-karavali': 'ಮಾರ್ರೆ, ಸ್ಟೇಷನ್ ಯಾವ ಕಡೆ ಬರುತ್ತೆ?',
        },
        nuance: 'Gentle direction inquiry in Karnataka.',
      },
      te: {
        text: 'క్షమించండి, రైల్వే స్టేషన్ ఎక్కడ ఉంది?',
        transliteration: 'Kshaminchandi, railway station ekkada undi?',
        dialectVariants: {
          'te-telangana': 'అన్నా, రైల్వే స్టేషన్ ఎటు పోవాలె?',
        },
        nuance: 'Standard travel inquiry across Andhra and Telangana.',
      },
    },
  },
  {
    id: 'food_water',
    category: 'shopping',
    englishConcept: 'Can I get some drinking water and food here?',
    translations: {
      en: {
        text: 'Can I please get some drinking water and food?',
        transliteration: 'Can I please get some drinking water and food?',
        nuance: 'Polite dining and refreshment request.',
      },
      hi: {
        text: 'क्या मुझे पीने का पानी और खाना मिल सकता है?',
        transliteration: 'Kya mujhe peene ka paani aur khaana mil sakta hai?',
        nuance: 'Common dining request in North India.',
      },
      ta: {
        text: 'குடிநீரும் உணவும் இங்கே கிடைக்குமா?',
        transliteration: 'Kudineerum unavum inge kidaikkuma?',
        dialectVariants: {
          'ta-chennai': 'கொஞ்சம் குடிக்க தண்ணியும் சாப்பாடும் கிடைக்குங்களா?',
        },
        nuance: 'Everyday hospitable request across Tamil Nadu.',
      },
      ml: {
        text: 'കുടിക്കാൻ വെള്ളവും ഭക്ഷണവും കിട്ടുമോ?',
        transliteration: 'Kudikkaan vellavum bhakshanavum kittumo?',
        nuance: 'Traditional food/water inquiry in Kerala.',
      },
      kn: {
        text: 'ಕುಡಿಯಲು ನೀರು ಮತ್ತು ಊಟ ಸಿಗುತ್ತದೆಯೇ?',
        transliteration: 'Kudiyalu neeru matthu oota sigutthadeye?',
        dialectVariants: {
          'kn-karavali': 'ಕುಡಿಯೋಕೆ ನೀರು, ಊಟ ಸಿಗ್ತದಾ ಮಾರ್ರೆ?',
        },
        nuance: 'Polite meal & water request in Karnataka.',
      },
      te: {
        text: 'త్రాగడానికి నీళ్ళు మరియు భోజనం దొరుకుతుందా?',
        transliteration: 'Thragadaaniki neellu mariyu bhojanam dorukuthunda?',
        dialectVariants: {
          'te-telangana': 'నీళ్ళు, బువ్వ దొరుకుతదా అన్నా?',
        },
        nuance: 'Common dining inquiry.',
      },
    },
  },
  {
    id: 'emergency_doctor',
    category: 'emergency',
    englishConcept: 'I need urgent medical help or a doctor.',
    translations: {
      en: {
        text: 'Please help, I urgently need a doctor or hospital!',
        transliteration: 'Please help, I urgently need a doctor or hospital!',
        nuance: 'Urgent medical assistance request.',
      },
      hi: {
        text: 'कृपया मदद करें, मुझे तुरंत डॉक्टर या अस्पताल की ज़रूरत है!',
        transliteration: 'Kripya madad karein, mujhe turant doctor ya aspatal ki zaroorat hai!',
        nuance: 'Urgent medical emergency phrasing in Hindi.',
      },
      ta: {
        text: 'தயவுசெய்து உதவுங்கள், எனக்கு உடனே மருத்துவர் அல்லது மருத்துவமனை தேவை!',
        transliteration: 'Dayavuseydhu udhavungal, enakku udane maruthuvar alladhu maruthuvamanai thevai!',
        nuance: 'Emergency medical call in Tamil.',
      },
      ml: {
        text: 'ദയവായി സഹായിക്കൂ, എനിക്ക് ഉടൻ ഒരു ഡോക്ടറെയോ ആശുപത്രിയോ വേണം!',
        transliteration: 'Dayavaayi sahaayikkoo, enikku udan oru doctareyo aashupathriyo venam!',
        nuance: 'Urgent hospital assistance in Malayalam.',
      },
      kn: {
        text: 'ದಯವಿಟ್ಟು ಸಹಾಯ ಮಾಡಿ, ನನಗೆ ತಕ್ಷಣ ವೈದ್ಯರು ಅಥವಾ ಆಸ್ಪತ್ರೆಯ ಅಗತ್ಯವಿದೆ!',
        transliteration: 'Dayavittu sahaaya maadi, nanage thakshana vaidyaru athava aaspathreya agathyavide!',
        nuance: 'Urgent medical call in Kannada.',
      },
      te: {
        text: 'దయచేసి సహాయం చేయండి, నాకు వెంటనే డాక్టర్ లేదా ఆసుపత్రి అవసరం!',
        transliteration: 'Dayachesi sahaayam cheyandi, naaku ventane doctor leda aasupathri avasaram!',
        nuance: 'Emergency medical statement in Telugu.',
      },
    },
  },
  {
    id: 'how_much_cost',
    category: 'shopping',
    englishConcept: 'How much does this cost?',
    translations: {
      en: {
        text: 'How much does this cost?',
        transliteration: 'How much does this cost?',
        nuance: 'Price inquiry.',
      },
      hi: {
        text: 'यह कितने का है?',
        transliteration: 'Yeh kitne ka hai?',
        dialectVariants: {
          'hi-mumbai': 'इसका कितना हुआ बॉस?',
        },
        nuance: 'Everyday market inquiry.',
      },
      ta: {
        text: 'இது என்ன விலை?',
        transliteration: 'Idhu enna vilai?',
        dialectVariants: {
          'ta-chennai': 'இது எவ்ளோ பாஸ்?',
          'ta-kongu': 'இது என்ன விலைங்க?',
        },
        nuance: 'Shopping query in Tamil Nadu.',
      },
      ml: {
        text: 'ഇതിന് എത്രയാണ് വില?',
        transliteration: 'Ithinu ethrayaanu vila?',
        nuance: 'Market question in Kerala.',
      },
      kn: {
        text: 'ಇದರ ಬೆಲೆ ಎಷ್ಟು?',
        transliteration: 'Idhara bele eshtu?',
        dialectVariants: {
          'kn-karavali': 'ಇದಕ್ಕೆ ಎಷ್ಟು ಮಾರ್ರೆ?',
        },
        nuance: 'Market price check in Karnataka.',
      },
      te: {
        text: 'దీని ధర ఎంత?',
        transliteration: 'Deeni dhara entha?',
        dialectVariants: {
          'te-telangana': 'ఇది ఎంత పడతది అన్నా?',
        },
        nuance: 'Shopping question in Telugu.',
      },
    },
  },
  {
    id: 'do_you_understand',
    category: 'conversational',
    englishConcept: 'Do you understand what I am saying?',
    translations: {
      en: {
        text: 'Do you understand what I am saying?',
        transliteration: 'Do you understand what I am saying?',
        nuance: 'Clarifying comprehension.',
      },
      hi: {
        text: 'क्या आप समझ रहे हैं जो मैं कह रहा हूँ?',
        transliteration: 'Kya aap samajh rahe hain jo main keh raha hoon?',
        dialectVariants: {
          'hi-mumbai': 'अपुन क्या बोल रहा है, समझ में आया क्या?',
        },
        nuance: 'Checking comprehension politely.',
      },
      ta: {
        text: 'நான் சொல்வது உங்களுக்குப் புரிகிறதா?',
        transliteration: 'Naan solvadhu ungalukkup purigiradha?',
        dialectVariants: {
          'ta-chennai': 'நான் சொல்றது புரியுதா பாஸ்?',
        },
        nuance: 'Polite mutual understanding check.',
      },
      ml: {
        text: 'ഞാൻ പറയുന്നത് മനസ്സിലാകുന്നുണ്ടോ?',
        transliteration: 'Njaan parayunnathu manassilaakunnundo?',
        nuance: 'Friendly comprehension check.',
      },
      kn: {
        text: 'ನಾನು ಹೇಳುತ್ತಿರುವುದು ನಿಮಗೆ ಅರ್ಥವಾಗುತ್ತಿದೆಯೇ?',
        transliteration: 'Naanu helutthiruvudu nimage arthavaagutthideye?',
        dialectVariants: {
          'kn-karavali': 'ನಾನು ಹೇಳೋದು ಅರ್ಥ ಆಯ್ತಾ ಮಾರ್ರೆ?',
        },
        nuance: 'Respectful comprehension check in Kannada.',
      },
      te: {
        text: 'నేను చెప్పేది మీకు అర్థమవుతోందా?',
        transliteration: 'Nenu cheppedi meeku arthamavuthonda?',
        dialectVariants: {
          'te-telangana': 'నేను చెప్పేది నీకు సమజ్ అవుతుందా?',
        },
        nuance: 'Clear communication check in Telugu.',
      },
    },
  },
  {
    id: 'nice_to_meet_you',
    category: 'greetings',
    englishConcept: 'Very nice to meet you today.',
    translations: {
      en: {
        text: 'It is very nice to meet you.',
        transliteration: 'It is very nice to meet you.',
        nuance: 'Warm introductory expression.',
      },
      hi: {
        text: 'आपसे मिलकर बहुत खुशी हुई।',
        transliteration: 'Aapse milkar bahut khushi hui.',
        nuance: 'Pleasant introduction in Hindi.',
      },
      ta: {
        text: 'உங்களைச் சந்தித்ததில் மிக்க மகிழ்ச்சி.',
        transliteration: 'Ungalaich sandhithadhil mikka magizhchi.',
        dialectVariants: {
          'ta-chennai': 'உங்கள பாத்ததுல ரொம்ப சந்தோஷம் பாஸ்!',
        },
        nuance: 'Polite and cordial Tamil greeting.',
      },
      ml: {
        text: 'നിങ്ങളെ കണ്ടതിൽ വളരെ സന്തോഷം.',
        transliteration: 'Ningale kandathil valare santhosham.',
        nuance: 'Warm acquaintance phrasing.',
      },
      kn: {
        text: 'ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿದ್ದು ತುಂಬಾ ಸಂತೋಷವಾಯಿತು.',
        transliteration: 'Nimmannu bhetiyaagiddu thumba santhoshavayithu.',
        nuance: 'Pleasant Kannada greeting.',
      },
      te: {
        text: 'మిమ్మల్ని కలవడం చాలా సంతోషంగా ఉంది.',
        transliteration: 'Mimmalni kalavadam chala santhoshanga undi.',
        nuance: 'Hearty welcoming phrase.',
      },
    },
  },
];

// Offline translation lookup with fuzzy keyword matching
export function translateOffline(
  text: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  targetDialect?: string,
): {
  translatedText: string;
  transliteration: string;
  nuanceNotes: string;
  matched: boolean;
} | null {
  const normInput = text.trim().toLowerCase().replace(/[^a-zA-Z0-9\u0900-\u0D7F\s]/g, '');

  for (const phrase of OFFLINE_PHRASES) {
    const srcTrans = phrase.translations[sourceLang];
    if (!srcTrans) continue;

    const nativeMatch = srcTrans.text.toLowerCase().includes(normInput) || normInput.includes(srcTrans.text.toLowerCase());
    const romanMatch = srcTrans.transliteration.toLowerCase().includes(normInput) || normInput.includes(srcTrans.transliteration.toLowerCase());
    const conceptMatch = phrase.englishConcept.toLowerCase().includes(normInput) || normInput.includes(phrase.englishConcept.toLowerCase());

    if (nativeMatch || romanMatch || conceptMatch) {
      const tgtTrans = phrase.translations[targetLang];
      if (tgtTrans) {
        let textResult = tgtTrans.text;
        if (targetDialect && tgtTrans.dialectVariants && tgtTrans.dialectVariants[targetDialect]) {
          textResult = tgtTrans.dialectVariants[targetDialect];
        }
        return {
          translatedText: textResult,
          transliteration: tgtTrans.transliteration,
          nuanceNotes: tgtTrans.nuance,
          matched: true,
        };
      }
    }
  }

  return null;
}
