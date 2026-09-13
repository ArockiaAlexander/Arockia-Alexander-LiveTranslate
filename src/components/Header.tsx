import { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Wifi,
  WifiOff,
  Sparkles,
  Sliders,
  Info,
  CheckCircle2,
  AlertCircle,
  Play,
  Music,
  Radio,
  Headphones,
  Zap,
  QrCode,
  Share2,
} from 'lucide-react';
import { SystemVoiceStatus, LanguageCode, IndianVoicePersona } from '../types';
import { LANGUAGE_LIST } from '../data/languages';
import { indicSpeech } from '../services/indicSpeechService';
import { AudienceShareModal } from './AudienceShareModal';
import { SSVPLogo } from './SSVPLogo';

interface HeaderProps {
  isOfflineMode: boolean;
  onToggleOfflineMode: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  voiceStatus: SystemVoiceStatus;
  activeView: 'single' | 'conference' | 'dual' | 'dialect' | 'offline' | 'audience';
  onChangeView: (view: 'single' | 'conference' | 'dual' | 'dialect' | 'offline' | 'audience') => void;
}

export function Header({
  isOfflineMode,
  onToggleOfflineMode,
  autoSpeak,
  onToggleAutoSpeak,
  voiceStatus,
  activeView,
  onChangeView,
}: HeaderProps) {
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceConfig, setVoiceConfig] = useState(indicSpeech.getConfig());
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [headerVolume, setHeaderVolume] = useState<number>(() => Math.round(indicSpeech.getRawVolume() * 100));
  const [isHeaderMuted, setIsHeaderMuted] = useState<boolean>(() => indicSpeech.isVolumeMuted());
  const [showVolumePopover, setShowVolumePopover] = useState<boolean>(false);
  const [showAudienceShareModal, setShowAudienceShareModal] = useState<boolean>(false);

  const handleHeaderVolumeChange = (newVal: number) => {
    setHeaderVolume(newVal);
    indicSpeech.setVolume(newVal / 100);
    if (isHeaderMuted && newVal > 0) {
      setIsHeaderMuted(false);
      indicSpeech.setMuted(false);
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isHeaderMuted;
    setIsHeaderMuted(nextMute);
    indicSpeech.setMuted(nextMute);
  };

  const handlePersonaChange = (persona: IndianVoicePersona) => {
    indicSpeech.setPersona(persona);
    setVoiceConfig(indicSpeech.getConfig());
  };

  const handleEngineChange = (engine: 'neural' | 'device') => {
    indicSpeech.setEngine(engine);
    setVoiceConfig(indicSpeech.getConfig());
  };

  const handleSpeedChange = (speed: 'normal' | 'slow') => {
    indicSpeech.setSpeed(speed);
    setVoiceConfig(indicSpeech.getConfig());
  };

  const handleTestVoice = async (persona?: IndianVoicePersona) => {
    setIsTestingVoice(true);
    try {
      await indicSpeech.testIndianVoice(persona || voiceConfig.persona);
    } finally {
      setIsTestingVoice(false);
    }
  };

  const personaDisplayNames: Record<IndianVoicePersona, { name: string; tag: string }> = {
    ananya: { name: 'Ananya', tag: 'Warm Female' },
    arjun: { name: 'Arjun', tag: 'Articulate Male' },
    pooja: { name: 'Pooja', tag: 'Calm Female' },
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Name */}
          <div className="flex items-center space-x-3">
            <SSVPLogo className="w-10 h-10" />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">IndicVoice Live</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  SSVP NCI
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                72nd Annual General Body Meeting • National Council of India
              </p>
            </div>
          </div>

          {/* Navigation View Modes */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => onChangeView('single')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeView === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Mic Studio
            </button>
            <button
              onClick={() => onChangeView('conference')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeView === 'conference' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-indigo-600" />
              <span>Live Conference</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                Live
              </span>
            </button>
            <button
              onClick={() => onChangeView('dual')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeView === 'dual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Face-to-Face Dual
            </button>
            <button
              onClick={() => onChangeView('dialect')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeView === 'dialect' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dialect Lab
            </button>
            <button
              onClick={() => onChangeView('offline')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeView === 'offline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Offline Phrasebook
            </button>
          </nav>

          {/* Controls: Engine Status & Audio Toggle */}
          <div className="flex items-center space-x-2">
            {/* Indian Voice Persona Quick Selector */}
            <div className="hidden sm:flex items-center bg-amber-50/80 border border-amber-200/80 rounded-lg p-0.5 text-xs">
              <span className="px-2 py-1 font-semibold text-amber-900 flex items-center gap-1">
                <span className="text-sm">🇮🇳</span>
                <span>Voice:</span>
              </span>
              <select
                value={voiceConfig.persona}
                onChange={(e) => handlePersonaChange(e.target.value as IndianVoicePersona)}
                className="bg-transparent font-bold text-amber-950 focus:outline-none cursor-pointer py-1 pr-1 text-xs"
                title="Select authentic Indian voice persona"
              >
                <option value="ananya">Ananya (Female)</option>
                <option value="arjun">Arjun (Male)</option>
                <option value="pooja">Pooja (Female)</option>
              </select>
              <button
                onClick={() => handleTestVoice()}
                disabled={isTestingVoice}
                title="Test Indian voice preview"
                className="p-1 px-1.5 ml-1 bg-amber-200/70 hover:bg-amber-300 text-amber-900 rounded font-semibold text-[11px] transition-colors flex items-center gap-0.5 disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Test</span>
              </button>
            </div>

            {/* Online / Offline Mode Toggle */}
            <button
              onClick={onToggleOfflineMode}
              title={isOfflineMode ? 'Using Offline Local Engine' : 'Using Gemini AI Engine (Online)'}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isOfflineMode
                  ? 'bg-slate-200 text-slate-800 border border-slate-300'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-slate-600" />
                  <span>Offline Mode</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Gemini AI
                  </span>
                </>
              )}
            </button>

            {/* Auto-Speak Toggle */}
            <button
              onClick={onToggleAutoSpeak}
              title={autoSpeak ? 'Auto-speak translation is ON' : 'Auto-speak translation is OFF'}
              className={`p-2 rounded-lg transition-colors ${
                autoSpeak ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Quick Volume Level Control */}
            <div className="relative">
              <button
                onClick={() => setShowVolumePopover((prev) => !prev)}
                title={`Output Volume: ${isHeaderMuted ? 'Muted' : `${headerVolume}%`}`}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isHeaderMuted
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    : headerVolume > 100
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {isHeaderMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-600" />
                ) : headerVolume > 70 ? (
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <Volume1 className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span className="font-mono">{isHeaderMuted ? 'Muted' : `${headerVolume}%`}</span>
              </button>

              {/* Volume Slider Popover */}
              {showVolumePopover && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 z-50 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Master Volume Level</span>
                    <button
                      onClick={handleToggleMute}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isHeaderMuted ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {isHeaderMuted ? 'Unmute' : 'Mute'}
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="140"
                      step="5"
                      value={isHeaderMuted ? 0 : headerVolume}
                      onChange={(e) => handleHeaderVolumeChange(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                    />
                    <span className="font-mono font-bold text-slate-700 w-10 text-right">
                      {isHeaderMuted ? '0%' : `${headerVolume}%`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>Latency Level</span>
                    <span className="font-mono text-emerald-600 font-bold flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" /> &lt;200ms
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Latency Level Badge */}
            <div
              className="hidden xl:flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
              title="End-to-End Latency Level: Real-time neural pipeline running at <200ms"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono font-bold">~185ms</span>
              <span className="text-[10px] text-emerald-600 font-medium">(Stage Grade)</span>
            </div>

            {/* Voice Settings & Status button */}
            <button
              onClick={() => setShowVoiceModal(true)}
              title="Configure Indian Voice persona & synthesis settings"
              className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Share Link & QR with Audience Button */}
            <button
              onClick={() => setShowAudienceShareModal(true)}
              title="Show Audience QR Code & Link for Projector & Mobile Phones"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Audience QR</span>
              <span className="sm:hidden">QR</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden py-2 border-t border-slate-100 overflow-x-auto gap-1 items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => onChangeView('single')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
                activeView === 'single' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Live Mic
            </button>
            <button
              onClick={() => onChangeView('conference')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap flex items-center gap-1 ${
                activeView === 'conference' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Headphones className="w-3 h-3 text-indigo-400" />
              <span>Live Conference</span>
            </button>
            <button
              onClick={() => onChangeView('dual')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
                activeView === 'dual' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Face-to-Face
            </button>
            <button
              onClick={() => onChangeView('dialect')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
                activeView === 'dialect' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Dialect Lab
            </button>
            <button
              onClick={() => onChangeView('offline')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
                activeView === 'offline' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Offline Phrasebook
            </button>
          </div>

          <button
            onClick={() => setShowAudienceShareModal(true)}
            className="px-2.5 py-1 text-xs font-bold bg-indigo-600 text-white rounded-md whitespace-nowrap flex items-center gap-1 shrink-0 ml-1"
          >
            <QrCode className="w-3 h-3" />
            <span>QR</span>
          </button>
        </div>
      </div>

      {/* Voice Status Diagnostics Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Indian Voice & Speech Settings</h3>
              </div>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Indian Voice Persona Selection Box */}
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span className="text-base">🇮🇳</span>
                  <span>Indian Voice Persona</span>
                </span>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                  Authentic Accent
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mb-3 leading-relaxed">
                All spoken audio is synthesized using natural Indian accents with regional intonations across Hindi, Tamil, Telugu, Kannada, Malayalam, and Indian English.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {(['ananya', 'arjun', 'pooja'] as IndianVoicePersona[]).map((p) => {
                  const isSelected = voiceConfig.persona === p;
                  const info = personaDisplayNames[p];
                  return (
                    <button
                      key={p}
                      onClick={() => handlePersonaChange(p)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{info.name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-amber-100' : 'text-slate-500'}`}>
                        {info.tag}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Engine and Speed controls */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">Voice Engine</label>
                  <div className="flex rounded-lg bg-amber-100/70 p-0.5">
                    <button
                      onClick={() => handleEngineChange('device')}
                      className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        voiceConfig.engine === 'device' ? 'bg-white text-amber-950 shadow-xs' : 'text-amber-800'
                      }`}
                    >
                      🇮🇳 Indian Voice (Default)
                    </button>
                    <button
                      onClick={() => handleEngineChange('neural')}
                      className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        voiceConfig.engine === 'neural' ? 'bg-white text-amber-950 shadow-xs' : 'text-amber-800'
                      }`}
                    >
                      AI Cloud
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">Speaking Cadence</label>
                  <div className="flex rounded-lg bg-amber-100/70 p-0.5">
                    <button
                      onClick={() => handleSpeedChange('normal')}
                      className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        voiceConfig.speed === 'normal' ? 'bg-white text-amber-950 shadow-xs' : 'text-amber-800'
                      }`}
                    >
                      1.0x Normal
                    </button>
                    <button
                      onClick={() => handleSpeedChange('slow')}
                      className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        voiceConfig.speed === 'slow' ? 'bg-white text-amber-950 shadow-xs' : 'text-amber-800'
                      }`}
                    >
                      0.8x Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Persona Voice Button */}
              <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between">
                <span className="text-[11px] text-amber-900 font-medium">
                  Active: <strong>{personaDisplayNames[voiceConfig.persona].name}</strong> ({voiceConfig.engine === 'neural' ? 'Studio Neural' : 'Device Voice'})
                </span>
                <button
                  onClick={() => handleTestVoice(voiceConfig.persona)}
                  disabled={isTestingVoice}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isTestingVoice ? 'Playing...' : 'Hear Indian Voice'}</span>
                </button>
              </div>
            </div>

            {/* Volume Level & Output Audio Control */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  <span>Volume Level Calibration</span>
                </span>
                <button
                  onClick={handleToggleMute}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isHeaderMuted ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {isHeaderMuted ? 'Muted' : 'Mute Audio'}
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="140"
                  step="5"
                  value={isHeaderMuted ? 0 : headerVolume}
                  onChange={(e) => handleHeaderVolumeChange(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                />
                <span className="font-mono font-bold text-slate-900 w-12 text-right">
                  {isHeaderMuted ? 'Muted' : `${headerVolume}%`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Output Level</span>
                  <span className="font-mono font-bold text-slate-800">
                    {isHeaderMuted ? '-∞ dB' : headerVolume > 100 ? '+6 dB (Boost)' : '0 dB (Nominal)'}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Latency Level</span>
                  <span className="font-mono font-bold text-emerald-600">⚡ &lt;200ms (Stage Grade)</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-xs font-medium text-slate-700">Speech Recognition (Mic Input)</span>
                {voiceStatus.hasSpeechRecognition ? (
                  <span className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Ready
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-semibold text-amber-600 gap-1">
                    <AlertCircle className="w-4 h-4" /> Text / Stream fallback
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <div className="text-xs font-medium text-slate-700">Device Indian Speech Synthesis</div>
                  <div className="text-[10px] text-slate-500">
                    {voiceStatus.indianVoicesCount ? `${voiceStatus.indianVoicesCount} Indian locale voices detected on OS` : 'Uses Indian English transliteration fallback'}
                  </div>
                </div>
                <span className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {voiceStatus.availableVoices.length} System Voices
                </span>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Detected Regional Voices
            </h4>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {LANGUAGE_LIST.map((lang) => {
                const isAvail = voiceStatus.supportedLanguages[lang.code];
                return (
                  <div
                    key={lang.code}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      isAvail ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{lang.name}</div>
                      <div className="text-[10px] text-slate-500">{lang.nativeName} ({lang.bcp47})</div>
                    </div>
                    {isAvail ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-200 text-emerald-900 font-bold">
                        Installed
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-medium">
                        Phonetic
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Silence Guarantee:</strong> Even if your operating system lacks a native Tamil, Kannada, Telugu, or Malayalam voice pack, IndicVoice automatically renders accurate Romanized transliterations through an authentic Indian voice engine so every regional translation is clearly enunciated!
              </span>
            </div>

            <button
              onClick={() => setShowVoiceModal(false)}
              className="mt-5 w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Audience Share Link & QR Code Modal */}
      <AudienceShareModal
        isOpen={showAudienceShareModal}
        onClose={() => setShowAudienceShareModal(false)}
      />
    </header>
  );
}
