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

  private getAuthorizedUrl(method: string, params: Record<string, any> = {}): URL {
    const url = new URL(`${this.config.baseUrl}/rest/${method}.view`);
    url.searchParams.set('u', this.config.userName);
    url.searchParams.set('t', this.config.token);
    url.searchParams.set('s', this.config.salt);
    url.searchParams.set('v', this.config.apiVersion);
    url.searchParams.set('c', this.config.clientName);
    url.searchParams.set('f', 'json');

    Object.entries(params).forEach(([key, value]) => {
      // For URL generation, we only add non-array parameters
      if (!Array.isArray(value)) {
        url.searchParams.set(key, String(value));
      }
    });

    return url;
  }

  /**
   * Intelligently selects GET or POST based on action and payload.
   * Jukebox 'set' and 'add' actions often have many IDs and require POST.
   */
  async fetch(method: string, params: Record<string, any> = {}) {
    const isMutation = method === 'jukeboxControl' && (params.action === 'set' || params.action === 'add');

    if (isMutation) {
      return this.fetchPost(method, params);
    }
    return this.fetchGet(method, params);
  }

  private async fetchGet(method: string, params: Record<string, any>) {
    const url = this.getAuthorizedUrl(method, params);
    
    // Add array parameters to query string
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, String(v)));
      }
    });

    const response = await fetch(url.toString());
    return this.handleResponse(response);
  }

  private async fetchPost(method: string, params: Record<string, any>) {
    // Auth params go in URL for widest compatibility
    const url = this.getAuthorizedUrl(method);
    
    // Mutation data goes in Body
    const body = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => body.append(key, String(v)));
      } else {
        body.set(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    return this.handleResponse(response);
  }

  private async handleResponse(response: Response) {
    const data = await response.json();
    const subRes = data['subsonic-response'];
    if (subRes.status === 'failed') {
      throw new Error(subRes.error.message || `Subsonic Error ${subRes.error.code}`);
    }
    return subRes;
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
  async jukeboxControl(action: string, params: Record<string, string | string[]> = {}) {
    return this.fetch('jukeboxControl', { action, ...params });
  }

  async getPlayQueue() {
    return this.fetch('getPlayQueue');
  }

  getCoverArtUrl(id: string, size: number = 200) {
    const params: Record<string, string> = { id };
    if (size) params.size = size.toString();
    return this.getAuthorizedUrl('getCoverArt', params).toString();
  }

  // Songs searching/filtering
  async getSongs(_artistId?: string, _albumId?: string) {
    return this.fetch('getRandomSongs', { size: '100' });
  }

  async getArtist(id: string) {
    return this.fetch('getArtist', { id });
  }
}
