import { ArrowLeftRight, Sparkles } from 'lucide-react';
import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, LANGUAGE_LIST } from '../data/languages';

interface LanguageSelectorProps {
  sourceLang: LanguageCode | 'auto';
  targetLang: LanguageCode;
  sourceDialect: string;
  targetDialect: string;
  onChangeSourceLang: (lang: LanguageCode | 'auto') => void;
  onChangeTargetLang: (lang: LanguageCode) => void;
  onChangeSourceDialect: (dialect: string) => void;
  onChangeTargetDialect: (dialect: string) => void;
  onSwapLanguages: () => void;
  detectedLang?: LanguageCode;
}

export function LanguageSelector({
  sourceLang,
  targetLang,
  sourceDialect,
  targetDialect,
  onChangeSourceLang,
  onChangeTargetLang,
  onChangeSourceDialect,
  onChangeTargetDialect,
  onSwapLanguages,
  detectedLang,
}: LanguageSelectorProps) {
  const currentSource = sourceLang === 'auto' ? (detectedLang ? SUPPORTED_LANGUAGES[detectedLang] : null) : SUPPORTED_LANGUAGES[sourceLang];
  const currentTarget = SUPPORTED_LANGUAGES[targetLang];

  const sourceDialects = currentSource?.dialects || [];
  const targetDialects = currentTarget?.dialects || [];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        {/* Source Language Column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Speaker Language (Input)
            </label>
            {sourceLang === 'auto' && detectedLang && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Sparkles className="w-3 h-3" /> Auto: {SUPPORTED_LANGUAGES[detectedLang].name}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={sourceLang}
              onChange={(e) => onChangeSourceLang(e.target.value as LanguageCode | 'auto')}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="auto">✨ Auto-Detect Language</option>
              {LANGUAGE_LIST.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} — {lang.nativeName} ({lang.script})
                </option>
              ))}
            </select>
          </div>

          {/* Source Dialect Dropdown */}
          {sourceDialects.length > 0 && sourceLang !== 'auto' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400">Dialect:</span>
              <select
                value={sourceDialect}
                onChange={(e) => onChangeSourceDialect(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-400"
              >
                {sourceDialects.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.region})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Center Swap Button */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={onSwapLanguages}
            title="Swap source and target languages"
            className="w-10 h-10 rounded-full bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-transform active:scale-95 flex items-center justify-center border-2 border-white"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Target Language Column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Listener Language (Translation)
            </label>
            <span className="text-xs font-semibold text-indigo-600">
              {currentTarget.nativeName} ({currentTarget.script})
            </span>
          </div>

          <div className="flex gap-2">
            <select
              value={targetLang}
              onChange={(e) => onChangeTargetLang(e.target.value as LanguageCode)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {LANGUAGE_LIST.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} — {lang.nativeName} ({lang.script})
                </option>
              ))}
            </select>
          </div>

          {/* Target Dialect Dropdown */}
          {targetDialects.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400">Dialect:</span>
              <select
                value={targetDialect}
                onChange={(e) => onChangeTargetDialect(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-400"
              >
                {targetDialects.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.region})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Swap Button */}
      <div className="flex md:hidden justify-center mt-3 pt-3 border-t border-slate-100">
        <button
          onClick={onSwapLanguages}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Swap Languages</span>
        </button>
      </div>
    </div>
  );
}
