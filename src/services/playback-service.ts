import { QueueService } from './queue-service';
import { PlayerService } from './player-service';
import { MusicService } from './music-service';
import type { Song } from './music-service';

/**
 * PlaybackService
 * COORDINATOR service that handles high-level playback actions
 * like "play this song now" or "add this album to queue".
 */
export class PlaybackService {
  
  /**
   * Removes a song from the queue by its index
   */
  static async removeFromQueue(index: number) {
    try {
      await QueueService.removeSong(index);
      this.notifyQueueChanged();
    } catch (e) {
      console.error('PlaybackService: Failed to remove from queue', e);
    }
  }

  /**
   * Internal helper to notify components about queue state changes
   */
  private static notifyQueueChanged() {
    window.dispatchEvent(new CustomEvent('websonic-queue-changed'));
  }

  /**
   * Plays a single song immediately (clears queue first)
   */
  static async playSong(song: Song) {
    try {
      await QueueService.clearQueue();
      await QueueService.addSongs([song as any]);
      await PlayerService.getInstance().play();
      this.notifyQueueChanged();
    } catch (e) {
      console.error('PlaybackService: Failed to play song', e);
    }
  }

  /**
   * Adds one or more songs to the end of the queue
   */
  static async addToQueue(songs: Song[]) {
    try {
      await QueueService.addSongs(songs as any[]);
      this.notifyQueueChanged();
    } catch (e) {
      console.error('PlaybackService: Failed to add to queue', e);
    }
  }

  /**
   * Fetches all songs of an album and adds them to the queue
   */
  static async addAlbumToQueue(albumId: string) {
    try {
      const musicService = MusicService.getInstance();
      const songs = await musicService.getAlbumSongs(albumId);
      await this.addToQueue(songs);
    } catch (e) {
      console.error('PlaybackService: Failed to add album to queue', e);
    }
  }
}
