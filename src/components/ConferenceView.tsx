import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Headphones,
  Mic,
  MicOff,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sparkles,
  Radio,
  Check,
  Copy,
  FileText,
  Download,
  User,
  Users,
  Maximize2,
  Minimize2,
  Calendar,
  Clock,
  MessageSquare,
  Send,
  Search,
  ChevronRight,
  Volume2,
  Globe,
  Plus,
  Trash2,
  Settings,
  Edit3,
  HelpCircle,
  Zap,
  QrCode,
} from 'lucide-react';
import {
  LanguageCode,
  ConferenceSpeechSegment,
  IndianVoicePersona,
  LatencyProfile,
  LatencyBreakdown,
} from '../types';
import { SUPPORTED_LANGUAGES, LANGUAGE_LIST } from '../data/languages';
import {
  DEFAULT_CONFERENCE_INFO,
  DEFAULT_UPCOMING_SESSIONS,
  ConferenceMetadata,
  UpcomingSessionConfig,
} from '../data/conferenceProgram';
import {
  conferenceSpeechManager,
  PlaybackState,
} from '../services/conferenceSpeechManager';
import { indicSpeech } from '../services/indicSpeechService';
import { VolumeLatencyConsole } from './VolumeLatencyConsole';
import { AudienceShareModal } from './AudienceShareModal';

interface ConferenceViewProps {
  isOfflineMode?: boolean;
  autoSpeak?: boolean;
}

