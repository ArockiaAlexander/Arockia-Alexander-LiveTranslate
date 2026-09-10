import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface SpeechRecognitionHandlers {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: any) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class LiveSpeechManager {
  private recognition: any = null;
  private isListening = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
      } catch (e) {
        console.warn('Could not instantiate SpeechRecognition:', e);
      }
    }
  }

  public isSupported(): boolean {
    return Boolean(this.recognition);
  }

  public async startListening(
    lang: LanguageCode | 'auto',
    handlers: SpeechRecognitionHandlers,
  ): Promise<boolean> {
    if (this.isListening) {
      this.stopListening();
    }

    // Set up Web Audio visualizer stream
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);

        // Also record audio chunks as fallback
        if (typeof MediaRecorder !== 'undefined') {
          this.recordedChunks = [];
          this.mediaRecorder = new MediaRecorder(this.mediaStream);
          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.recordedChunks.push(e.data);
          };
          this.mediaRecorder.start();
        }
      }
    } catch (err) {
      console.warn('Microphone permission / AudioContext warning:', err);
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    if (this.recognition) {
      const bcp47 = lang !== 'auto' ? SUPPORTED_LANGUAGES[lang]?.bcp47 || 'hi-IN' : 'en-IN';
      this.recognition.lang = bcp47;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (handlers.onStart) handlers.onStart();
      };

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

        if (interim && handlers.onInterimResult) {
          handlers.onInterimResult(interim);
        }
        if (final && handlers.onFinalResult) {
          handlers.onFinalResult(final);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (handlers.onError) handlers.onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (handlers.onEnd) handlers.onEnd();
      };

      try {
        this.recognition.start();
        return true;
      } catch (e) {
        console.warn('Failed to start speech recognition directly:', e);
      }
    }

    return false;
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // silent
      }
    }
    this.isListening = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // silent
      }
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        // silent
      }
      this.audioContext = null;
    }
    this.analyser = null;
  }

  public getAudioLevels(): number {
    if (!this.analyser) return 0;
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    return sum / buffer.length / 255;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}

export const liveSpeechManager = new LiveSpeechManager();
