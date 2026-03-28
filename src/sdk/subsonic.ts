import md5 from 'crypto-js/md5';

export interface SubsonicConfig {
  baseUrl: string;
  userName: string;
  token: string; // MD5(password + salt)
  salt: string;
  clientName: string;
  apiVersion: string;
}

export class SubsonicClient {
  private config: SubsonicConfig;

  constructor(config: SubsonicConfig) {
    this.config = config;
  }

  static createToken(password: string, salt: string) {
    return md5(password + salt).toString();
  }

  private buildUrl(method: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.config.baseUrl}/rest/${method}.view`);
    url.searchParams.set('u', this.config.userName);
    url.searchParams.set('t', this.config.token);
    url.searchParams.set('s', this.config.salt);
    url.searchParams.set('v', this.config.apiVersion);
    url.searchParams.set('c', this.config.clientName);
    url.searchParams.set('f', 'json');

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }

  async fetch(method: string, params: Record<string, string> = {}) {
    const response = await fetch(this.buildUrl(method, params));
    const data = await response.json();
    if (data['subsonic-response'].status === 'failed') {
      throw new Error(data['subsonic-response'].error.message);
    }
    return data['subsonic-response'];
  }

  // Auth checking
  async ping() {
    return this.fetch('ping');
  }

  // Music browsing
  async getArtists() {
    return this.fetch('getArtists');
  }

  async getAlbumList(type: string = 'newest', size: number = 20) {
    return this.fetch('getAlbumList2', { type, size: size.toString() });
  }

  async search(query: string) {
    return this.fetch('search3', { query });
  }

  async getGenres() {
    return this.fetch('getGenres');
  }

  // Jukebox support
  async jukeboxControl(action: string, index?: number, id?: string) {
    const params: Record<string, string> = { action };
    if (index !== undefined) params.index = index.toString();
    if (id !== undefined) params.id = id;
    return this.fetch('jukeboxControl', params);
  }

  async getJukeboxPlaylist() {
    return this.fetch('jukeboxPlaylist');
  }

  // Songs searching/filtering
  async getSongs(_artistId?: string, _albumId?: string) {
    // In subsonic searching for all songs usually means searching with a broad query or browsing artists/albums.
    // However, some versions support getRandomSongs.
    return this.fetch('getRandomSongs', { size: '100' });
  }

  async getArtist(id: string) {
    return this.fetch('getArtist', { id });
  }
}
