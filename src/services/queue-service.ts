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
  private static _pendingItems: QueueItem[] = [];

  /**
   * Initialize the service with a Subsonic client instance.
   */
  static setClient(client: SubsonicClient) {
    this.client = client;
  }

  static getPendingItems(): QueueItem[] {
    return [...this._pendingItems];
  }

  /**
   * Fetches the current jukebox or play queue from the server.
   */
  static async fetchQueue(): Promise<QueueState> {
    if (!this.client) {
      console.warn('QueueService: No Subsonic client initialized.');
      return { items: [], currentIndex: -1, position: 0, isPlaying: false, gain: 1 };
    }

    try {
      let serverItems: QueueItem[] = [];
      let currentIndex = -1;
      let position = 0;
      let isPlaying = false;
      let gain = 1;

      // 1. Try Jukebox Control first (Server-side hardware playback)
      try {
        const response = await this.client.jukeboxControl('get');
        const jukebox = response.jukeboxPlaylist || response.jukeboxStatus;
        if (jukebox) {
          serverItems = jukebox.entry ? this.mapEntries(jukebox.entry) : [];
          currentIndex = (jukebox.currentIndex !== undefined && jukebox.currentIndex !== null) ? Number(jukebox.currentIndex) : -1;
          position = jukebox.position !== undefined ? Number(jukebox.position) : 0;
          isPlaying = jukebox.playing === 'true' || jukebox.playing === true;
          // Gonic returns float 0.0 to 1.0. 
          gain = (jukebox.gain !== undefined && jukebox.gain !== null) ? Number(jukebox.gain) : 1;
        }
      } catch (e: any) {
        if (!e.message?.includes('not found') && !e.message?.includes('70')) {
          throw e;
        }

        // 2. Fallback to getPlayQueue (User-specific session/streaming queue)
        const response = await this.client.getPlayQueue();
        const playQueue = response.playQueue;

        if (playQueue && (playQueue.entry || playQueue.current)) {
          serverItems = playQueue.entry ? this.mapEntries(playQueue.entry) : [];
          if (playQueue.current !== undefined) {
            const currentRef = String(playQueue.current);
            currentIndex = serverItems.findIndex(i => i.id === currentRef);
            if (currentIndex === -1 && !isNaN(Number(currentRef))) {
              currentIndex = Number(currentRef);
            }
          }
          position = playQueue.position || 0;
          isPlaying = currentIndex !== -1;
        }
      }

      // Reconciliation: Remove pending items that are now present in serverItems
      if (this._pendingItems.length > 0) {
        const serverIds = new Set(serverItems.map(item => item.id));
        this._pendingItems = this._pendingItems.filter(pending => !serverIds.has(pending.id));
      }

      return {
        items: serverItems,
        currentIndex,
        position,
        isPlaying,
        gain
      };
    } catch (error) {
      console.error('QueueService: Queue retrieval failed:', error);
      return { items: [], currentIndex: -1, position: 0, isPlaying: false, gain: 1 };
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

  static async clearQueue() {
    if (!this.client) return;
    this._pendingItems = []; 
    return this.client.jukeboxControl('clear');
  }

  static async removeSong(index: number) {
    if (!this.client || index < 0) return;
    return this.client.jukeboxControl('remove', { index: index.toString() });
  }

  static async next(currentIndex: number, totalItems: number) {
    if (!this.client || currentIndex < 0 || totalItems === 0) return;
    const targetIndex = (currentIndex + 1) % totalItems;
    return this.client.jukeboxControl('skip', { index: targetIndex.toString() });
  }

  static async prev(currentIndex: number) {
    if (!this.client || currentIndex < 0) return;
    const targetIndex = Math.max(0, currentIndex - 1);
    return this.client.jukeboxControl('skip', { index: targetIndex.toString(), offset: '0' });
  }

  static async reorderQueue(items: QueueItem[]) {
    if (!this.client) return;
    // Single atomic 'set' instead of clear + multiple additions
    return this.client.jukeboxControl('set', { id: items.map(i => i.id) });
  }

  static async seek(index: number, offset: number) {
    if (!this.client) return;
    return this.client.jukeboxControl('skip', {
      index: index.toString(),
      offset: Math.round(offset).toString()
    });
  }

  static async addSongs(items: QueueItem[]) {
    if (!this.client || items.length === 0) return;

    // Optimistically add to local list
    this._pendingItems = [...this._pendingItems, ...items];
    window.dispatchEvent(new CustomEvent('websonic-queue-changed'));

    // Single request with multiple IDs
    return this.client.jukeboxControl('add', { id: items.map(i => i.id) });
  }
}
