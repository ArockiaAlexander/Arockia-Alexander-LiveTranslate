import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, RotateCcw, Copy, Check, Sparkles, MessageSquare } from 'lucide-react';
import { LanguageCode, ConversationTurn } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { AudioWaveform } from './AudioWaveform';
import { liveSpeechManager } from '../services/speechRecognition';
import { indicSpeech } from '../services/indicSpeechService';
import { translateAndSpeak } from '../services/translator';

interface DualSpeakerModeProps {
  langA: LanguageCode;
  langB: LanguageCode;
  dialectA: string;
  dialectB: string;
  isOfflineMode: boolean;
  autoSpeak: boolean;
  conversation: ConversationTurn[];
  onAddTurn: (turn: ConversationTurn) => void;
  onClearConversation: () => void;
}

export function DualSpeakerMode({
  langA,
  langB,
  dialectA,
  dialectB,
  isOfflineMode,
  autoSpeak,
  conversation,
  onAddTurn,
  onClearConversation,
}: DualSpeakerModeProps) {
  const [activeSpeaker, setActiveSpeaker] = useState<'A' | 'B' | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  const speakerAInfo = SUPPORTED_LANGUAGES[langA];
  const speakerBInfo = SUPPORTED_LANGUAGES[langB];

  // Poll microphone audio levels when active
  useEffect(() => {
    let animId: number;
    if (activeSpeaker) {
      const updateLevel = () => {
        setAudioLevel(liveSpeechManager.getAudioLevels());
        animId = requestAnimationFrame(updateLevel);
      };
      animId = requestAnimationFrame(updateLevel);
    } else {
      setAudioLevel(0);
    }
    return () => cancelAnimationFrame(animId);
  }, [activeSpeaker]);

  const handleStartSpeaking = async (speaker: 'A' | 'B') => {
    if (activeSpeaker) {
      handleStopSpeaking();
      return;
    }

    const sourceLang = speaker === 'A' ? langA : langB;
    setActiveSpeaker(speaker);
    setInterimTranscript('');

    await liveSpeechManager.startListening(sourceLang, {
      onInterimResult: (text) => {
        setInterimTranscript(text);
      },
      onFinalResult: (text) => {
        handleProcessSpeech(speaker, text);
      },
      onError: (err) => {
        console.warn('Speech error in dual mode:', err);
        setActiveSpeaker(null);
      },
      onEnd: () => {
        setActiveSpeaker(null);
      },
    });
  };

  const handleStopSpeaking = () => {
    liveSpeechManager.stopListening();
    setActiveSpeaker(null);
  };

  const handleProcessSpeech = async (speaker: 'A' | 'B', originalText: string) => {
    if (!originalText.trim()) return;

    setActiveSpeaker(null);
    setIsTranslating(true);

    const sourceLang = speaker === 'A' ? langA : langB;
    const targetLang = speaker === 'A' ? langB : langA;
    const sourceDialect = speaker === 'A' ? dialectA : dialectB;
    const targetDialect = speaker === 'A' ? dialectB : dialectA;

    try {
      const turnId = 'turn_' + Date.now();
      const res = await translateAndSpeak(
        {
          text: originalText,
          sourceLang,
          targetLang,
          sourceDialect,
          targetDialect,
          forceOffline: isOfflineMode,
        },
        {
          autoSpeak,
          onStartSpeaking: () => setCurrentlySpeakingId(turnId),
          onFinishSpeaking: () => setCurrentlySpeakingId(null),
        },
      );

      const newTurn: ConversationTurn = {
        id: turnId,
        sender: speaker === 'A' ? 'speakerA' : 'speakerB',
        speakerName: speaker === 'A' ? `Speaker A (${speakerAInfo.name})` : `Speaker B (${speakerBInfo.name})`,
        sourceLang,
        targetLang,
        sourceDialect,
        targetDialect,
        originalText,
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
    } catch (e) {
      console.error('Failed translation in dual mode:', e);
    } finally {
      setIsTranslating(false);
      setInterimTranscript('');
    }
  };

  const handlePlayVoice = (turn: ConversationTurn, slowRate = false) => {
    setCurrentlySpeakingId(turn.id);
    indicSpeech.speak(turn.translatedText, turn.targetLang, {
      transliteration: turn.transliteration,
      dialect: turn.targetDialect,
      speed: slowRate ? 'slow' : 'normal',
      onEnd: () => setCurrentlySpeakingId(null),
      onError: () => setCurrentlySpeakingId(null),
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Face-to-Face Split Audio Stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Speaker A Side */}
        <div
          className={`rounded-3xl p-6 border-2 transition-all shadow-sm ${
            activeSpeaker === 'A'
              ? 'border-orange-500 bg-orange-50/50 ring-4 ring-orange-500/10'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                A
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {speakerAInfo.name} ({speakerAInfo.nativeName})
                </h3>
                <span className="text-xs text-slate-500">
                  Target ➔ {speakerBInfo.name}
                </span>
              </div>
            </div>
            {activeSpeaker === 'A' && (
              <span className="animate-pulse px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                Listening...
              </span>
            )}
          </div>

          <div className="h-12 flex items-center justify-center">
            {activeSpeaker === 'A' ? (
              <AudioWaveform isActive={true} level={audioLevel} color="#EA580C" barsCount={24} />
            ) : (
              <span className="text-xs text-slate-400">Tap microphone to speak in {speakerAInfo.name}</span>
            )}
          </div>

          <div className="mt-4 flex flex-col items-center">
            <button
              onClick={() => (activeSpeaker === 'A' ? handleStopSpeaking() : handleStartSpeaking('A'))}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
                activeSpeaker === 'A'
                  ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-500/20'
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
              }`}
            >
              {activeSpeaker === 'A' ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            <span className="text-[11px] font-semibold text-slate-500 mt-2">
              {activeSpeaker === 'A' ? 'Tap to finish' : `Speak in ${speakerAInfo.name}`}
            </span>
          </div>
        </div>

        {/* Speaker B Side */}
        <div
          className={`rounded-3xl p-6 border-2 transition-all shadow-sm ${
            activeSpeaker === 'B'
              ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                B
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {speakerBInfo.name} ({speakerBInfo.nativeName})
                </h3>
                <span className="text-xs text-slate-500">
                  Target ➔ {speakerAInfo.name}
                </span>
              </div>
            </div>
            {activeSpeaker === 'B' && (
              <span className="animate-pulse px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                Listening...
              </span>
            )}
          </div>

          <div className="h-12 flex items-center justify-center">
            {activeSpeaker === 'B' ? (
              <AudioWaveform isActive={true} level={audioLevel} color="#2563EB" barsCount={24} />
            ) : (
              <span className="text-xs text-slate-400">Tap microphone to speak in {speakerBInfo.name}</span>
            )}
          </div>

          <div className="mt-4 flex flex-col items-center">
            <button
              onClick={() => (activeSpeaker === 'B' ? handleStopSpeaking() : handleStartSpeaking('B'))}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
                activeSpeaker === 'B'
                  ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
              }`}
            >
              {activeSpeaker === 'B' ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            <span className="text-[11px] font-semibold text-slate-500 mt-2">
              {activeSpeaker === 'B' ? 'Tap to finish' : `Speak in ${speakerBInfo.name}`}
            </span>
          </div>
        </div>
      </div>

      {/* Interim live speech stream bar */}
      {(interimTranscript || isTranslating) && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-sm font-medium">
              {isTranslating ? 'Translating & synthesizing voice...' : `Recognizing: "${interimTranscript}"`}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {isOfflineMode ? 'Offline Local Engine' : 'Gemini AI Live'}
          </span>
        </div>
      )}

      {/* Conversation History Stream */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-sm">Live Translated Dialogue</h3>
            <span className="text-xs text-slate-400">({conversation.length} exchanges)</span>
          </div>
          {conversation.length > 0 && (
            <button
              onClick={onClearConversation}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Session
            </button>
          )}
        </div>

        {conversation.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm">No speech recorded yet.</p>
            <p className="text-xs mt-1">Tap Speaker A or Speaker B microphone button above to start talking.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {conversation.map((turn) => {
              const isSpeakerA = turn.sender === 'speakerA';
              const targetLangInfo = SUPPORTED_LANGUAGES[turn.targetLang];
              const isSpeaking = currentlySpeakingId === turn.id;

              return (
                <div
                  key={turn.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSpeakerA ? 'bg-orange-50/40 border-orange-200 ml-0 mr-6' : 'bg-blue-50/40 border-blue-200 ml-6 mr-0'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">{turn.speakerName}</span>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                        ⚡ {turn.latencyMs}ms ({turn.engine})
                      </span>
                    </div>
                  </div>

                  {/* Spoken Original */}
                  <div className="text-xs text-slate-500 mb-1">
                    Spoken: <span className="text-slate-800 italic">"{turn.originalText}"</span>
                  </div>

                  {/* Translated Output */}
                  <div className="text-base font-bold text-slate-900 tracking-wide mt-1">
                    {turn.translatedText}
                  </div>

                  {/* Romanized Transliteration */}
                  {turn.transliteration && turn.targetLang !== 'en' && (
                    <div className="text-xs text-indigo-700 font-medium mt-1 font-mono">
                      Phonetic: {turn.transliteration}
                    </div>
                  )}

                  {/* Dialect Nuance Pill */}
                  {turn.nuanceNotes && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-200 flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{turn.nuanceNotes}</span>
                    </div>
                  )}

                  {/* Playback & Action Controls */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePlayVoice(turn, false)}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          isSpeaking ? 'bg-amber-600 text-white animate-pulse' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isSpeaking ? 'Speaking...' : '🇮🇳 Play Voice'}</span>
                      </button>

                      <button
                        onClick={() => handlePlayVoice(turn, true)}
                        title="Play slowly with clear Indian articulation"
                        className="px-2 py-1 rounded-lg text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 bg-white"
                      >
                        0.8x Slow
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopy(turn.translatedText, turn.id)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded transition-colors"
                      title="Copy translated text"
                    >
                      {copiedId === turn.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
