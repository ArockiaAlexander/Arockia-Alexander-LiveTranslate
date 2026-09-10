import { useState, useEffect, FormEvent } from 'react';
import { Mic, MicOff, Volume2, Send, Copy, Check, Sparkles, RotateCcw, AlertTriangle, Play } from 'lucide-react';
import { LanguageCode, ConversationTurn, TranslationResponse } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { AudioWaveform } from './AudioWaveform';
import { liveSpeechManager } from '../services/speechRecognition';
import { indicSpeech } from '../services/indicSpeechService';
import { translateAndSpeak } from '../services/translator';
import { DIALECT_SAMPLES } from '../data/dialectSamples';

interface SingleTranslatorViewProps {
  sourceLang: LanguageCode | 'auto';
  targetLang: LanguageCode;
  sourceDialect: string;
  targetDialect: string;
  isOfflineMode: boolean;
  autoSpeak: boolean;
  conversation: ConversationTurn[];
  onAddTurn: (turn: ConversationTurn) => void;
  onClearConversation: () => void;
  detectedLang?: LanguageCode;
}

export function SingleTranslatorView({
  sourceLang,
  targetLang,
  sourceDialect,
  targetDialect,
  isOfflineMode,
  autoSpeak,
  conversation,
  onAddTurn,
  onClearConversation,
  detectedLang,
}: SingleTranslatorViewProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [latestResult, setLatestResult] = useState<TranslationResponse | null>(null);
  const [isSpeakingLatest, setIsSpeakingLatest] = useState(false);
  const [copied, setCopied] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const targetLangInfo = SUPPORTED_LANGUAGES[targetLang];
  const effectiveSource = sourceLang === 'auto' ? (detectedLang ? SUPPORTED_LANGUAGES[detectedLang] : null) : SUPPORTED_LANGUAGES[sourceLang];

  // Poll mic audio level
  useEffect(() => {
    let animId: number;
    if (isListening) {
      const updateLevel = () => {
        setAudioLevel(liveSpeechManager.getAudioLevels());
        animId = requestAnimationFrame(updateLevel);
      };
      animId = requestAnimationFrame(updateLevel);
    } else {
      setAudioLevel(0);
    }
    return () => cancelAnimationFrame(animId);
  }, [isListening]);

  const handleToggleMic = async () => {
    if (isListening) {
      liveSpeechManager.stopListening();
      setIsListening(false);
      return;
    }

    setMicError(null);
    setInterimTranscript('');

    const started = await liveSpeechManager.startListening(sourceLang, {
      onStart: () => setIsListening(true),
      onInterimResult: (text) => setInterimTranscript(text),
      onFinalResult: (text) => {
        setIsListening(false);
        setInterimTranscript('');
        executeTranslation(text);
      },
      onError: (err) => {
        console.warn('Microphone error:', err);
        setIsListening(false);
        if (err === 'not-allowed') {
          setMicError('Microphone permission blocked. You can type below or test preset dialect samples.');
        } else {
          setMicError(`Recognition error (${err}). You can enter text below.`);
        }
      },
      onEnd: () => setIsListening(false),
    });

    if (!started) {
      setMicError('Speech recognition not directly supported in this browser. Please use text input or click a preset sample below.');
    }
  };

  const executeTranslation = async (textToTranslate: string) => {
    if (!textToTranslate.trim()) return;

    setIsTranslating(true);
    setMicError(null);

    try {
      const turnId = 'turn_' + Date.now();
      const res = await translateAndSpeak(
        {
          text: textToTranslate,
          sourceLang,
          targetLang,
          sourceDialect,
          targetDialect,
          forceOffline: isOfflineMode,
        },
        {
          autoSpeak,
          onStartSpeaking: () => setIsSpeakingLatest(true),
          onFinishSpeaking: () => setIsSpeakingLatest(false),
        },
      );

      setLatestResult(res);

      const effectiveSourceCode = res.detectedLanguage || (sourceLang === 'auto' ? 'en' : sourceLang);
      const newTurn: ConversationTurn = {
        id: turnId,
        sender: 'speakerA',
        speakerName: SUPPORTED_LANGUAGES[effectiveSourceCode]?.name || 'Speaker',
        sourceLang: effectiveSourceCode,
        targetLang: res.targetLang,
        sourceDialect: res.sourceDialect || sourceDialect,
        targetDialect: res.targetDialect || targetDialect,
        originalText: textToTranslate,
        translatedText: res.translatedText,
        transliteration: res.transliteration,
        detectedLang: res.detectedLanguage,
        detectedDialect: res.detectedDialect,
        nuanceNotes: res.nuanceNotes,
        timestamp: Date.now(),
        latencyMs: res.latencyMs,
        engine: res.engine,
      };

      onAddTurn(newTurn);
      setTextInput('');
    } catch (err: any) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    executeTranslation(textInput);
  };

  const handleSpeakLatest = (slow = false) => {
    if (!latestResult) return;
    setIsSpeakingLatest(true);
    indicSpeech.speak(latestResult.translatedText, latestResult.targetLang, {
      transliteration: latestResult.transliteration,
      dialect: latestResult.targetDialect,
      speed: slow ? 'slow' : 'normal',
      onEnd: () => setIsSpeakingLatest(false),
      onError: () => setIsSpeakingLatest(false),
    });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick preset sample click
  const handleSampleClick = (sample: typeof DIALECT_SAMPLES[0]) => {
    setTextInput(sample.phrase);
    executeTranslation(sample.phrase);
  };

  return (
    <div className="space-y-6">
      {/* Microphone Control Stage */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Subtle decorative background pulse when active */}
        {isListening && (
          <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
        )}

        <div className="mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {sourceLang === 'auto'
              ? 'Speak in any language (Auto-Detect)'
              : `Speak in ${effectiveSource?.name || 'Indic Language'}`}
          </span>
          <p className="text-xs text-slate-400 mt-0.5">
            Translates instantly to <strong className="text-slate-700">{targetLangInfo.name} ({targetLangInfo.nativeName})</strong>
          </p>
        </div>

        {/* Audio Waveform Live Visualizer */}
        <div className="h-10 my-2 w-full max-w-xs flex items-center justify-center">
          <AudioWaveform
            isActive={isListening}
            isSpeaking={isSpeakingLatest}
            level={audioLevel}
            color={targetLangInfo.color}
            barsCount={28}
          />
        </div>

        {/* Main Microphone Button */}
        <div className="relative my-3">
          {isListening && (
            <div className="absolute -inset-3 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
          )}
          <button
            onClick={handleToggleMic}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-150 active:scale-95 ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 ring-8 ring-red-500/20'
                : 'bg-gradient-to-tr from-orange-500 via-red-500 to-rose-600 hover:opacity-95 shadow-orange-500/30'
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>
        </div>

        <p className="text-xs font-semibold text-slate-600">
          {isListening ? 'Listening to speech... Tap to translate' : 'Click to start speaking'}
        </p>

        {/* Interim live speech stream */}
        {interimTranscript && (
          <div className="mt-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 max-w-md w-full animate-fade-in">
            <span className="text-slate-400 text-xs mr-2">Recognizing:</span>
            "{interimTranscript}"
          </div>
        )}

        {/* Microphone Error Notification */}
        {micError && (
          <div className="mt-4 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2 max-w-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{micError}</span>
          </div>
        )}

        {/* Alternative Manual Text Input Form */}
        <form onSubmit={handleManualSubmit} className="mt-6 w-full max-w-xl">
          <div className="relative flex items-center">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Or type here in ${effectiveSource?.name || 'English/Hindi/Tamil...'} or Roman letters...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-12 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={isTranslating || !textInput.trim()}
              className="absolute right-2 p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Sample Dialect Quick Chips */}
        <div className="mt-4 flex items-center flex-wrap justify-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium">Try dialect:</span>
          {DIALECT_SAMPLES.slice(0, 4).map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSampleClick(sample)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
            >
              {sample.dialectName.split(' ')[0]} ({SUPPORTED_LANGUAGES[sample.lang].name})
            </button>
          ))}
        </div>
      </div>

      {/* Latest Translated Output Card */}
      {latestResult && (
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: targetLangInfo.color }}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Translation ➔ {targetLangInfo.name} ({targetLangInfo.nativeName})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                ⚡ {latestResult.latencyMs}ms ({latestResult.engine})
              </span>
              {latestResult.confidence && (
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {Math.round(latestResult.confidence * 100)}% accuracy
                </span>
              )}
            </div>
          </div>

          {/* Original Text */}
          <div className="text-xs text-slate-500">
            Input: <span className="text-slate-800 font-medium">"{latestResult.sourceText}"</span>
          </div>

          {/* Large Native Script Output */}
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-relaxed py-1">
            {latestResult.translatedText}
          </div>

          {/* Romanized Phonetic Transliteration */}
          {latestResult.transliteration && latestResult.targetLang !== 'en' && (
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block mb-0.5">
                Pronunciation (Phonetics)
              </span>
              <p className="text-sm font-semibold text-indigo-950 font-mono">
                {latestResult.transliteration}
              </p>
            </div>
          )}

          {/* Dialect / Cultural Nuance Notes */}
          {latestResult.nuanceNotes && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Dialect & Register Adaptation:</strong>
                <span>{latestResult.nuanceNotes}</span>
              </div>
            </div>
          )}

          {/* Audio & Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSpeakLatest(false)}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isSpeakingLatest
                    ? 'bg-amber-600 text-white animate-pulse'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isSpeakingLatest ? 'Speaking...' : 'Play Voice'}</span>
              </button>

              <button
                onClick={() => handleSpeakLatest(true)}
                title="Play voice slowly for learning phonetics and accents"
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                0.8x Slow
              </button>

              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg">
                <span>🇮🇳</span>
                <span>Indian Accent</span>
              </span>
            </div>

            <button
              onClick={() => handleCopyText(latestResult.translatedText)}
              className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Conversation History Stream */}
      {conversation.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Recent Translation History</h3>
            <button
              onClick={onClearConversation}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear History
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {conversation.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {SUPPORTED_LANGUAGES[item.sourceLang]?.name} ➔ {SUPPORTED_LANGUAGES[item.targetLang]?.name}
                  </span>
                  <span className="font-mono text-[11px]">⚡ {item.latencyMs}ms</span>
                </div>
                <div className="text-slate-600 italic">"{item.originalText}"</div>
                <div className="font-bold text-slate-900 text-sm">{item.translatedText}</div>
                {item.transliteration && item.targetLang !== 'en' && (
                  <div className="text-indigo-600 font-mono text-[11px]">{item.transliteration}</div>
                )}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => indicSpeech.speak(item.translatedText, item.targetLang, { transliteration: item.transliteration, dialect: item.targetDialect })}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-amber-700"
                  >
                    <Volume2 className="w-3 h-3" /> Replay (Indian Voice)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
