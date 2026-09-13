import {
  LanguageCode,
  LiveClientMessage,
  LivePresenceSnapshot,
  LiveOperatorStatus,
  LiveServerMessage,
  ConferenceSpeechSegment,
} from '../types';

type LiveRole = 'operator' | 'audience';

interface LiveTransportCallbacks {
  onPresence?: (snapshot: LivePresenceSnapshot) => void;
  onOperatorStatus?: (status: LiveOperatorStatus) => void;
  onSegment?: (segment: ConferenceSpeechSegment) => void;
  onClear?: () => void;
  onStatus?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

class LiveConferenceTransport {
  private socket: WebSocket | null = null;
  private role: LiveRole | null = null;
  private sessionId = 'main';
  private language: LanguageCode = 'hi';
  private audioReady = false;
  private callbacks: LiveTransportCallbacks = {};
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private manuallyClosed = false;

  public connect(role: LiveRole, language: LanguageCode, callbacks: LiveTransportCallbacks, sessionId = 'main'): void {
    this.disconnect();
    this.role = role;
    this.language = language;
    this.sessionId = sessionId;
    this.callbacks = callbacks;
    this.manuallyClosed = false;
    this.open();
  }

  private open(): void {
    if (!this.role || typeof window === 'undefined') return;
    this.callbacks.onStatus?.('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//${window.location.host}/live`);
    this.socket.onopen = () => {
      this.callbacks.onStatus?.('connected');
      this.send({ type: 'join', role: this.role!, sessionId: this.sessionId, language: this.language });
      this.heartbeatTimer = window.setInterval(() => {
        this.send({ type: 'heartbeat', language: this.language, audioReady: this.audioReady });
      }, 10_000);
    };
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as LiveServerMessage;
        if (message.type === 'presence') this.callbacks.onPresence?.(message.snapshot);
        if (message.type === 'operator-status') this.callbacks.onOperatorStatus?.(message.status);
        if (message.type === 'segment') this.callbacks.onSegment?.(message.segment);
        if (message.type === 'clear') this.callbacks.onClear?.();
        if (message.type === 'error') this.callbacks.onStatus?.('error');
      } catch {
        this.callbacks.onStatus?.('error');
      }
    };
    this.socket.onclose = () => {
      this.stopHeartbeat();
      this.callbacks.onStatus?.('disconnected');
      if (!this.manuallyClosed) {
        this.reconnectTimer = window.setTimeout(() => this.open(), 2_000);
      }
    };
    this.socket.onerror = () => this.callbacks.onStatus?.('error');
  }

  private send(message: LiveClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  public publishSegment(segment: ConferenceSpeechSegment): void {
    if (this.role === 'operator') this.send({ type: 'segment', segment });
  }

  public clearSession(): void {
    if (this.role === 'operator') this.send({ type: 'clear' });
  }

  public publishOperatorStatus(status: LiveOperatorStatus): void {
    if (this.role === 'operator') this.send({ type: 'operator-status', status });
  }

  public setLanguage(language: LanguageCode): void {
    this.language = language;
    this.send({ type: 'heartbeat', language, audioReady: this.audioReady });
  }

  public setAudioReady(audioReady: boolean): void {
    this.audioReady = audioReady;
    this.send({ type: 'heartbeat', language: this.language, audioReady });
  }

  public disconnect(): void {
    this.manuallyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
    this.role = null;
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }
}

export const liveConferenceTransport = new LiveConferenceTransport();
