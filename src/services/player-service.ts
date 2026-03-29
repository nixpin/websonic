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
    if (!PlayerService.client) return;

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
        gain: queueState.gain,
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
    }
  }

  async next() {
    if (this._state.currentIndex === -1 || this._state.queueLength === 0) return;
    await QueueService.next(this._state.currentIndex, this._state.queueLength);
    this.refresh();
  }

  async prev() {
    if (this._state.currentIndex === -1) return;
    await QueueService.prev(this._state.currentIndex);
    this.refresh();
  }

  async jumpTo(index: number) {
    if (!PlayerService.client || index < 0 || index >= this._state.queueLength) return;
    
    // Optimistic Update
    this._state.currentIndex = index;
    this._state.currentTrack = this._state.items[index] || null;
    this._state.position = 0;
    this.notify();

    try {
      await PlayerService.client.jukeboxControl('skip', { index: index.toString(), offset: '0' });
      this.refresh();
    } catch (e) {
      console.error('PlayerService: JumpTo failed:', e);
    }
  }

  async togglePlayback() {
    if (!PlayerService.client) return;
    const action = this._state.isPlaying ? 'stop' : 'start';
    
    // Optimistic Update
    this._state.isPlaying = !this._state.isPlaying;
    this.notify();

    try {
      await PlayerService.client.jukeboxControl(action);
      this.refresh();
    } catch (e) {
      console.error('PlayerService: Playback toggle failed:', e);
      // Revert if failed? (For now let polling fix it)
    }
  }

  async stop() {
    if (!PlayerService.client) return;
    await PlayerService.client.jukeboxControl('stop');
    this.refresh();
  }

  async seek(seconds: number) {
    if (this._state.currentIndex === -1) return;
    
    // Optimistic Update for UI smoothness
    this._state.position = seconds;
    this.notify();

    await QueueService.seek(this._state.currentIndex, seconds);
    // Let the standard polling handle the final confirmation
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
