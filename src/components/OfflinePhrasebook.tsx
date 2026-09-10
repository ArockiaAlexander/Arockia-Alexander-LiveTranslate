import { useState } from 'react';
import { Volume2, Search, WifiOff, Sparkles, Filter, Check } from 'lucide-react';
import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, LANGUAGE_LIST } from '../data/languages';
import { OFFLINE_PHRASES, OfflinePhrase } from '../services/offlineDictionary';
import { indicSpeech } from '../services/indicSpeechService';

interface OfflinePhrasebookProps {
  onSelectPhrase: (phrase: string, sourceLang: LanguageCode, targetLang: LanguageCode) => void;
}

export function OfflinePhrasebook({ onSelectPhrase }: OfflinePhrasebookProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [targetLang, setTargetLang] = useState<LanguageCode>('ta');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Phrases' },
    { id: 'greetings', label: 'Greetings' },
    { id: 'travel', label: 'Travel & Transit' },
    { id: 'shopping', label: 'Food & Shopping' },
    { id: 'emergency', label: 'Emergency & Medical' },
    { id: 'conversational', label: 'Conversational' },
  ];

  const filteredPhrases = OFFLINE_PHRASES.filter((phrase) => {
    if (selectedCategory !== 'all' && phrase.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const conceptMatch = phrase.englishConcept.toLowerCase().includes(query);
    const transMatch = Object.values(phrase.translations).some(
      (t) => t.text.toLowerCase().includes(query) || t.transliteration.toLowerCase().includes(query),
    );
    return conceptMatch || transMatch;
  });

  const handleSpeakPhrase = (phrase: OfflinePhrase) => {
    const trans = phrase.translations[targetLang];
    if (!trans) return;

    setPlayingId(phrase.id);
    indicSpeech.speak(trans.text, targetLang, {
      transliteration: trans.transliteration,
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null),
    });
  };

  return (
    <div className="space-y-6">
      {/* Offline Banner */}
      <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
          <WifiOff className="w-4 h-4" />
          <span>Zero-Latency Offline Speech Engine</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Offline Voice Phrasebook (6 South Asian Languages)
        </h2>
        <p className="text-xs sm:text-sm text-emerald-200 mt-2 max-w-2xl leading-relaxed">
          Every phrase below operates 100% offline without network requests, backed by device speech synthesis and phonetic Romanized transliterations.
        </p>
      </div>

      {/* Target Language & Search Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Target Output Language:</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
            >
              {LANGUAGE_LIST.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} — {lang.nativeName} ({lang.script})
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phrases or English words..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phrases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPhrases.map((phrase) => {
          const trans = phrase.translations[targetLang];
          const isSpeaking = playingId === phrase.id;

          return (
            <div
              key={phrase.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {phrase.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">0ms offline</span>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {phrase.englishConcept}
                </div>

                {/* Target Language Translation */}
                <div className="text-base font-bold text-slate-900 tracking-wide pt-1">
                  {trans.text}
                </div>

                {/* Romanized Phonetics */}
                {trans.transliteration && targetLang !== 'en' && (
                  <div className="text-xs font-mono text-emerald-800 font-medium">
                    Phonetics: {trans.transliteration}
                  </div>
                )}

                {/* Nuance / Dialect variants */}
                <div className="text-[11px] text-slate-500 italic">
                  {trans.nuance}
                </div>

                {trans.dialectVariants && Object.keys(trans.dialectVariants).length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Regional Dialect Variants:
                    </span>
                    {Object.entries(trans.dialectVariants).map(([dId, variant]) => (
                      <div key={dId} className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-500 mr-1.5">• {dId.split('-')[1] || dId}:</span>
                        "{variant}"
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleSpeakPhrase(phrase)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSpeaking
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isSpeaking ? 'Speaking...' : 'Speak Offline'}</span>
                </button>

                <button
                  onClick={() => onSelectPhrase(phrase.translations.en.text, 'en', targetLang)}
                  className="text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
                >
                  Use in Studio →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
