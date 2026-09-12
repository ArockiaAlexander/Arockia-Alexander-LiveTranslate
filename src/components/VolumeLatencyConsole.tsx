import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Zap,
  Activity,
  Sliders,
  Play,
  RotateCcw,
  AlertTriangle,
  Radio,
  Mic,
  Headphones,
  BarChart3,
  Check,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LatencyProfile, LatencyBreakdown } from '../types';
import { indicSpeech } from '../services/indicSpeechService';
import { conferenceSpeechManager } from '../services/conferenceSpeechManager';

interface VolumeLatencyConsoleProps {
  currentLatencyMs?: number;
  latencyBreakdown?: LatencyBreakdown;
  latencyHistory?: number[];
  currentLatencyProfile: LatencyProfile;
  onChangeLatencyProfile: (profile: LatencyProfile) => void;
  micAudioLevel: number;
  isMicActive: boolean;
  isAudioPlaying: boolean;
  compact?: boolean;
  className?: string;
}

export function VolumeLatencyConsole({
  currentLatencyMs = 185,
  latencyBreakdown,
  latencyHistory = [190, 175, 210, 185, 165, 220, 180, 175, 195, 182],
  currentLatencyProfile,
  onChangeLatencyProfile,
  micAudioLevel,
  isMicActive,
  isAudioPlaying,
  compact = false,
  className = '',
}: VolumeLatencyConsoleProps) {
  // Volume state
  const [outputVolume, setOutputVolume] = useState<number>(() => {
    return Math.round(indicSpeech.getRawVolume() * 100);
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => indicSpeech.isVolumeMuted());
  const [micSensitivity, setMicSensitivity] = useState<number>(() => {
    return Math.round(conferenceSpeechManager.getMicSensitivity() * 100);
  });
  const [outputLevel, setOutputLevel] = useState<number>(0);
  const [isTestingTone, setIsTestingTone] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'both' | 'volume' | 'latency'>('both');
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);

  // Peak hold for meters
  const [micPeak, setMicPeak] = useState<number>(0);
  const [outputPeak, setOutputPeak] = useState<number>(0);
  const peakDecayTimerRef = useRef<any>(null);

  // Subscribe to real-time output volume levels from indicSpeech
  useEffect(() => {
    const unsub = indicSpeech.subscribeVolumeLevel((lvl) => {
      setOutputLevel(lvl);
      if (lvl > outputPeak) {
        setOutputPeak(lvl);
      }
    });
    return () => unsub();
  }, [outputPeak]);

  // Track mic peak
  useEffect(() => {
    if (micAudioLevel > micPeak) {
      setMicPeak(micAudioLevel);
    }
  }, [micAudioLevel, micPeak]);

  // Decay peaks every 300ms
  useEffect(() => {
    peakDecayTimerRef.current = setInterval(() => {
      setMicPeak((prev) => Math.max(0, prev - 0.05));
      setOutputPeak((prev) => Math.max(0, prev - 0.05));
    }, 200);
    return () => clearInterval(peakDecayTimerRef.current);
  }, []);

  // Update volume
  const handleVolumeChange = (newVal: number) => {
    setOutputVolume(newVal);
    indicSpeech.setVolume(newVal / 100);
    conferenceSpeechManager.setVolume(newVal / 100);
    if (isMuted && newVal > 0) {
      setIsMuted(false);
      indicSpeech.setMuted(false);
      conferenceSpeechManager.setMuted(false);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    indicSpeech.setMuted(newMute);
    conferenceSpeechManager.setMuted(newMute);
  };

  // Update Mic Sensitivity
  const handleMicSensitivityChange = (newVal: number) => {
    setMicSensitivity(newVal);
    conferenceSpeechManager.setMicSensitivity(newVal / 100);
  };

  // Test tone / audio check
  const handleTestAudioPing = async () => {
    setIsTestingTone(true);
    try {
      await indicSpeech.testIndianVoice('ananya', 'en');
    } finally {
      setIsTestingTone(false);
    }
  };

  // Derived latency statistics
  const recentLatencies = latencyHistory.length > 0 ? latencyHistory : [currentLatencyMs];
  const avgLatency = Math.round(
    recentLatencies.reduce((acc, curr) => acc + curr, 0) / recentLatencies.length,
  );
  const minLatency = Math.min(...recentLatencies);
  const maxLatency = Math.max(...recentLatencies);

  // Latency rating badge
  const getLatencyRating = (ms: number) => {
    if (ms < 250) {
      return {
        label: 'Ultra-Low Latency',
        tag: 'Stage Grade',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        dotColor: 'bg-emerald-500',
      };
    }
    if (ms < 500) {
      return {
        label: 'Balanced Latency',
        tag: 'Conference Grade',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        dotColor: 'bg-blue-500',
      };
    }
    return {
      label: 'Deep Nuance',
      tag: 'Extended Analysis',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      dotColor: 'bg-amber-500',
    };
  };

  const rating = getLatencyRating(currentLatencyMs);

  // Default breakdown if not calculated yet
  const effectiveBreakdown = latencyBreakdown || {
    asrMs: Math.round(currentLatencyMs * 0.28),
    translationMs: Math.round(currentLatencyMs * 0.48),
    ttsMs: Math.round(currentLatencyMs * 0.24),
    totalMs: currentLatencyMs,
  };

  // Decibel converter for meter display
  const amplitudeToDb = (amp: number) => {
    if (amp <= 0.01) return '-48 dB';
    const db = Math.round(20 * Math.log10(amp));
    return `${db > 0 ? '+' : ''}${db} dB`;
  };

  return (
    <div
      id="volume-latency-console"
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Console Top Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-3 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">Audio & Latency Console</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Live Telemetry
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Master Volume Level, Mic Input VU Meter & End-to-End Latency Level Monitor
            </p>
          </div>
        </div>

        {/* Live Status Badges in Header */}
        <div className="flex items-center gap-2">
          {/* Quick Volume indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              isMuted
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : outputVolume > 100
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
            }`}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : outputVolume > 70 ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <Volume1 className="w-3.5 h-3.5" />
            )}
            <span>{isMuted ? 'Muted' : `${outputVolume}%`}</span>
            {isAudioPlaying && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          {/* Quick Latency indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              currentLatencyMs < 250
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : currentLatencyMs < 500
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{currentLatencyMs}ms</span>
            <span className="text-[10px] opacity-75 hidden sm:inline">({rating.tag})</span>
          </div>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse Console' : 'Expand Detailed Console'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-slate-50/70">
          {/* View Tab Filter */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs text-xs font-semibold">
              <button
                onClick={() => setActiveTab('both')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'both' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Overview (Volume + Latency)
              </button>
              <button
                onClick={() => setActiveTab('volume')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'volume' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Volume Levels</span>
              </button>
              <button
                onClick={() => setActiveTab('latency')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'latency' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Latency Levels</span>
              </button>
            </div>

            {/* Test Audio Button */}
            <button
              onClick={handleTestAudioPing}
              disabled={isTestingTone}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
              title="Send volume calibration test speech into headphone output"
            >
              <Play className="w-3 h-3 fill-current text-indigo-600" />
              <span>{isTestingTone ? 'Testing Output...' : 'Test Headphone Audio'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ============================================================== */}
            {/* SECTION 1: VOLUME LEVEL CONTROLS & METERS                       */}
            {/* ============================================================== */}
            {(activeTab === 'both' || activeTab === 'volume') && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Audio Volume Level</h3>
                      <p className="text-[11px] text-slate-500">Attendee headset channel & stage mic gain</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      isMuted
                        ? 'bg-red-100 text-red-800'
                        : outputVolume > 100
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isMuted ? 'OUTPUT MUTED' : outputVolume > 100 ? 'PA BOOST (+6dB)' : 'OPTIMAL LEVEL'}
                  </span>
                </div>

                {/* 1. MASTER HEADPHONE / STREAM OUTPUT VOLUME */}
                <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Master Output Volume (Headset Channel)</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {isMuted ? 'MUTED' : `${outputVolume}%`}
                    </span>
                  </div>

                  {/* Volume Slider with Mute button */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleToggleMute}
                      className={`p-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center ${
                        isMuted
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                      title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <div className="flex-1 relative flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="140"
                        step="5"
                        value={isMuted ? 0 : outputVolume}
                        onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                      />
                    </div>

                    <span className="text-[11px] font-mono font-semibold text-slate-500 w-10 text-right">
                      {outputVolume > 100 ? '+6dB' : '0dB'}
                    </span>
                  </div>

                  {/* Quick Volume Preset Chips */}
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-400 mr-1">Presets:</span>
                    {[
                      { label: 'Mute', val: 0 },
                      { label: '30% Soft', val: 30 },
                      { label: '70% Balanced', val: 70 },
                      { label: '100% Headset', val: 100 },
                      { label: '125% PA Boost', val: 125 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        onClick={() => handleVolumeChange(preset.val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors border ${
                          outputVolume === preset.val && !isMuted
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* REAL-TIME OUTPUT VU LEVEL METER */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="font-semibold flex items-center gap-1">
                        <Radio className="w-3 h-3 text-indigo-500" />
                        <span>Speech Synthesis Audio Energy</span>
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {isAudioPlaying ? amplitudeToDb(outputLevel) : '-∞ dB (Idle)'}
                      </span>
                    </div>

                    {/* 14-segment VU Meter Bar */}
                    <div className="grid grid-cols-14 gap-1 h-3 bg-slate-200/80 p-0.5 rounded">
                      {Array.from({ length: 14 }).map((_, idx) => {
                        const threshold = (idx + 1) / 14;
                        const isLit = isAudioPlaying && !isMuted && outputLevel >= threshold * 0.85;
                        const isPeakLit = isAudioPlaying && !isMuted && outputPeak >= threshold * 0.85;

                        // Colors: Green for 0-8, Yellow for 9-11, Red for 12-13
                        let barBg = 'bg-slate-300';
                        if (isLit) {
                          if (idx < 9) barBg = 'bg-emerald-500';
                          else if (idx < 12) barBg = 'bg-amber-500';
                          else barBg = 'bg-red-500 animate-pulse';
                        } else if (isPeakLit) {
                          barBg = 'bg-slate-400';
                        }

                        return (
                          <div
                            key={idx}
                            className={`h-full rounded-xs transition-all duration-75 ${barBg}`}
                          />
                        );
                      })}
                    </div>

                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5 px-0.5">
                      <span>-48dB</span>
                      <span>-24dB</span>
                      <span>-12dB</span>
                      <span>-6dB</span>
                      <span>0dB</span>
                      <span className="text-red-500 font-bold">+3dB</span>
                    </div>
                  </div>
                </div>

                {/* 2. STAGE MICROPHONE INPUT VOLUME & GAIN */}
                <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Mic className={`w-3.5 h-3.5 ${isMicActive ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                      <span>Stage Microphone Input Gain</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {micSensitivity}% Sensitivity
                    </span>
                  </div>

                  {/* Mic Sensitivity Slider */}
                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] font-semibold text-slate-500 w-12">0.5x Gain</span>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="5"
                      value={micSensitivity}
                      onChange={(e) => handleMicSensitivityChange(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none"
                    />
                    <span className="text-[10px] font-semibold text-slate-500 w-12 text-right">2.0x Gain</span>
                  </div>

                  {/* REAL-TIME MICROPHONE INPUT VU METER */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="font-semibold flex items-center gap-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isMicActive ? 'bg-red-500 animate-ping' : 'bg-slate-300'
                          }`}
                        />
                        <span>Mic Signal Strength</span>
                        {isMicActive && micAudioLevel > 0.85 && (
                          <span className="text-red-600 font-bold flex items-center gap-0.5 ml-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Clip Warning
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {isMicActive ? amplitudeToDb(micAudioLevel) : 'Muted / Inactive'}
                      </span>
                    </div>

                    {/* 14-segment VU Meter Bar for Mic Input */}
                    <div className="grid grid-cols-14 gap-1 h-3 bg-slate-200/80 p-0.5 rounded">
                      {Array.from({ length: 14 }).map((_, idx) => {
                        const threshold = (idx + 1) / 14;
                        const isLit = isMicActive && micAudioLevel >= threshold * 0.85;

                        let barBg = 'bg-slate-300';
                        if (isLit) {
                          if (idx < 9) barBg = 'bg-emerald-500';
                          else if (idx < 12) barBg = 'bg-amber-500';
                          else barBg = 'bg-red-600 animate-pulse';
                        }

                        return (
                          <div
                            key={idx}
                            className={`h-full rounded-xs transition-all duration-75 ${barBg}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SECTION 2: LATENCY LEVEL METRICS & OPTIMIZATION                */}
            {/* ============================================================== */}
            {(activeTab === 'both' || activeTab === 'latency') && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Speech-to-Speech Latency Level</h3>
                      <p className="text-[11px] text-slate-500">Real-time round-trip processing & speed profiles</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${rating.color}`}>
                    {rating.label}
                  </span>
                </div>

                {/* CURRENT END-TO-END LATENCY HERO CARD */}
                <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        End-to-End Latency
                      </span>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-mono font-extrabold text-white tracking-tight">
                          {currentLatencyMs}
                        </span>
                        <span className="text-sm font-semibold text-emerald-400">ms</span>
                        <span className="text-xs text-slate-400 font-medium">round-trip</span>
                      </div>
                    </div>

                    {/* Speed indicator dial */}
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200">
                        <span className={`w-2 h-2 rounded-full ${rating.dotColor}`} />
                        <span>{rating.tag}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Live Stage Optimized</p>
                    </div>
                  </div>

                  {/* 3-STAGE LATENCY PIPELINE BREAKDOWN */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="font-semibold">Pipeline Breakdown</span>
                      <span className="text-[10px] text-slate-400">ASR → MT → TTS</span>
                    </div>

                    {/* Proportional Stacked Bar */}
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        style={{
                          width: `${(effectiveBreakdown.asrMs / effectiveBreakdown.totalMs) * 100}%`,
                        }}
                        className="bg-indigo-500 h-full"
                        title={`Speech ASR & VAD: ${effectiveBreakdown.asrMs}ms`}
                      />
                      <div
                        style={{
                          width: `${(effectiveBreakdown.translationMs / effectiveBreakdown.totalMs) * 100}%`,
                        }}
                        className="bg-emerald-500 h-full"
                        title={`Neural Indic MT: ${effectiveBreakdown.translationMs}ms`}
                      />
                      <div
                        style={{
                          width: `${(effectiveBreakdown.ttsMs / effectiveBreakdown.totalMs) * 100}%`,
                        }}
                        className="bg-amber-500 h-full"
                        title={`Speech Synthesis Buffer: ${effectiveBreakdown.ttsMs}ms`}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-300 font-mono pt-1">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>ASR: {effectiveBreakdown.asrMs}ms</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Indic MT: {effectiveBreakdown.translationMs}ms</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Voice TTS: {effectiveBreakdown.ttsMs}ms</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LATENCY PROFILE SELECTOR */}
                <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Latency Optimization Profile</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Live Stage Tuning</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: 'ultra-low' as LatencyProfile,
                        title: 'Ultra-Low',
                        target: '<200ms',
                        desc: 'Instant stage streaming',
                        badge: 'Fastest',
                      },
                      {
                        id: 'balanced' as LatencyProfile,
                        title: 'Balanced',
                        target: '~350ms',
                        desc: 'Standard conference',
                        badge: 'Default',
                      },
                      {
                        id: 'deep-context' as LatencyProfile,
                        title: 'Deep Context',
                        target: '~600ms',
                        desc: 'Keynote & legal nuance',
                        badge: 'Fidelity',
                      },
                    ].map((prof) => {
                      const isSelected = currentLatencyProfile === prof.id;
                      return (
                        <button
                          key={prof.id}
                          onClick={() => onChangeLatencyProfile(prof.id)}
                          className={`p-2 rounded-lg text-left transition-all border ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{prof.title}</span>
                            {isSelected && <Check className="w-3 h-3 text-indigo-600" />}
                          </div>
                          <div className="font-mono text-[11px] font-bold text-indigo-700 mt-0.5">
                            {prof.target}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            {prof.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* LATENCY PERFORMANCE METRICS & RECENT SPARKLINE */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Session Latency Statistics</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {recentLatencies.length} speech turns recorded
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Average</span>
                      <div className="font-mono font-bold text-sm text-slate-800">{avgLatency} ms</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Best / Min</span>
                      <div className="font-mono font-bold text-sm text-emerald-600">{minLatency} ms</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Peak / Max</span>
                      <div className="font-mono font-bold text-sm text-amber-600">{maxLatency} ms</div>
                    </div>
                  </div>

                  {/* SPARKLINE MINI BARS */}
                  <div className="pt-1">
                    <div className="flex items-end gap-1 h-8 bg-white p-1.5 rounded-lg border border-slate-200">
                      {recentLatencies.slice(-12).map((val, idx) => {
                        const heightPct = Math.min(100, Math.max(20, (val / 500) * 100));
                        const isLatest = idx === recentLatencies.slice(-12).length - 1;
                        const barColor =
                          val < 250 ? 'bg-emerald-500' : val < 450 ? 'bg-indigo-500' : 'bg-amber-500';

                        return (
                          <div
                            key={idx}
                            style={{ height: `${heightPct}%` }}
                            className={`flex-1 rounded-t-xs transition-all ${barColor} ${
                              isLatest ? 'ring-1 ring-slate-900' : 'opacity-80'
                            }`}
                            title={`Turn ${idx + 1}: ${val}ms`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1 px-1">
                      <span>Recent speech turns</span>
                      <span className="text-emerald-600 font-semibold">&lt;250ms target</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
