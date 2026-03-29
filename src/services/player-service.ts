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
    gain: 100
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
        format: currentTrack?.suffix?.toUpperCase()
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

  private notify() {
    window.dispatchEvent(new CustomEvent('websonic-player-state-changed', {
      detail: this._state
    }));
  }

  getCoverArtUrl(id: string): string {
    return PlayerService.client?.getCoverArtUrl(id, 400) || '';
  }
}
