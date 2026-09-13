import { useState, useEffect } from 'react';
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
  Headphones,
  Zap,
  QrCode,
  Radio,
  Cpu,
  Check,
} from 'lucide-react';
import { SystemVoiceStatus, IndianVoicePersona } from '../types';
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

  // API Engine Status from /api/health
  const [apiHealth, setApiHealth] = useState<{ hasApiKey: boolean; hasSarvamKey: boolean }>({
    hasApiKey: false,
    hasSarvamKey: false,
  });

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setApiHealth({
          hasApiKey: Boolean(data.hasApiKey),
          hasSarvamKey: Boolean(data.hasSarvamKey),
        });
      })
      .catch(() => {});
  }, []);

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

  const isBroadcasting = activeView === 'conference';

  return (
    <header className="sticky top-0 z-30 bg-white shadow-xs border-b border-slate-200">
      {/* Primary Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Subtitle */}
          <div className="flex items-center space-x-3 shrink-0">
            <SSVPLogo className="w-10 h-10" />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">IndicVoice Live</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                  SSVP NCI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                72nd Annual General Body Meeting • National Council of India
              </p>
            </div>
          </div>

          {/* Desktop View Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => onChangeView('conference')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'conference' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Live Conference</span>
            </button>
            <button
              onClick={() => onChangeView('single')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeView === 'single' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Studio Mic
            </button>
            <button
              onClick={() => onChangeView('dual')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeView === 'dual' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Face-to-Face
            </button>
            <button
              onClick={() => onChangeView('dialect')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeView === 'dialect' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dialect Lab
            </button>
            <button
              onClick={() => onChangeView('offline')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeView === 'offline' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phrasebook
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Live Broadcast Pulsing Status Badge */}
            {isBroadcasting && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full shadow-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
                <span className="text-[11px] font-black text-red-600 tracking-wider uppercase">
                  LIVE BROADCAST
                </span>
              </div>
            )}

            {/* Audience QR Share Link Button */}
            <button
              onClick={() => setShowAudienceShareModal(true)}
              title="Show Audience QR Code & Link for Projectors & Audience Mobile Devices"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Audience QR</span>
              <span className="sm:hidden">QR</span>
            </button>

            {/* Master Volume Button & Popover */}
            <div className="relative">
              <button
                onClick={() => setShowVolumePopover((prev) => !prev)}
                title={`Master Volume: ${isHeaderMuted ? 'Muted' : `${headerVolume}%`}`}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  isHeaderMuted
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {isHeaderMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-600" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span className="font-mono">{isHeaderMuted ? 'Muted' : `${headerVolume}%`}</span>
              </button>

              {showVolumePopover && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800">Master Volume</span>
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

            {/* Voice Settings Diagnostic Button */}
            <button
              onClick={() => setShowVoiceModal(true)}
              title="Configure Voice Personas & Diagnostics"
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Bar: API Owner Engine Status & Voice Selector */}
      <div className="bg-slate-900 text-slate-100 border-t border-slate-800 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* API Engine Status Indicators */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>API Status:</span>
            </span>

            {/* Sarvam AI Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                apiHealth.hasSarvamKey
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${apiHealth.hasSarvamKey ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>Sarvam AI</span>
              <span className="text-[9px] font-normal opacity-80">
                {apiHealth.hasSarvamKey ? '(Tier 1 ACTIVE)' : '(STANDBY)'}
              </span>
            </div>

            {/* Google Gemini Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                apiHealth.hasApiKey
                  ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${apiHealth.hasApiKey ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>Google Gemini</span>
              <span className="text-[9px] font-normal opacity-80">
                {apiHealth.hasApiKey ? '(Tier 2 ACTIVE)' : '(STANDBY)'}
              </span>
            </div>

            {/* Local Offline Engine Status Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-500/40">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Local Indic Engine</span>
              <span className="text-[9px] font-normal opacity-80">(READY)</span>
            </div>
          </div>

          {/* Right side: Indian Voice Persona Quick Selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs">
              <span className="mr-1.5">🇮🇳</span>
              <span className="text-slate-400 font-medium mr-1">Voice:</span>
              <select
                value={voiceConfig.persona}
                onChange={(e) => handlePersonaChange(e.target.value as IndianVoicePersona)}
                className="bg-transparent font-bold text-amber-300 focus:outline-none cursor-pointer py-0.5 text-xs"
              >
                <option value="ananya" className="bg-slate-900 text-white">Ananya (Female)</option>
                <option value="arjun" className="bg-slate-900 text-white">Arjun (Male)</option>
                <option value="pooja" className="bg-slate-900 text-white">Pooja (Female)</option>
              </select>

              <button
                onClick={() => handleTestVoice()}
                disabled={isTestingVoice}
                className="ml-2 px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded font-semibold text-[10px] border border-amber-500/40 flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>{isTestingVoice ? '...' : 'Test'}</span>
              </button>
            </div>

            {/* Offline Mode Toggle Button */}
            <button
              onClick={onToggleOfflineMode}
              title={isOfflineMode ? 'Using Offline Local Engine' : 'Using AI Cloud Engines'}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                isOfflineMode
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
              }`}
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3 h-3 text-slate-400" />
                  <span>Offline Mode</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>Online AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Voice Diagnostics Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
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
            </div>

            <button
              onClick={() => setShowVoiceModal(false)}
              className="mt-2 w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
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
