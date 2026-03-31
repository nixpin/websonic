import { SubsonicClient } from '../sdk/subsonic';

export interface QueueItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverArt?: string;
  bitRate?: number;
  contentType?: string;
  suffix?: string;
}

export interface QueueState {
  items: QueueItem[];
  currentIndex: number;
  position: number; // seconds (Subsonic jukebox standard)
  isPlaying: boolean;
  gain: number; // 0.0 - 1.0 (Subsonic standard) or 0-100
}

/**
 * QueueService
 * Handles fetching and managing the playback queue.
 */
export class QueueService {
  private static client: SubsonicClient | null = null;
  private static _intervalId: any = null;
  private static _lastState: QueueState | null = null;

  /**
   * Initialize the service with a Subsonic client instance.
   */
  static setClient(client: SubsonicClient) {
    this.client = client;
    this.startPolling();
  }

  static startPolling() {
    if (this._intervalId) return;
    this.refresh();
    this._intervalId = setInterval(() => this.refresh(), 5000);
  }

  static stopPolling() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  static async refresh() {
    const state = await this.fetchQueue();
    
    window.dispatchEvent(new CustomEvent('websonic-queue-changed', {
      detail: state
    }));
  }

  private static async fetchJukeboxState(): Promise<QueueState | null> {
    if (!this.client) return null;

    try {
      const response = await this.client.jukeboxControl('get');
      const jukebox = response.jukeboxPlaylist || response.jukeboxStatus;
      if (!jukebox) return null;

      const items = jukebox.entry ? this.mapEntries(jukebox.entry) : [];
      const currentIndex = (jukebox.currentIndex !== undefined && jukebox.currentIndex !== null) ? Number(jukebox.currentIndex) : -1;
      const position = jukebox.position !== undefined ? Number(jukebox.position) : 0;
      const isPlaying = jukebox.playing === 'true' || jukebox.playing === true;
      const gain = (jukebox.gain !== undefined && jukebox.gain !== null) ? Number(jukebox.gain) : 0.3;

      return { items, currentIndex, position, isPlaying, gain };
    } catch (e: any) {
      if (!e.message?.includes('not found') && !e.message?.includes('70')) {
        throw e;
      }
      return null;
    }
  }

  /**
   * Fetches the current jukebox queue from the server.
   * Updates the static items array.
   */
  static async fetchQueue(): Promise<QueueState> {
    const defaultState: QueueState = { items: [], currentIndex: -1, position: 0, isPlaying: false, gain: 0.3 };

    if (!this.client) {
      console.warn('QueueService: No Subsonic client initialized.');
      return defaultState;
    }

    try {
      const state = await this.fetchJukeboxState();
      const finalState = state || defaultState;
      this._lastState = finalState;
      return finalState;
    } catch (error) {
      console.error('QueueService: Queue retrieval failed:', error);
      return { ...defaultState };
    }
  }

  /**
   * Helper to normalize playlist entries.
   */
  private static mapEntries(entry: any): QueueItem[] {
    const entries = Array.isArray(entry) ? entry : [entry];

    return entries.map((song: any) => ({
      id: song.id || '',
      title: song.title || 'Unknown Title',
      artist: song.artist || 'Unknown Artist',
      album: song.album || '',
      duration: song.duration ? Number(song.duration) : 0,
      coverArt: song.coverArt,
      bitRate: song.bitRate,
      contentType: song.contentType,
      suffix: song.suffix
    }));
  }

  // --- API Mutators ---

  static async clearQueue() {
    if (!this.client) return;
    return this.client.jukeboxControl('clear');
  }

  static async addSongs(items: QueueItem[]) {
    if (!this.client || items.length === 0) return;
    return this.client.jukeboxControl('add', { id: items.map(i => i.id) });
  }

  static async removeSong(index: number) {
    if (!this.client || index < 0) return;
    return this.client.jukeboxControl('remove', { index: index.toString() });
  }

  static getCoverArtUrl(id: string, size: number = 400): string {
    return this.client?.getCoverArtUrl(id, size) || '';
  }

  static async reorderQueue(items: QueueItem[]) {
    if (!this.client) return;
    return this.client.jukeboxControl('set', { id: items.map(i => i.id) });
  }

  static async next() {
    if (!this.client || !this._lastState || this._lastState.currentIndex < 0 || this._lastState.items.length === 0) return;
    const targetIndex = (this._lastState.currentIndex + 1) % this._lastState.items.length;
    return this.client.jukeboxControl('skip', { index: targetIndex.toString() });
  }

  static async prev() {
    if (!this.client || !this._lastState || this._lastState.currentIndex < 0) return;
    const targetIndex = Math.max(0, this._lastState.currentIndex - 1);
    return this.client.jukeboxControl('skip', { index: targetIndex.toString(), offset: '0' });
  }

  static async jumpTo(index: number) {
    if (!this.client || index < 0) return;
    return this.client.jukeboxControl('skip', { index: index.toString(), offset: '0' });
  }

  static async seek(offset: number) {
    if (!this.client || !this._lastState || this._lastState.currentIndex < 0) return;
    return this.client.jukeboxControl('skip', {
      index: this._lastState.currentIndex.toString(),
      offset: Math.round(offset).toString()
    });
  }

  static async togglePlayback() {
    if (!this.client || !this._lastState) return;
    const action = this._lastState.isPlaying ? 'stop' : 'start';
    return this.client.jukeboxControl(action);
  }

  static async start() {
    if (!this.client) return;
    return this.client.jukeboxControl('start');
  }

  static async stop() {
    if (!this.client) return;
    return this.client.jukeboxControl('stop');
  }

  static async setVolume(gain: number) {
    if (!this.client) return;
    const value = Math.max(0, Math.min(100, gain));
    return this.client.jukeboxControl('setGain', { gain: (value / 100).toString() });
  }
}
