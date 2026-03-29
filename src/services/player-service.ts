import { QueueService } from './queue-service';
import type { QueueItem, QueueState } from './queue-service';
import { SubsonicClient } from '../sdk/subsonic';

export interface PlayerStatus {
  currentTrack: QueueItem | null;
  currentIndex: number;
  position: number;
  isPlaying: boolean;
  gain: number;
  bitRate?: number;
  format?: string;
  queueLength: number;
  items: QueueItem[];
}

/**
 * PlayerService
 * Manages the live state of the playback.
 * Synchronizes with the server every few seconds.
 */
export class PlayerService {
  private static instance: PlayerService;
  private static client: SubsonicClient | null = null;

  private _isAwaitingServer = false;
  private _intervalId: any = null;
  private _state: PlayerStatus = {
    currentTrack: null,
    currentIndex: -1,
    position: 0,
    isPlaying: false,
    gain: 100,
    queueLength: 0,
    items: []
  };

  static getInstance(): PlayerService {
    if (!this.instance) {
      this.instance = new PlayerService();
    }
    return this.instance;
  }

  static setClient(client: SubsonicClient) {
    this.client = client;
    this.getInstance().startPolling();
  }

  getState(): PlayerStatus {
    return { ...this._state };
  }

  startPolling() {
    if (this._intervalId) return;

    // Initial fetch
    this.refresh();

    // Set up polling (every 5 seconds)
    this._intervalId = setInterval(() => this.refresh(), 5000);
  }

  stopPolling() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  async refresh() {
    if (!PlayerService.client || this._isAwaitingServer) return;

    this._isAwaitingServer = true;
    try {
      const queueState: QueueState = await QueueService.fetchQueue();

      const currentTrack = (queueState.currentIndex >= 0 && queueState.currentIndex < queueState.items.length)
        ? queueState.items[queueState.currentIndex]
        : null;

      const newState: PlayerStatus = {
        currentTrack,
        currentIndex: queueState.currentIndex,
        position: queueState.position,
        isPlaying: queueState.isPlaying,
        gain: Math.round((queueState.gain || 0) * 100), // Scale 0.0-1.0 to 0-100 for UI
        bitRate: currentTrack?.bitRate,
        format: currentTrack?.suffix?.toUpperCase(),
        queueLength: queueState.items.length,
        items: queueState.items
      };

      // Check if state changed
      const stateChanged = JSON.stringify(this._state) !== JSON.stringify(newState);

      if (stateChanged) {
        this._state = newState;
        this.notify();
      }
    } catch (error) {
      console.error('PlayerService: Failed to refresh state:', error);
    } finally {
      this._isAwaitingServer = false;
    }
  }

  async next() {
    if (!PlayerService.client || this._isAwaitingServer || this._state.currentIndex === -1 || this._state.queueLength === 0) return;
    this._isAwaitingServer = true;
    try {
      await QueueService.next(this._state.currentIndex, this._state.queueLength);
      await this.refresh();
    } finally {
      this._isAwaitingServer = false;
    }
  }

  async prev() {
    if (!PlayerService.client || this._isAwaitingServer || this._state.currentIndex === -1) return;
    this._isAwaitingServer = true;
    try {
      await QueueService.prev(this._state.currentIndex);
      await this.refresh();
    } finally {
      this._isAwaitingServer = false;
    }
  }

  async jumpTo(index: number) {
    if (!PlayerService.client || this._isAwaitingServer || index < 0 || index >= this._state.queueLength) return;

    // Optimistic Update
    this._state.currentIndex = index;
    this._state.currentTrack = this._state.items[index] || null;
    this._state.position = 0;
    this.notify();

    this._isAwaitingServer = true;
    try {
      await PlayerService.client.jukeboxControl('skip', { index: index.toString(), offset: '0' });
      await this.refresh();
    } catch (e) {
      console.error('PlayerService: JumpTo failed:', e);
    } finally {
      this._isAwaitingServer = false;
    }
  }

  async start() {
    if (!PlayerService.client || this._isAwaitingServer) return;
    this._isAwaitingServer = true;
    try {
      await PlayerService.client.jukeboxControl('start');
      await this.refresh();
    } catch (e) {
      console.error('PlayerService: Start failed:', e);
    } finally {
      this._isAwaitingServer = false;
    }
  }

  async play() {
    return this.start();
  }

  async togglePlayback() {
    if (!PlayerService.client || this._isAwaitingServer) return;
    const action = this._state.isPlaying ? 'stop' : 'start';

    // Optimistic Update
    this._state.isPlaying = !this._state.isPlaying;
    this.notify();

    this._isAwaitingServer = true;
    try {
      await PlayerService.client.jukeboxControl(action);
      await this.refresh();
    } catch (e) {
      console.error('PlayerService: Playback toggle failed:', e);
    } finally {
      this._isAwaitingServer = false;
    }
  }

  async stop() {
    if (!PlayerService.client || this._isAwaitingServer) return;
    this._isAwaitingServer = true;
    try {
      await PlayerService.client.jukeboxControl('stop');
      await this.refresh();
    } finally {
      this._isAwaitingServer = false;
    }
  }

  async seek(seconds: number) {
    if (!PlayerService.client || this._isAwaitingServer || this._state.currentIndex === -1) return;

    // Optimistic Update for UI smoothness
    this._state.position = seconds;
    this.notify();

    this._isAwaitingServer = true;
    try {
      await QueueService.seek(this._state.currentIndex, seconds);
    } finally {
      this._isAwaitingServer = false;
    }
  }

  private _volumeTimeout: any = null;
  private _lastSentGain = -1;

  async setVolume(gain: number) {
    if (!PlayerService.client) return;
    const value = Math.max(0, Math.min(100, gain));
    
    // Optimistic Update (Immediate)
    this._state.gain = value;
    this.notify();

    // Debounce server request
    if (this._volumeTimeout) clearTimeout(this._volumeTimeout);
    
    this._volumeTimeout = setTimeout(async () => {
      // Don't send if value is the same or already waiting
      if (this._isAwaitingServer || value === this._lastSentGain) return;
      
      try {
        // Scale 0-100 back to 0.0-1.0 for Subsonic/Gonic
        await PlayerService.client?.jukeboxControl('setGain', { gain: (value / 100).toString() });
        this._lastSentGain = value;
        await this.refresh();
      } catch (e) {
        console.error('PlayerService: SetVolume failed:', e);
      } finally {
        this._isAwaitingServer = false;
      }
    }, 500);
  }

  private notify() {
    window.dispatchEvent(new CustomEvent('websonic-player-state-changed', {
      detail: this.getState()
    }));
  }

  getCoverArtUrl(id: string): string {
    return PlayerService.client?.getCoverArtUrl(id, 400) || '';
  }
}
