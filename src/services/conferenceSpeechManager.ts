import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { indicSpeech } from './indicSpeechService';

export interface ConferenceSpeechCallbacks {
  onInterimText?: (text: string) => void;
  onFinalSegment?: (text: string) => void;
  onError?: (err: any) => void;
  onStatusChange?: (isMicActive: boolean) => void;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentSegmentIndex: number;
  totalSegments: number;
  listeningLang: LanguageCode;
  speed: 'normal' | 'slow';
  volume: number;
  isMuted: boolean;
}

class ConferenceSpeechManager {
  private recognition: any = null;
  private isBroadcasting = false;
  private currentSpeakerLang: LanguageCode = 'en';
  private callbacks: ConferenceSpeechCallbacks = {};
  private restartTimeout: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private micSensitivity: number = 1.0;
  private volume: number = 1.0;
  private isMuted: boolean = false;

  // Listener audio queue state
  private listeningLang: LanguageCode = 'hi';
  private isAudioPlaying = false;
  private currentPlayingIndex = -1;
  private queueSegments: Array<{ id: string; text: string; transliteration?: string }> = [];
  private playbackListeners: Set<(state: PlaybackState) => void> = new Set();
  private userPaused = false;
  private playbackSpeed: 'normal' | 'slow' = 'normal';
  private autoAdvance = true;

