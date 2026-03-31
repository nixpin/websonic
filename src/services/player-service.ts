import { QueueService } from './queue-service';
import type { QueueItem, QueueState } from './queue-service';

export interface PlayerStatus {
  currentTrack: QueueItem | null;
  currentIndex: number;
  position: number;
  isPlaying: boolean;
  gain: number;
  bitRate?: number;
  format?: string;
  queueLength: number;
}

/**
 * PlayerService
 * Manages the live state of the playback.
 * Synchronizes with the server every few seconds.
 */
export class PlayerService {
  private static instance: PlayerService;

  private _state: PlayerStatus = {
    currentTrack: null,
    currentIndex: -1,
    position: 0,
    isPlaying: false,
    gain: 100,
    queueLength: 0
  };

  static getInstance(): PlayerService {
    if (!this.instance) {
      this.instance = new PlayerService();

      // Passively listen to queue changes from the server poller
      window.addEventListener('websonic-queue-changed', (e: Event) => {
        const state = (e as CustomEvent).detail;
        if (state && Object.keys(state).length > 0) {
          this.instance.setState(state);
        }
      });
    }
    return this.instance;
  }

  // Not strictly needed anymore since QueueService handles the client, 
  // but kept for interface compatibility if used elsewhere.
  static setClient() {
    // No-op
  }

  getState(): PlayerStatus {
    return { ...this._state };
  }

  /**
   * Updates the player status based on the server's QueueState.
   */
  setState(queueState: QueueState) {
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
      queueLength: queueState.items.length
    };

    const stateChanged = JSON.stringify(this._state) !== JSON.stringify(newState);
    if (stateChanged) {
      this._state = newState;
      this.notify();
    }
  }

  async next() {
    await QueueService.next();
    await QueueService.refresh();
  }

  async prev() {
    await QueueService.prev();
    await QueueService.refresh();
  }

  async jumpTo(index: number) {
    if (index < 0 || index >= this._state.queueLength) return;

    // Optimistic Update
    this._state.currentIndex = index;
    this._state.position = 0;
    this.notify();

    try {
      await QueueService.jumpTo(index);
      await QueueService.refresh();
    } catch (e) {
      console.error('PlayerService: JumpTo failed:', e);
    }
  }

  async start() {
    try {
      await QueueService.start();
      await QueueService.refresh();
    } catch (e) {
      console.error('PlayerService: Start failed:', e);
    }
  }

  async play() {
    return this.start();
  }

  async togglePlayback() {
    // Optimistic Update
    this._state.isPlaying = !this._state.isPlaying;
    this.notify();

    try {
      await QueueService.togglePlayback();
      await QueueService.refresh();
    } catch (e) {
      console.error('PlayerService: Playback toggle failed:', e);
    }
  }

  async stop() {
    try {
      await QueueService.stop();
      await QueueService.refresh();
    } catch (e) {
      console.error('PlayerService: Stop failed:', e);
    }
  }

  async seek(seconds: number) {
    if (this._state.currentIndex === -1) return;

    // Optimistic Update for UI smoothness
    this._state.position = seconds;
    this.notify();

    await QueueService.seek(seconds);
    await QueueService.refresh();
  }

  private _volumeTimeout: any = null;
  private _lastSentGain = -1;

  async setVolume(gain: number) {
    const value = Math.max(0, Math.min(100, gain));

    // Optimistic Update (Immediate)
    this._state.gain = value;
    this.notify();

    // Debounce server request
    if (this._volumeTimeout) clearTimeout(this._volumeTimeout);

    this._volumeTimeout = setTimeout(async () => {
      if (value === this._lastSentGain) return;

      try {
        // @TODO: maybe we need separate sub-service for volume control
        await QueueService.setVolume(value);
        this._lastSentGain = value;
        await QueueService.refresh();
      } catch (e) {
        console.error('PlayerService: SetVolume failed:', e);
      }
    }, 500);
  }

  private notify() {
    window.dispatchEvent(new CustomEvent('websonic-player-state-changed', {
      detail: this.getState()
    }));
  }

  getCoverArtUrl(id: string): string {
    return QueueService.getCoverArtUrl(id, 400);
  }
}