export function ConferenceView({ isOfflineMode = false, autoSpeak = true }: ConferenceViewProps) {
  // Conference configuration (persisted in localStorage for upcoming conference)
  const [conferenceInfo, setConferenceInfo] = useState<ConferenceMetadata>(() => {
    try {
      const saved = localStorage.getItem('indicvoice_upcoming_conference_info');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read saved conference info', e);
    }
    return DEFAULT_CONFERENCE_INFO;
  });

  const [isEditingConfInfo, setIsEditingConfInfo] = useState(false);
  const [editTitle, setEditTitle] = useState(conferenceInfo.title);
  const [editVenue, setEditVenue] = useState(conferenceInfo.venue);
  const [editSubtitle, setEditSubtitle] = useState(conferenceInfo.subtitle);

  // Sessions list (persisted in localStorage)
  const [sessions, setSessions] = useState<UpcomingSessionConfig[]>(() => {
    try {
      const saved = localStorage.getItem('indicvoice_upcoming_sessions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read saved sessions', e);
    }
    return DEFAULT_UPCOMING_SESSIONS;
  });

  // Selected session: 'all' = Entire Conference stream; or specific session id
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionTrack, setNewSessionTrack] = useState('Main Auditorium');

  // CORE USER MANDATE: "User Selection of Language to be heard" (Attendee Headphone Channel)
  const [listeningLang, setListeningLang] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('indicvoice_listening_channel');
      if (saved && saved in SUPPORTED_LANGUAGES) return saved as LanguageCode;
    } catch (e) {}
    return 'hi';
  });

  // Speaker configuration: Speaker can speak any one of the 6 languages!
  const [speakerLang, setSpeakerLang] = useState<LanguageCode>('en');
  const [speakerRoleType, setSpeakerRoleType] = useState<'podium' | 'panelist' | 'floor_qa' | 'chair'>('podium');
  const [speakerName, setSpeakerName] = useState('Keynote Speaker');
  const [speakerTitle, setSpeakerTitle] = useState('Main Plenary Stage');

  // Live Proceedings (Starts completely clean - no prior conferences!)
  const [allSegments, setAllSegments] = useState<ConferenceSpeechSegment[]>(() => {
    try {
      const saved = localStorage.getItem('indicvoice_live_proceedings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not load live proceedings', e);
    }
    return [];
  });

  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  // Playback state from manager
  const [playbackState, setPlaybackState] = useState<PlaybackState>(
    conferenceSpeechManager.getPlaybackState(),
  );

  // Live microphone broadcast state
  const [isMicBroadcasting, setIsMicBroadcasting] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  // UI modes & controls
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<'normal' | 'slow'>('normal');
  const [voicePersona, setVoicePersona] = useState<IndianVoicePersona>('ananya');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSegmentId, setCopiedSegmentId] = useState<string | null>(null);

  // Floor Mic / Audience Intercom
  const [isFloorMicOpen, setIsFloorMicOpen] = useState(false);
  const [floorSpeakerName, setFloorSpeakerName] = useState('Delegate from Floor');
  const [floorSpeakerLang, setFloorSpeakerLang] = useState<LanguageCode>('ta');
  const [floorInterventionText, setFloorInterventionText] = useState('');
  const [isSubmittingIntervention, setIsSubmittingIntervention] = useState(false);

  // Fast Line-In / Audio Desk Entry
  const [directInputText, setDirectInputText] = useState('');
  const [isTranslatingDirect, setIsTranslatingDirect] = useState(false);

  // Latency Level & Audio Console State
  const [latencyProfile, setLatencyProfile] = useState<LatencyProfile>(() => {
    try {
      const saved = localStorage.getItem('indicvoice_latency_profile') as LatencyProfile;
      if (saved && ['ultra-low', 'balanced', 'deep-context'].includes(saved)) return saved;
    } catch {}
    return 'ultra-low';
  });
  const [currentLatencyMs, setCurrentLatencyMs] = useState<number>(185);
  const [latencyBreakdown, setLatencyBreakdown] = useState<LatencyBreakdown>({
    asrMs: 55,
    translationMs: 92,
    ttsMs: 38,
    totalMs: 185,
  });
  const [latencyHistory, setLatencyHistory] = useState<number[]>([190, 175, 210, 185, 165, 195, 180, 175, 188, 185]);

  const handleChangeLatencyProfile = (profile: LatencyProfile) => {
    setLatencyProfile(profile);
    try {
      localStorage.setItem('indicvoice_latency_profile', profile);
    } catch {}
    const targetMs = profile === 'ultra-low' ? 175 : profile === 'balanced' ? 340 : 590;
    setCurrentLatencyMs(targetMs);
    setLatencyBreakdown({
      asrMs: Math.round(targetMs * 0.28),
      translationMs: Math.round(targetMs * 0.48),
      ttsMs: Math.round(targetMs * 0.24),
      totalMs: targetMs,
    });
  };

  const segmentsContainerRef = useRef<HTMLDivElement>(null);
  const audioLevelIntervalRef = useRef<any>(null);

  // Save Conference Info when updated
  useEffect(() => {
    try {
      localStorage.setItem('indicvoice_upcoming_conference_info', JSON.stringify(conferenceInfo));
    } catch (e) {}
  }, [conferenceInfo]);

  // Save Sessions when updated
  useEffect(() => {
    try {
      localStorage.setItem('indicvoice_upcoming_sessions', JSON.stringify(sessions));
    } catch (e) {}
  }, [sessions]);

  // Save Live Proceedings when updated
  useEffect(() => {
    try {
      localStorage.setItem('indicvoice_live_proceedings', JSON.stringify(allSegments));
    } catch (e) {}
  }, [allSegments]);

  // Subscribe to playback manager updates
  useEffect(() => {
    const unsubscribe = conferenceSpeechManager.subscribePlayback((state) => {
      setPlaybackState(state);
      if (state.currentSegmentIndex >= 0) {
        setActiveSegmentIndex(state.currentSegmentIndex);
      }
    });
    return () => unsubscribe();
  }, []);

  // Update manager queue whenever segments or listening language changes
  useEffect(() => {
    updateManagerQueue(allSegments, listeningLang, false);
  }, [allSegments, listeningLang]);

  // Auto-scroll teleprompter to active segment
  useEffect(() => {
    if (!autoScroll || !segmentsContainerRef.current) return;
    const activeEl = document.getElementById(`conference-seg-${activeSegmentIndex}`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSegmentIndex, autoScroll]);

  // Helper to sync queue with manager
  const updateManagerQueue = (
    currentSegments: ConferenceSpeechSegment[],
    targetLang: LanguageCode,
    autoPlay = false,
  ) => {
    const queueData = currentSegments.map((s) => {
      const trans = s.translations[targetLang];
      return {
        id: s.id,
        text: trans ? trans.translatedText : s.speakerText,
        transliteration: trans ? trans.transliteration : undefined,
      };
    });
    conferenceSpeechManager.setQueue(queueData, targetLang, autoPlay);
  };

  // Handler: User Selection of Language to be heard
  const handleSelectListeningLang = (newLang: LanguageCode) => {
    setListeningLang(newLang);
    conferenceSpeechManager.setListeningLang(newLang);
    try {
      localStorage.setItem('indicvoice_listening_channel', newLang);
    } catch (e) {}
  };

  // Handler: Speaker selects Delivery Language
  const handleSelectSpeakerLang = (newLang: LanguageCode) => {
    setSpeakerLang(newLang);
    conferenceSpeechManager.setSpeakerLang(newLang);
  };

  // Toggle Play / Pause Conference Audio Stream
  const handleTogglePlay = () => {
    if (allSegments.length === 0) return;
    if (playbackState.isPlaying) {
      conferenceSpeechManager.pauseAudio();
    } else {
      if (playbackState.currentSegmentIndex >= 0) {
        conferenceSpeechManager.resumeAudio();
      } else {
        conferenceSpeechManager.playSegment(activeSegmentIndex);
      }
    }
  };

  // Play specific segment
  const handlePlaySpecificSegment = (index: number) => {
    setActiveSegmentIndex(index);
    conferenceSpeechManager.playSegment(index);
  };

  // Speed toggle
  const handleSpeedChange = (speed: 'normal' | 'slow') => {
    setPlaybackSpeed(speed);
    conferenceSpeechManager.setPlaybackSpeed(speed);
  };

  // Voice persona change
  const handlePersonaChange = (persona: IndianVoicePersona) => {
    setVoicePersona(persona);
    indicSpeech.setPersona(persona);
  };

  // Save edited Conference Info
  const handleSaveConfInfo = () => {
    setConferenceInfo((prev) => ({
      ...prev,
      title: editTitle.trim() || 'Live Multilingual Conference',
      venue: editVenue.trim() || 'Main Auditorium',
      subtitle: editSubtitle.trim() || 'Real-Time Simultaneous Speech Interpretation',
    }));
    setIsEditingConfInfo(false);
  };

  // Add a new session for the upcoming conference
  const handleAddSession = () => {
    if (!newSessionTitle.trim()) return;
    const newSession: UpcomingSessionConfig = {
      id: `session-${Date.now()}`,
      sessionNumber: sessions.length + 1,
      title: newSessionTitle.trim(),
      track: newSessionTrack.trim() || 'Main Auditorium',
      timeSlot: `Session ${sessions.length + 1}`,
      sessionType: 'plenary',
    };
    setSessions((prev) => [...prev, newSession]);
    setSelectedSessionId(newSession.id);
    setNewSessionTitle('');
    setIsAddingSession(false);
  };

  // Live Speaker Microphone Start/Stop
  const handleToggleSpeakerMic = async () => {
    if (isMicBroadcasting) {
      conferenceSpeechManager.stopSpeakerMic();
      setIsMicBroadcasting(false);
      if (audioLevelIntervalRef.current) clearInterval(audioLevelIntervalRef.current);
      setAudioLevel(0);
      setInterimTranscript('');
    } else {
      // Pause playback so audio does not feedback into microphone
      conferenceSpeechManager.stopAudio();

      const started = await conferenceSpeechManager.startSpeakerMic(speakerLang, {
        onInterimText: (text) => {
          setInterimTranscript(text);
        },
        onFinalSegment: async (text) => {
          setInterimTranscript('');
          await handleNewLiveSegment(
            text,
            speakerLang,
            speakerName || 'Stage Speaker',
            speakerTitle || 'Plenary Stage',
            speakerRoleType,
          );
        },
        onError: (err) => {
          console.warn('Live conference mic error:', err);
        },
        onStatusChange: (active) => {
          setIsMicBroadcasting(active);
        },
      });

      if (started) {
        audioLevelIntervalRef.current = setInterval(() => {
          setAudioLevel(conferenceSpeechManager.getSpeakerAudioLevel());
        }, 100);
      }
    }
  };

  // Process and translate new live intervention
  const handleNewLiveSegment = async (
    spokenText: string,
    spokenLang: LanguageCode,
    name: string,
    roleTitle: string,
    stageRole: 'chair' | 'host' | 'keynote' | 'moderator' | 'panelist' | 'audience',
  ) => {
    if (!spokenText.trim()) return;

    const tempId = `live-seg-${Date.now()}`;
    const newSegment: ConferenceSpeechSegment = {
      id: tempId,
      index: allSegments.length,
      speakerText: spokenText.trim(),
      speakerLang: spokenLang,
      speakerName: name,
      speakerRole: roleTitle,
      stageRole,
      timestamp: Date.now(),
      translations: {
        [spokenLang]: {
          translatedText: spokenText.trim(),
          transliteration: spokenText.trim(),
          nuanceNotes: `Delivered live on stage in ${SUPPORTED_LANGUAGES[spokenLang]?.name}`,
        },
      },
      status: 'translating',
    };

    setAllSegments((prev) => {
      const updated = [...prev, newSegment];
      setActiveSegmentIndex(updated.length - 1);
      return updated;
    });

    const segmentStartTime = Date.now();

    try {
      // Call translation API for the attendee's selected listening channel
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: spokenText,
          sourceLang: spokenLang,
          targetLang: listeningLang,
        }),
      });

      if (res.ok) {
        const transData = await res.json();
        const translationTimeMs = Date.now() - segmentStartTime;
        const asrMs = latencyProfile === 'ultra-low' ? 55 : latencyProfile === 'balanced' ? 75 : 110;
        const ttsMs = latencyProfile === 'ultra-low' ? 35 : latencyProfile === 'balanced' ? 50 : 80;
        const totalMs = asrMs + translationTimeMs + ttsMs;
        const breakdown: LatencyBreakdown = {
          asrMs,
          translationMs: translationTimeMs,
          ttsMs,
          totalMs,
        };

        setCurrentLatencyMs(totalMs);
        setLatencyBreakdown(breakdown);
        setLatencyHistory((prev) => [...prev.slice(-15), totalMs]);

        setAllSegments((prev) =>
          prev.map((s) => {
            if (s.id === tempId) {
              return {
                ...s,
                status: 'ready',
                latencyMs: totalMs,
                latencyBreakdown: breakdown,
                audioVolumeLevel: audioLevel > 0 ? audioLevel : 0.75,
                translations: {
                  ...s.translations,
                  [listeningLang]: {
                    translatedText: transData.translatedText,
                    transliteration: transData.transliteration,
                    nuanceNotes: transData.nuanceNotes,
                  },
                },
              };
            }
            return s;
          }),
        );

        // Voiced in attendee's headset channel in real-time
        if (autoSpeak && !playbackState.isPlaying) {
          indicSpeech.speak(transData.translatedText, listeningLang, {
            transliteration: transData.transliteration,
            speed: playbackSpeed,
          });
        }
      }
    } catch (e) {
      console.warn('Live conference translation error:', e);
    }
  };

  // Submit direct input from Soundboard / Audio Desk
  const handleDirectInputSubmit = async () => {
    if (!directInputText.trim()) return;
    setIsTranslatingDirect(true);
    await handleNewLiveSegment(
      directInputText.trim(),
      speakerLang,
      speakerName || 'Speaker',
      speakerTitle || 'Live Audio Line',
      speakerRoleType,
    );
    setDirectInputText('');
    setIsTranslatingDirect(false);
  };

  // Submit floor question or audience intervention
  const handleFloorInterventionSubmit = async () => {
    if (!floorInterventionText.trim()) return;
    setIsSubmittingIntervention(true);
    await handleNewLiveSegment(
      floorInterventionText.trim(),
      floorSpeakerLang,
      floorSpeakerName || 'Floor Delegate',
      'Audience Floor Intercom',
      'audience',
    );
    setFloorInterventionText('');
    setIsSubmittingIntervention(false);
    setIsFloorMicOpen(false);
  };

  // Reset or clear proceedings for next session
  const handleClearProceedings = () => {
    if (allSegments.length === 0) return;
    const confirmClear = window.confirm(
      'Are you sure you want to clear the live proceedings transcript? Make sure you have exported your transcript if needed.',
    );
    if (confirmClear) {
      conferenceSpeechManager.stopAudio();
      setAllSegments([]);
      setActiveSegmentIndex(0);
      try {
        localStorage.removeItem('indicvoice_live_proceedings');
      } catch (e) {}
    }
  };

  // Copy segment text
  const handleCopySegment = (seg: ConferenceSpeechSegment) => {
    const trans = seg.translations[listeningLang];
    const textToCopy = `[${seg.speakerName || 'Speaker'} (${seg.speakerLang.toUpperCase()})]: ${seg.speakerText}\n[Heard in ${SUPPORTED_LANGUAGES[listeningLang].name}]: ${trans?.translatedText || seg.speakerText}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSegmentId(seg.id);
    setTimeout(() => setCopiedSegmentId(null), 2000);
  };

  // Export Conference Proceedings report (TXT or JSON)
  const handleExportProceedings = (format: 'txt' | 'json') => {
    if (allSegments.length === 0) {
      alert('No live speech segments recorded yet. Start speaking or broadcasting to generate proceedings.');
      return;
    }

    if (format === 'json') {
      const dataStr = JSON.stringify(
        {
          conference: conferenceInfo,
          exportedAt: new Date().toISOString(),
          listeningChannel: listeningLang,
          totalInterventions: allSegments.length,
          proceedings: allSegments,
        },
        null,
        2,
      );
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conferenceInfo.title.replace(/\s+/g, '_')}_Official_Proceedings_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const lines = [
      `================================================================================`,
      `${conferenceInfo.title.toUpperCase()} - OFFICIAL PROCEEDINGS`,
      `${conferenceInfo.subtitle}`,
      `Venue: ${conferenceInfo.venue}`,
      `Attendee Listening Channel: ${SUPPORTED_LANGUAGES[listeningLang].name} (${SUPPORTED_LANGUAGES[listeningLang].nativeName})`,
      `Export Timestamp: ${new Date().toLocaleString()}`,
      `Total Recorded Interventions: ${allSegments.length}`,
      `================================================================================\n`,
      `CHRONOLOGICAL LIVE MULTILINGUAL TRANSCRIPT:`,
      `--------------------------------------------------------------------------------\n`,
    ];

    allSegments.forEach((seg, idx) => {
      const trans = seg.translations[listeningLang];
      lines.push(
        `[#${idx + 1}] ${seg.speakerName || 'Speaker'} • ${seg.speakerRole || 'Stage'} [Delivered in ${seg.speakerLang.toUpperCase()}]`,
      );
      lines.push(`Spoken: "${seg.speakerText}"`);
      if (trans) {
        lines.push(
          `Translated [${listeningLang.toUpperCase()}]: "${trans.translatedText}"`,
        );
        if (trans.transliteration) {
          lines.push(`Phonetic Guide: ${trans.transliteration}`);
        }
      }
      lines.push(`Time: ${new Date(seg.timestamp).toLocaleTimeString()}\n`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conferenceInfo.title.replace(/\s+/g, '_')}_Proceedings_${listeningLang}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered segments for search query
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return allSegments;
    const q = searchQuery.toLowerCase();
    return allSegments.filter(
      (s) =>
        s.speakerText.toLowerCase().includes(q) ||
        (s.speakerName && s.speakerName.toLowerCase().includes(q)) ||
        (s.speakerRole && s.speakerRole.toLowerCase().includes(q)) ||
        (s.translations[listeningLang]?.translatedText &&
          s.translations[listeningLang]?.translatedText.toLowerCase().includes(q)),
    );
  }, [allSegments, searchQuery, listeningLang]);

  const currentSegment = allSegments[activeSegmentIndex] || allSegments[0];
  const currentTranslation = currentSegment?.translations[listeningLang];

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 1. UPCOMING CONFERENCE LIVE HEADER & SETUP                   */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>READY FOR LIVE CONFERENCE</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>6 Indic Channels Live</span>
              </span>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Zero Prior Conferences • Fresh Clean Session</span>
              </span>
            </div>

            {/* Editable Conference Title */}
            {isEditingConfInfo ? (
              <div className="pt-2 pb-1 space-y-2 max-w-xl">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Conference Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-lg font-black text-slate-900 border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter your conference name..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Venue / Hall</label>
                    <input
                      type="text"
                      value={editVenue}
                      onChange={(e) => setEditVenue(e.target.value)}
                      className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Main Auditorium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Subtitle / Theme</label>
                    <input
                      type="text"
                      value={editSubtitle}
                      onChange={(e) => setEditSubtitle(e.target.value)}
                      className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Annual Summit 2026"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSaveConfInfo}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Save Conference Details
                  </button>
                  <button
                    onClick={() => setIsEditingConfInfo(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    {conferenceInfo.title}
                  </h1>
                  <button
                    onClick={() => {
                      setEditTitle(conferenceInfo.title);
                      setEditVenue(conferenceInfo.venue);
                      setEditSubtitle(conferenceInfo.subtitle);
                      setIsEditingConfInfo(true);
                    }}
                    title="Edit conference title & venue for your event"
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  {conferenceInfo.subtitle} • {conferenceInfo.venue}
                </p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExportProceedings('txt')}
              disabled={allSegments.length === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Download official proceedings transcript"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Transcript</span>
            </button>

            <button
              onClick={() => handleExportProceedings('json')}
              disabled={allSegments.length === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Download structured JSON dataset"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>JSON</span>
            </button>

            <button
              onClick={() => setIsPresentationMode(true)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Auditorium screen projector display"
            >
              <Maximize2 className="w-4 h-4 text-amber-400" />
              <span>Stage Screen</span>
            </button>

            {/* Audience QR Code & Link Share Button */}
            <button
              onClick={() => setShowAudienceModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Show Audience QR Code & Live Link for attendees and projectors"
            >
              <QrCode className="w-4 h-4" />
              <span>Audience QR</span>
            </button>

            {allSegments.length > 0 && (
              <button
                onClick={handleClearProceedings}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs transition-colors"
                title="Clear live proceedings for next session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sessions Track Selector for Next Week's Program */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Conference Sessions & Tracks (Switch or Add Sessions for Next Week)</span>
            </span>
            <button
              onClick={() => setIsAddingSession((prev) => !prev)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Session Track</span>
            </button>
          </div>

          {/* Add Session Form */}
          {isAddingSession && (
            <div className="mb-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-center gap-2 text-xs">
              <input
                type="text"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="Session Name (e.g. Session 5: Policy Debate)..."
                className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={newSessionTrack}
                onChange={(e) => setNewSessionTrack(e.target.value)}
                placeholder="Track / Venue (e.g. Hall B)..."
                className="w-full sm:w-44 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={handleAddSession}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsAddingSession(false)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Session Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            <button
              onClick={() => setSelectedSessionId('all')}
              className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between ${
                selectedSessionId === 'all'
                  ? 'bg-indigo-900 text-white border-indigo-900 shadow-sm ring-2 ring-indigo-500/30'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
                  Continuous
                </span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </div>
              <div className="font-extrabold text-xs leading-tight">Entire Conference</div>
              <div className="text-[10px] opacity-75 mt-1">All Live Interventions</div>
            </button>

            {sessions.map((sess) => {
              const isSelected = selectedSessionId === sess.id;
              return (
                <button
                  key={sess.id}
                  onClick={() => setSelectedSessionId(sess.id)}
                  className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-400/40'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
                      Session {sess.sessionNumber}
                    </span>
                    <span className="text-[10px] opacity-70">{sess.track}</span>
                  </div>
                  <div className="font-bold text-xs leading-tight line-clamp-1">{sess.title}</div>
                  <div className="text-[10px] opacity-75 mt-1">{sess.timeSlot}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. CORE USER MANDATE: "USER SELECTION OF LANGUAGE TO BE HEARD"*/}
      {/* ============================================================ */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                    User Selection of Language to be heard
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                    Headset Channel
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Select which language you want to hear through your headphones throughout the entire conference:
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">Tuned Track:</span>
                <span className="font-bold text-amber-300">
                  {SUPPORTED_LANGUAGES[listeningLang]?.name} ({SUPPORTED_LANGUAGES[listeningLang]?.nativeName})
                </span>
              </div>

              {/* Persona Selector */}
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl border border-white/10 text-xs">
                <span className="text-slate-400">Voice:</span>
                <select
                  value={voicePersona}
                  onChange={(e) => handlePersonaChange(e.target.value as IndianVoicePersona)}
                  className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="ananya" className="bg-slate-900 text-white">Ananya (Clear)</option>
                  <option value="arjun" className="bg-slate-900 text-white">Arjun (Deep)</option>
                  <option value="pooja" className="bg-slate-900 text-white">Pooja (Melodious)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 6 Interactive Language Channel Buttons (User chooses language to be heard) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {LANGUAGE_LIST.map((lang) => {
              const isSelected = listeningLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectListeningLang(lang.code)}
                  className={`p-3 rounded-xl text-left transition-all relative border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-sm font-black">{lang.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className={`text-xs ${isSelected ? 'text-indigo-100 font-bold' : 'text-slate-400'}`}>
                    {lang.nativeName}
                  </div>
                  <div className="mt-2 text-[10px] font-mono tracking-wider uppercase opacity-80">
                    {isSelected ? '🎧 Tuning In' : 'Select Channel'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Audio Playback Controller Bar */}
          <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-4 bg-black/30 rounded-xl p-3 border border-white/5">
            {/* Play / Pause / Skip Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => conferenceSpeechManager.prevSegment()}
                disabled={activeSegmentIndex <= 0 || allSegments.length === 0}
                title="Previous Intervention"
                className="p-2 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/10 transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={handleTogglePlay}
                disabled={allSegments.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                {playbackState.isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Live Audio</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Hear Live in {SUPPORTED_LANGUAGES[listeningLang].name}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => conferenceSpeechManager.nextSegment()}
                disabled={activeSegmentIndex >= allSegments.length - 1 || allSegments.length === 0}
                title="Next Intervention"
                className="p-2 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/10 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => handlePlaySpecificSegment(0)}
                disabled={allSegments.length === 0}
                title="Replay from Beginning"
                className="p-2 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Conference Stream Progress */}
            <div className="flex-1 max-w-md w-full px-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>
                  {allSegments.length === 0 ? (
                    'Waiting for speaker mic broadcast...'
                  ) : (
                    <>
                      Intervention <strong>{activeSegmentIndex + 1}</strong> of {allSegments.length}
                    </>
                  )}
                </span>
                <span className="text-slate-300 font-mono">
                  {allSegments.length > 0
                    ? `${Math.round(((activeSegmentIndex + 1) / Math.max(allSegments.length, 1)) * 100)}%`
                    : 'Live Ready'}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-1.5 transition-all duration-300"
                  style={{
                    width: allSegments.length > 0
                      ? `${((activeSegmentIndex + 1) / Math.max(allSegments.length, 1)) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>

            {/* Cadence & Speed Selector */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 text-[11px]">Speech Pace:</span>
              <div className="flex bg-white/10 p-0.5 rounded-lg">
                <button
                  onClick={() => handleSpeedChange('normal')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                    playbackSpeed === 'normal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300'
                  }`}
                >
                  1.0x Normal
                </button>
                <button
                  onClick={() => handleSpeedChange('slow')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                    playbackSpeed === 'slow' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300'
                  }`}
                >
                  0.8x Clear
                </button>
              </div>

              {/* Auto-scroll toggle */}
              <button
                onClick={() => setAutoScroll((prev) => !prev)}
                title="Toggle Teleprompter Auto-Scroll"
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  autoScroll ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/40' : 'text-slate-400'
                }`}
              >
                Auto-Scroll
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2.5 REAL-TIME VOLUME LEVEL & LATENCY LEVEL TELEMETRY CONSOLE */}
      {/* ============================================================ */}
      <VolumeLatencyConsole
        currentLatencyMs={currentLatencyMs}
        latencyBreakdown={latencyBreakdown}
        latencyHistory={latencyHistory}
        currentLatencyProfile={latencyProfile}
        onChangeLatencyProfile={handleChangeLatencyProfile}
        micAudioLevel={audioLevel}
        isMicActive={isMicBroadcasting}
        isAudioPlaying={playbackState.isPlaying || indicSpeech.isSpeaking()}
      />

      {/* ============================================================ */}
      {/* 3. LIVE STAGE PODIUM & FLOOR MICROPHONE (TRANSLATE LIVE)      */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Live Stage & Floor Microphone Broadcast
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-200">
                  Live Microphone
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Speaker can speak any one of the 6 languages. The audience hears immediate speech in their selected channel!
              </p>
            </div>
          </div>

          {/* Broadcast Mic Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSpeakerMic}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                isMicBroadcasting
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse ring-4 ring-red-200'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {isMicBroadcasting ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop Stage Mic</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Take Stage / Podium Mic</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Speaker Language & Details Form */}
        <div className="pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Speaker Name:</label>
              <input
                type="text"
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
                placeholder="e.g. Speaker Name"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Speaker Role / Title:</label>
              <input
                type="text"
                value={speakerTitle}
                onChange={(e) => setSpeakerTitle(e.target.value)}
                placeholder="e.g. Keynote Speaker • Main Stage"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Stage Role:</label>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setSpeakerRoleType('podium')}
                  className={`flex-1 py-1 rounded-md transition-all text-center ${
                    speakerRoleType === 'podium' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Podium
                </button>
                <button
                  onClick={() => setSpeakerRoleType('panelist')}
                  className={`flex-1 py-1 rounded-md transition-all text-center ${
                    speakerRoleType === 'panelist' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Panelist
                </button>
                <button
                  onClick={() => setSpeakerRoleType('floor_qa')}
                  className={`flex-1 py-1 rounded-md transition-all text-center ${
                    speakerRoleType === 'floor_qa' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Floor Mic
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-700">
              Language Being Spoken on Stage:
            </span>
            <span className="text-xs text-orange-950 font-bold">
              {SUPPORTED_LANGUAGES[speakerLang]?.name} ({SUPPORTED_LANGUAGES[speakerLang]?.nativeName})
            </span>
          </div>

          {/* 6 Language Cards for Delivery (Speaker can speak any one of the 6 languages) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {LANGUAGE_LIST.map((lang) => {
              const isSelected = speakerLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectSpeakerLang(lang.code)}
                  className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-orange-50 text-orange-950 border-orange-400 shadow-xs ring-2 ring-orange-400/40'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black">{lang.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-orange-600" />}
                  </div>
                  <div className={`text-[11px] ${isSelected ? 'text-orange-800 font-bold' : 'text-slate-500'}`}>
                    {lang.nativeName}
                  </div>
                  <div className="mt-1.5 text-[10px] uppercase font-semibold">
                    {isSelected ? '🎙️ Spoken Lang' : 'Select'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Mic Interim Transcript Banner */}
          {isMicBroadcasting && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs text-red-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-red-600 animate-spin" />
                  <span>Microphone Open: Listening in {SUPPORTED_LANGUAGES[speakerLang]?.name}...</span>
                </span>
                <span className="text-[11px] font-mono">Audio Level: {Math.round(audioLevel * 100)}%</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 italic min-h-[24px]">
                {interimTranscript || 'Speak clearly into your microphone... Live translation will generate upon pause.'}
              </div>
            </div>
          )}

          {/* Soundboard / Audio Desk Direct Entry */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={directInputText}
              onChange={(e) => setDirectInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDirectInputSubmit()}
              placeholder={`Type or paste speech directly in ${SUPPORTED_LANGUAGES[speakerLang]?.name} (Audio Desk Line-In)...`}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <button
              onClick={handleDirectInputSubmit}
              disabled={!directInputText.trim() || isTranslatingDirect}
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Live</span>
            </button>
          </div>

          {/* Audience Floor Intercom Accordion */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Audience Floor Intercom (Delegate Questions)</span>
              </span>
              <button
                onClick={() => setIsFloorMicOpen((prev) => !prev)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {isFloorMicOpen ? 'Hide Floor Input' : 'Open Floor Mic / Intercom'}
              </button>
            </div>

            {isFloorMicOpen && (
              <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Delegate Name / Region:</label>
                    <input
                      type="text"
                      value={floorSpeakerName}
                      onChange={(e) => setFloorSpeakerName(e.target.value)}
                      placeholder="e.g. Delegate from Floor"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Language Spoken by Delegate:</label>
                    <select
                      value={floorSpeakerLang}
                      onChange={(e) => setFloorSpeakerLang(e.target.value as LanguageCode)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {LANGUAGE_LIST.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name} ({lang.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1 text-xs">Floor Question / Statement:</label>
                  <textarea
                    rows={2}
                    value={floorInterventionText}
                    onChange={(e) => setFloorInterventionText(e.target.value)}
                    placeholder="Enter delegate question to translate live into attendee headsets..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleFloorInterventionSubmit}
                    disabled={!floorInterventionText.trim() || isSubmittingIntervention}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Conference Feed</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. LIVE CONFERENCE PROCEEDINGS (CLEAN SLATE FOR NEXT WEEK)    */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-slate-900">
                Live Conference Proceedings
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200">
                {allSegments.length} Interventions
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Parallel transcript: Original speech alongside live translation in your chosen listening channel.
            </p>
          </div>

          {/* Search bar */}
          {allSegments.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search live speeches..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Clean State: Zero Prior Conferences / Ready to begin */}
        {allSegments.length === 0 ? (
          <div className="py-12 px-4 text-center max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <Radio className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-900">
                Ready for Live Conference
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                All 6 Indic translation channels (Hindi, Tamil, Telugu, Kannada, Malayalam, English) are standing by.
                Turn on the <strong>Stage / Podium Mic</strong> or use the <strong>Floor Intercom</strong> above when your speakers begin to translate live speeches in real time.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setShowAudienceModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span>Audience Join QR & Link</span>
              </button>
              <button
                onClick={handleToggleSpeakerMic}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Mic className="w-4 h-4" />
                <span>Start Stage Mic</span>
              </button>
              <button
                onClick={() => setIsFloorMicOpen(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Floor Q&A</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            ref={segmentsContainerRef}
            className="mt-4 space-y-3 max-h-[550px] overflow-y-auto pr-1"
          >
            {filteredSegments.map((seg, idx) => {
              const isActive = activeSegmentIndex === idx;
              const trans = seg.translations[listeningLang];

              return (
                <div
                  key={seg.id}
                  id={`conference-seg-${idx}`}
                  onClick={() => handlePlaySpecificSegment(idx)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-sm ring-2 ring-indigo-400/30'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <strong className="text-xs text-slate-900 font-bold">
                        {seg.speakerName || 'Speaker'}
                      </strong>
                      <span className="text-[11px] text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500">{seg.speakerRole}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {seg.latencyMs && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${
                            seg.latencyMs < 250
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : seg.latencyMs < 500
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                          title={`Round-trip latency: ${seg.latencyMs}ms (ASR: ${seg.latencyBreakdown?.asrMs || '~50'}ms, MT: ${seg.latencyBreakdown?.translationMs || '~90'}ms, TTS: ${seg.latencyBreakdown?.ttsMs || '~40'}ms)`}
                        >
                          <Zap className="w-2.5 h-2.5" />
                          <span>{seg.latencyMs}ms</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                        Spoken: {SUPPORTED_LANGUAGES[seg.speakerLang]?.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-800 border border-indigo-200">
                        Heard: {SUPPORTED_LANGUAGES[listeningLang]?.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySegment(seg);
                        }}
                        title="Copy segment"
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                      >
                        {copiedSegmentId === seg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Original Spoken Text:
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {seg.speakerText}
                      </p>
                    </div>

                    <div className="bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 mb-1 flex items-center justify-between">
                        <span>Translated to {SUPPORTED_LANGUAGES[listeningLang]?.name}:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            indicSpeech.speak(trans?.translatedText || seg.speakerText, listeningLang, {
                              transliteration: trans?.transliteration,
                              speed: playbackSpeed,
                            });
                          }}
                          className="p-0.5 text-indigo-600 hover:text-indigo-900 rounded"
                          title="Replay speech audio"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-indigo-950 leading-relaxed">
                        {trans?.translatedText || seg.speakerText}
                      </p>
                      {trans?.transliteration && (
                        <div className="mt-1 text-[11px] text-indigo-700 font-mono">
                          {trans.transliteration}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. AUDITORIUM STAGE PROJECTION MODE (FULL SCREEN MODAL)      */}
      {/* ============================================================ */}
      {isPresentationMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6 sm:p-10">
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  Auditorium Stage Subtitles • {conferenceInfo.title}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-1 text-white">
                Live Subtitles Stream
              </h2>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAudienceModal(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                title="Project Audience QR Code on Stage Screen"
              >
                <QrCode className="w-4 h-4" />
                <span>Audience QR on Stage</span>
              </button>

              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl text-xs font-bold">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Active Channel: {SUPPORTED_LANGUAGES[listeningLang].name}</span>
              </div>
              <button
                onClick={() => setIsPresentationMode(false)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                title="Exit Presentation Mode"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full py-8 space-y-6">
            {currentSegment ? (
              <>
                <div className="space-y-2">
                  <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>
                      {currentSegment.speakerName || 'Speaker'} ({SUPPORTED_LANGUAGES[currentSegment.speakerLang]?.name})
                    </span>
                  </div>
                  <div className="text-2xl sm:text-4xl font-normal text-slate-300 leading-relaxed">
                    "{currentSegment.speakerText}"
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                  <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>
                      Translated Subtitles ({SUPPORTED_LANGUAGES[listeningLang]?.name})
                    </span>
                  </div>
                  <div className="text-3xl sm:text-5xl font-black text-amber-300 leading-tight">
                    "{currentTranslation?.translatedText || currentSegment.speakerText}"
                  </div>
                  {currentTranslation?.transliteration && (
                    <div className="text-base sm:text-xl text-indigo-300 font-mono mt-2">
                      {currentTranslation.transliteration}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center space-y-3 py-12">
                <Radio className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
                <div className="text-2xl font-bold text-slate-400">
                  Stage Projection Active
                </div>
                <p className="text-slate-500 text-sm">
                  Waiting for speech on stage. Subtitles will appear here in real time.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setShowAudienceModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-lg"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Display Audience Scan QR on Main Screen</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-slate-400">
            <span>Press ESC or click minimize in top right to exit</span>
            <span>Venue: {conferenceInfo.venue}</span>
          </div>
        </div>
      )}

      {/* Audience Share Link & QR Code Modal */}
      <AudienceShareModal
        isOpen={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        conferenceTitle={conferenceInfo.title}
        conferenceVenue={conferenceInfo.venue}
      />
    </div>
  );
}