  constructor() {
    this.initRecognition();
    this.volume = indicSpeech.getRawVolume();
    this.isMuted = indicSpeech.isVolumeMuted();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechClass) {
      try {
        this.recognition = new SpeechClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
      } catch (e) {
        console.warn('Continuous SpeechRecognition init warning:', e);
      }
    }
  }

  public isSupported(): boolean {
    return Boolean(this.recognition);
  }

  // ==========================================
  // Speaker Continuous Microphone Broadcast
  // ==========================================

  public async startSpeakerMic(
    lang: LanguageCode,
    callbacks: ConferenceSpeechCallbacks,
  ): Promise<boolean> {
    this.stopSpeakerMic();
    this.currentSpeakerLang = lang;
    this.callbacks = callbacks;
    this.isBroadcasting = true;

    // Initialize audio analyzer for live waveform
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
      }
    } catch (e) {
      console.warn('Conference mic audio analysis error:', e);
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      if (callbacks.onError) callbacks.onError('Speech Recognition not supported in this browser');
      return false;
    }

    const bcp47 = SUPPORTED_LANGUAGES[lang]?.bcp47 || 'en-IN';
    this.recognition.lang = bcp47;

    this.recognition.onstart = () => {
      if (this.callbacks.onStatusChange) this.callbacks.onStatusChange(true);
    };

    let accumulatedInterim = '';

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      accumulatedInterim = interim;
      if (interim && this.callbacks.onInterimText) {
        this.callbacks.onInterimText(interim);
      }

      if (final.trim() && this.callbacks.onFinalSegment) {
        this.callbacks.onFinalSegment(final.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Continuous recognition warning:', event.error);
      }
      if (this.callbacks.onError) {
        this.callbacks.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if speaker is still broadcasting (handles Web Speech pause timeout)
      if (this.isBroadcasting) {
        if (accumulatedInterim.trim().length > 10 && this.callbacks.onFinalSegment) {
          this.callbacks.onFinalSegment(accumulatedInterim.trim());
          accumulatedInterim = '';
        }
        this.restartTimeout = setTimeout(() => {
          if (this.isBroadcasting && this.recognition) {
            try {
              this.recognition.start();
            } catch (err) {
              // silent
            }
          }
        }, 200);
      } else {
        if (this.callbacks.onStatusChange) this.callbacks.onStatusChange(false);
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      console.warn('Could not start continuous conference recognition:', err);
      return false;
    }
  }

  public stopSpeakerMic(): void {
    this.isBroadcasting = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // silent
      }
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // silent
      }
      this.audioContext = null;
    }
    this.analyser = null;

    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(false);
    }
  }

  public getSpeakerAudioLevel(): number {
    if (!this.analyser) return 0;
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    const rawLevel = sum / buffer.length / 255;
    return Math.min(1.0, rawLevel * this.micSensitivity);
  }

  public setMicSensitivity(sensitivity: number): void {
    this.micSensitivity = Math.max(0.2, Math.min(2.5, sensitivity));
  }

  public getMicSensitivity(): number {
    return this.micSensitivity;
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1.5, volume));
    this.volume = clamped;
    indicSpeech.setVolume(clamped);
    this.notifyPlaybackState();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    indicSpeech.setMuted(muted);
    this.notifyPlaybackState();
  }

  public getVolume(): number {
    return this.isMuted ? 0 : this.volume;
  }

  public getRawVolume(): number {
    return this.volume;
  }

  public isVolumeMuted(): boolean {
    return this.isMuted;
  }

  public getIsBroadcasting(): boolean {
    return this.isBroadcasting;
  }

  public getSpeakerLang(): LanguageCode {
    return this.currentSpeakerLang;
  }

  public setSpeakerLang(lang: LanguageCode): void {
    if (this.currentSpeakerLang === lang) return;
    this.currentSpeakerLang = lang;

    // If currently broadcasting live mic, seamlessly update recognition language
    if (this.isBroadcasting && this.recognition) {
      const bcp47 = SUPPORTED_LANGUAGES[lang]?.bcp47 || 'en-IN';
      try {
        this.recognition.stop();
      } catch {
        // silent
      }
      this.recognition.lang = bcp47;
      if (this.restartTimeout) clearTimeout(this.restartTimeout);
      this.restartTimeout = setTimeout(() => {
        if (this.isBroadcasting && this.recognition) {
          try {
            this.recognition.start();
          } catch (e) {
            console.warn('Could not restart recognition in new speaker language:', e);
          }
        }
      }, 150);
    }
  }

  // ==========================================
  // Attendee / Listener Audio Channel Playback
  // (User Selection of Language to be heard)
  // ==========================================

  public setListeningLang(lang: LanguageCode): void {
    if (this.listeningLang === lang) return;
    this.listeningLang = lang;

    // A language change applies to the next complete segment. Do not replay
    // the partially spoken segment in another language.
    this.userPaused = true;
    this.isAudioPlaying = false;
    this.currentPlayingIndex = -1;
    indicSpeech.stop();
    this.notifyPlaybackState();
  }

  public setPlaybackSpeed(speed: 'normal' | 'slow'): void {
    this.playbackSpeed = speed;
    indicSpeech.setSpeed(speed);
    this.notifyPlaybackState();
  }

  public setQueue(
    segments: Array<{ id: string; text: string; transliteration?: string }>,
    lang: LanguageCode,
    autoPlay = false,
  ): void {
    this.queueSegments = segments;
    this.listeningLang = lang;

    if (autoPlay && segments.length > 0 && !this.isAudioPlaying) {
      this.playSegment(0);
    } else {
      this.notifyPlaybackState();
    }
  }

  public async playSegment(index: number): Promise<void> {
    if (index < 0 || index >= this.queueSegments.length) {
      this.isAudioPlaying = false;
      this.currentPlayingIndex = -1;
      this.notifyPlaybackState();
      return;
    }

    this.userPaused = false;
    this.currentPlayingIndex = index;
    this.isAudioPlaying = true;
    this.notifyPlaybackState();

    const segment = this.queueSegments[index];
    if (!segment || !segment.text.trim()) {
      // Skip empty segment
      if (this.autoAdvance && index + 1 < this.queueSegments.length) {
        this.playSegment(index + 1);
      } else {
        this.isAudioPlaying = false;
        this.notifyPlaybackState();
      }
      return;
    }

    try {
      await indicSpeech.speak(segment.text, this.listeningLang, {
        transliteration: segment.transliteration,
        speed: this.playbackSpeed,
        onEnd: () => {
          if (!this.userPaused && this.autoAdvance && this.currentPlayingIndex === index) {
            if (index + 1 < this.queueSegments.length) {
              this.playSegment(index + 1);
            } else {
              this.isAudioPlaying = false;
              this.notifyPlaybackState();
            }
          }
        },
        onError: () => {
          // If error occurs, advance after a brief pause
          if (this.autoAdvance && index + 1 < this.queueSegments.length) {
            setTimeout(() => this.playSegment(index + 1), 500);
          } else {
            this.isAudioPlaying = false;
            this.notifyPlaybackState();
          }
        },
      });
    } catch (e) {
      console.warn('Segment playback error:', e);
      this.isAudioPlaying = false;
      this.notifyPlaybackState();
    }
  }

  public pauseAudio(): void {
    this.userPaused = true;
    this.isAudioPlaying = false;
    indicSpeech.stop();
    this.notifyPlaybackState();
  }

  public resumeAudio(): void {
    this.userPaused = false;
    const targetIndex = this.currentPlayingIndex >= 0 ? this.currentPlayingIndex : 0;
    this.playSegment(targetIndex);
  }

  public stopAudio(): void {
    this.userPaused = true;
    this.isAudioPlaying = false;
    this.currentPlayingIndex = -1;
    indicSpeech.stop();
    this.notifyPlaybackState();
  }

  public nextSegment(): void {
    if (this.currentPlayingIndex + 1 < this.queueSegments.length) {
      this.playSegment(this.currentPlayingIndex + 1);
    }
  }

  public prevSegment(): void {
    if (this.currentPlayingIndex > 0) {
      this.playSegment(this.currentPlayingIndex - 1);
    }
  }

  public subscribePlayback(listener: (state: PlaybackState) => void): () => void {
    this.playbackListeners.add(listener);
    listener(this.getPlaybackState());
    return () => this.playbackListeners.delete(listener);
  }

  public getPlaybackState(): PlaybackState {
    return {
      isPlaying: this.isAudioPlaying,
      isPaused: this.userPaused,
      currentSegmentIndex: this.currentPlayingIndex,
      totalSegments: this.queueSegments.length,
      listeningLang: this.listeningLang,
      speed: this.playbackSpeed,
      volume: this.volume,
      isMuted: this.isMuted,
    };
  }

  private notifyPlaybackState(): void {
    const state = this.getPlaybackState();
    for (const listener of this.playbackListeners) {
      listener(state);
    }
  }
}

export const conferenceSpeechManager = new ConferenceSpeechManager();
