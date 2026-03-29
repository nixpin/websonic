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
  position: number; // ms
  isPlaying: boolean;
  gain: number; // For jukebox volume
}

/**
 * QueueService
 * Handles fetching and managing the playback queue.
 * Relying on getPlayQueue (Subsonic 1.12.0+) for broad compatibility.
 */
export class QueueService {
  private static client: SubsonicClient | null = null;

  /**
   * Initialize the service with a Subsonic client instance.
   */
  static setClient(client: SubsonicClient) {
    this.client = client;
  }

  /**
   * Fetches the current jukebox or play queue from the server.
   */
  static async fetchQueue(): Promise<QueueState> {
    if (!this.client) {
      console.warn('QueueService: No Subsonic client initialized.');
      return { items: [], currentIndex: -1, position: 0, isPlaying: false, gain: 100 };
    }

    try {
      // 1. Try Jukebox Control first (Server-side hardware playback)
      try {
        const response = await this.client.jukeboxControl('get');
        const jukebox = response.jukeboxPlaylist || response.jukeboxStatus;
        if (jukebox) {
          const items = jukebox.entry ? this.mapEntries(jukebox.entry) : [];
          return {
            items,
            currentIndex: jukebox.currentIndex !== undefined ? Number(jukebox.currentIndex) : -1,
            position: 0, // jukeboxControl?action=get doesn't always return position
            isPlaying: jukebox.playing === 'true' || jukebox.playing === true,
            gain: jukebox.gain || 100
          };
        }
      } catch (e: any) {
        // If "view not found" (code 70), jukebox is disabled, fallback to getPlayQueue
        if (!e.message?.includes('not found') && !e.message?.includes('70')) {
          throw e; // Rethrow other errors
        }
      }

      // 2. Fallback to getPlayQueue (User-specific session/streaming queue)
      const response = await this.client.getPlayQueue();
      const playQueue = response.playQueue;

      if (!playQueue || (!playQueue.entry && !playQueue.current)) {
        return { items: [], currentIndex: -1, position: 0, isPlaying: false, gain: 100 };
      }

      const items = playQueue.entry ? this.mapEntries(playQueue.entry) : [];
      
      let currentIndex = -1;
      if (playQueue.current !== undefined) {
        const currentRef = String(playQueue.current);
        currentIndex = items.findIndex(i => i.id === currentRef);
        if (currentIndex === -1 && !isNaN(Number(currentRef))) {
          currentIndex = Number(currentRef);
        }
      }

      return {
        items,
        currentIndex,
        position: playQueue.position || 0,
        isPlaying: currentIndex !== -1, // Heuristic for fallback mode
        gain: 100
      };
    } catch (error) {
      console.error('QueueService: Queue retrieval failed:', error);
      return { items: [], currentIndex: -1, position: 0, isPlaying: false, gain: 100 };
    }
  }

  /**
   * Helper to normalize playlist entries.
   */
  private static mapEntries(entry: any): QueueItem[] {
    const entries = Array.isArray(entry) ? entry : [entry];

    return entries.map((song: any) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt,
      bitRate: song.bitRate,
      contentType: song.contentType,
      suffix: song.suffix
    }));
  }

  /**
   * Example: Clear the queue (Logic only, no UI yet)
   */
  static async clearQueue() {
    if (!this.client) return;
    return this.client.jukeboxControl('clear');
  }

  /**
   * Skip to next
   */
  static async skipNext() {
    if (!this.client) return;
    // We try jukeboxControl, but it might fail if module is disabled
    try {
      return await this.client.jukeboxControl('skip');
    } catch (e) {
      console.warn('QueueService: jukeboxControl not supported, skipping locally? (Not implemented)');
    }
  }
}
