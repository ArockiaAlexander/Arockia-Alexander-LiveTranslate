import { useState } from 'react';
import { Sparkles, Volume2, ArrowRight, Play, Check, BookOpen, Layers } from 'lucide-react';
import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, LANGUAGE_LIST } from '../data/languages';
import { DIALECT_SAMPLES, DialectSample } from '../data/dialectSamples';
import { translateAndSpeak } from '../services/translator';
import { indicSpeech } from '../services/indicSpeechService';

interface DialectPlaygroundProps {
  isOfflineMode: boolean;
  onSelectForTranslation: (phrase: string, sourceLang: LanguageCode, targetLang: LanguageCode) => void;
}

export function DialectPlayground({ isOfflineMode, onSelectForTranslation }: DialectPlaygroundProps) {
  const [selectedSample, setSelectedSample] = useState<DialectSample>(DIALECT_SAMPLES[0]);
  const [targetLang, setTargetLang] = useState<LanguageCode>(DIALECT_SAMPLES[0].suggestedTargetLang);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<any | null>(null);

  const currentSourceInfo = SUPPORTED_LANGUAGES[selectedSample.lang];
  const currentTargetInfo = SUPPORTED_LANGUAGES[targetLang];

  const handleTestTranslation = async () => {
    setIsTranslating(true);
    try {
      const res = await translateAndSpeak({
        text: selectedSample.phrase,
        sourceLang: selectedSample.lang,
        targetLang,
        sourceDialect: selectedSample.dialectId,
        forceOffline: isOfflineMode,
      });
      setTranslationResult(res);
      indicSpeech.speak(res.translatedText, res.targetLang, {
        transliteration: res.transliteration,
        dialect: res.targetDialect,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePlaySampleVoice = () => {
    indicSpeech.speak(selectedSample.phrase, selectedSample.lang, {
      transliteration: selectedSample.transliteration,
    });
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Regional Dialect & Slang Precision Engine</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Diverse Dialect Adaptation Across South Asian Languages
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          Indian languages vary dramatically across geographic belts — from Mumbai Bambaiya slang and Chennai Madras Bashai to Malabar Kozhikode hospitality, Mangaluru Karavali intonation, and Telangana colloquialisms.
        </p>
      </div>

      {/* Preset Dialect Selector Cards */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Select a Regional Dialect Sample:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DIALECT_SAMPLES.map((sample) => {
            const isSelected = selectedSample.id === sample.id;
            const lang = SUPPORTED_LANGUAGES[sample.lang];

            return (
              <button
                key={sample.id}
                onClick={() => {
                  setSelectedSample(sample);
                  setTargetLang(sample.suggestedTargetLang);
                  setTranslationResult(null);
                }}
                className={`p-4 rounded-2xl text-left border transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{sample.dialectName}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: lang.color }}
                  />
                </div>
                <div className="text-[11px] font-medium text-slate-500 mb-2">
                  {lang.name} ({lang.nativeName})
                </div>
                <p className="text-xs text-slate-700 line-clamp-2 font-medium">
                  "{sample.phrase}"
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Dialect Inspection & Interactive Test Bench */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Active Dialect
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {selectedSample.dialectName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{selectedSample.nuanceContext}</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlaySampleVoice}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Volume2 className="w-4 h-4" />
              <span>Hear Original</span>
            </button>
          </div>
        </div>

        {/* Phrase Showcase Box */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="text-sm font-bold text-slate-900 leading-relaxed">
            "{selectedSample.phrase}"
          </div>
          <div className="text-xs font-mono text-indigo-700 font-semibold">
            Phonetic: {selectedSample.transliteration}
          </div>
          <div className="text-xs text-slate-600">
            Meaning: <span className="italic">{selectedSample.englishMeaning}</span>
          </div>
        </div>

        {/* Translation Test Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-600">Translate to:</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
            >
              {LANGUAGE_LIST.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} — {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleTestTranslation}
            disabled={isTranslating}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTranslating ? 'Translating...' : 'Translate & Speak Audio'}</span>
          </button>
        </div>

        {/* Translation Result Card */}
        {translationResult && (
          <div className="p-5 bg-gradient-to-br from-indigo-50/60 to-white rounded-2xl border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900 uppercase tracking-wider">
                Translation Output ({currentTargetInfo.name}):
              </span>
              <span className="font-mono text-slate-500">
                ⚡ {translationResult.latencyMs}ms ({translationResult.engine})
              </span>
            </div>

            <div className="text-xl font-bold text-slate-900">
              {translationResult.translatedText}
            </div>

            {translationResult.transliteration && translationResult.targetLang !== 'en' && (
              <div className="text-xs font-mono text-indigo-700 font-semibold">
                Pronunciation: {translationResult.transliteration}
              </div>
            )}

            {translationResult.nuanceNotes && (
              <div className="p-3 bg-white rounded-xl border border-indigo-100 text-xs text-slate-700">
                <strong className="text-indigo-900 block mb-1">Nuance & Register Notes:</strong>
                {translationResult.nuanceNotes}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() =>
                  indicSpeech.speak(translationResult.translatedText, translationResult.targetLang, {
                    transliteration: translationResult.transliteration,
                    dialect: translationResult.targetDialect,
                  })
                }
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>🇮🇳 Replay (Indian Voice)</span>
              </button>

              <button
                onClick={() =>
                  onSelectForTranslation(selectedSample.phrase, selectedSample.lang, targetLang)
                }
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
              >
                Open in Live Studio <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Regional Dialects Overview Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Layers className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-base">Regional Dialect Guide & Honorific Systems</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LANGUAGE_LIST.map((lang) => (
            <div key={lang.code} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-900 text-sm">{lang.name}</span>
                <span className="font-semibold text-slate-500">{lang.nativeName}</span>
              </div>
              <div className="space-y-1.5">
                {lang.dialects.map((d) => (
                  <div key={d.id} className="bg-white p-2 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-800">{d.name}</div>
                    <div className="text-[11px] text-slate-500 mb-1">{d.region}</div>
                    <div className="text-[11px] text-slate-600">{d.description}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {d.honorifics.map((h, i) => (
                        <span key={i} className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
