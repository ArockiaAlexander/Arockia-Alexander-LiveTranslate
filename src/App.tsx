/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LanguageCode, ConversationTurn, SystemVoiceStatus } from './types';
import { SUPPORTED_LANGUAGES } from './data/languages';
import { offlineTTS } from './services/offlineTTS';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { SingleTranslatorView } from './components/SingleTranslatorView';
import { ConferenceView } from './components/ConferenceView';
import { DualSpeakerMode } from './components/DualSpeakerMode';
import { DialectPlayground } from './components/DialectPlayground';
import { OfflinePhrasebook } from './components/OfflinePhrasebook';

export default function App() {
  const [activeView, setActiveView] = useState<'single' | 'conference' | 'dual' | 'dialect' | 'offline'>('conference');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Language & Dialect states
  const [sourceLang, setSourceLang] = useState<LanguageCode | 'auto'>('hi');
  const [targetLang, setTargetLang] = useState<LanguageCode>('ta');
  const [sourceDialect, setSourceDialect] = useState('hi-standard');
  const [targetDialect, setTargetDialect] = useState('ta-standard');
  const [detectedLang, setDetectedLang] = useState<LanguageCode | undefined>('hi');

  // Dual mode specific speaker states
  const [dualLangA, setDualLangA] = useState<LanguageCode>('ta');
  const [dualLangB, setDualLangB] = useState<LanguageCode>('hi');
  const [dualDialectA, setDualDialectA] = useState('ta-standard');
  const [dualDialectB, setDualDialectB] = useState('hi-standard');

  // System voices status
  const [voiceStatus, setVoiceStatus] = useState<SystemVoiceStatus>({
    hasSpeechRecognition: false,
    hasSpeechSynthesis: false,
    availableVoices: [],
    supportedLanguages: {
      hi: false,
      ta: false,
      ml: false,
      kn: false,
      te: false,
      en: false,
    },
  });

  // Conversation history
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);

  useEffect(() => {
    // Check voice support
    const updateVoices = () => {
      const status = offlineTTS.getSystemVoiceStatus();
      setVoiceStatus(status);
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') {
      const nextTarget = detectedLang || 'en';
      setSourceLang(targetLang);
      setTargetLang(nextTarget);
    } else {
      const prevSource = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(prevSource);

      const prevSourceDialect = sourceDialect;
      setSourceDialect(targetDialect);
      setTargetDialect(prevSourceDialect);
    }
  };

  const handleSourceLangChange = (newLang: LanguageCode | 'auto') => {
    setSourceLang(newLang);
    if (newLang !== 'auto') {
      const defaultD = SUPPORTED_LANGUAGES[newLang]?.defaultDialect || '';
      setSourceDialect(defaultD);
    }
  };

  const handleTargetLangChange = (newLang: LanguageCode) => {
    setTargetLang(newLang);
    const defaultD = SUPPORTED_LANGUAGES[newLang]?.defaultDialect || '';
    setTargetDialect(defaultD);
  };

  const handleAddTurn = (turn: ConversationTurn) => {
    setConversation((prev) => [turn, ...prev]);
    if (turn.detectedLang) {
      setDetectedLang(turn.detectedLang);
    }
  };

  const handleClearConversation = () => {
    setConversation([]);
  };

  const handleSelectPhraseForStudio = (phrase: string, src: LanguageCode, tgt: LanguageCode) => {
    setSourceLang(src);
    setTargetLang(tgt);
    setActiveView('single');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Header */}
      <Header
        isOfflineMode={isOfflineMode}
        onToggleOfflineMode={() => setIsOfflineMode((prev) => !prev)}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={() => setAutoSpeak((prev) => !prev)}
        voiceStatus={voiceStatus}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Language Selector Bar (Shown in Single Mode) */}
        {activeView === 'single' && (
          <LanguageSelector
            sourceLang={sourceLang}
            targetLang={targetLang}
            sourceDialect={sourceDialect}
            targetDialect={targetDialect}
            onChangeSourceLang={handleSourceLangChange}
            onChangeTargetLang={handleTargetLangChange}
            onChangeSourceDialect={setSourceDialect}
            onChangeTargetDialect={setTargetDialect}
            onSwapLanguages={handleSwapLanguages}
            detectedLang={detectedLang}
          />
        )}

        {/* View Routing */}
        {activeView === 'single' && (
          <SingleTranslatorView
            sourceLang={sourceLang}
            targetLang={targetLang}
            sourceDialect={sourceDialect}
            targetDialect={targetDialect}
            isOfflineMode={isOfflineMode}
            autoSpeak={autoSpeak}
            conversation={conversation}
            onAddTurn={handleAddTurn}
            onClearConversation={handleClearConversation}
            detectedLang={detectedLang}
          />
        )}

        {activeView === 'conference' && (
          <ConferenceView
            isOfflineMode={isOfflineMode}
            autoSpeak={autoSpeak}
          />
        )}

        {activeView === 'dual' && (
          <DualSpeakerMode
            langA={dualLangA}
            langB={dualLangB}
            dialectA={dualDialectA}
            dialectB={dualDialectB}
            isOfflineMode={isOfflineMode}
            autoSpeak={autoSpeak}
            conversation={conversation}
            onAddTurn={handleAddTurn}
            onClearConversation={handleClearConversation}
          />
        )}

        {activeView === 'dialect' && (
          <DialectPlayground
            isOfflineMode={isOfflineMode}
            onSelectForTranslation={handleSelectPhraseForStudio}
          />
        )}

        {activeView === 'offline' && (
          <OfflinePhrasebook onSelectPhrase={handleSelectPhraseForStudio} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">IndicVoice Live</span>
            <span>•</span>
            <span>Real-time Speech-to-Speech Translation</span>
          </div>

          <div className="flex items-center space-x-4">
            <span>Supported: हिन्दी • தமிழ் • മലയാളം • ಕನ್ನಡ • తెలుగు • English</span>
            <span>•</span>
            <span className="font-mono text-emerald-600 font-semibold">Low-Latency Pipeline</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
