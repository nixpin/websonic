import { AuthService } from './auth-service';

export interface Artist {
  id: string;
  name: string;
  albumCount?: number;
  artistImageUrl?: string;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  year?: number;
  genre?: string;
  coverArt?: string;
  songCount?: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  duration?: number;
  coverArt?: string;
  bitRate?: number;
  suffix?: string;
}

export interface Genre {
  name: string;
  value?: string; // Subsonic sometimes uses value in JSON
  songCount?: number;
  albumCount?: number;
}

export interface Playlist {
  id: string;
  name: string;
  songCount?: number;
  duration?: number;
}

export class MusicService {
  private static instance: MusicService;

  private constructor() {}

  public static getInstance(): MusicService {
    if (!MusicService.instance) {
      MusicService.instance = new MusicService();
    }
    return MusicService.instance;
  }

  private async fetchSubsonic(method: string, params: Record<string, string> = {}) {
    const config = AuthService.getActiveConfig();
    if (!config) throw new Error('No active Subsonic configuration');

    const url = new URL(`${config.baseUrl}/rest/${method}.view`);
    url.searchParams.set('u', config.userName);
    url.searchParams.set('t', config.token);
    url.searchParams.set('s', config.salt);
    url.searchParams.set('v', '1.16.1');
    url.searchParams.set('c', 'websonic');
    url.searchParams.set('f', 'json');

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data['subsonic-response']?.status === 'failed') {
      throw new Error(data['subsonic-response'].error?.message || 'Subsonic request failed');
    }

    return data['subsonic-response'];
  }

  async getArtists(offset = 0, size = 20): Promise<Artist[]> {
    // According to user, offset and size are supported here
    const data = await this.fetchSubsonic('getArtists', {
      offset: offset.toString(),
      size: size.toString()
    });
    
    const artists: Artist[] = [];
    if (data.artists?.index) {
      data.artists.index.forEach((idx: any) => {
        if (Array.isArray(idx.artist)) artists.push(...idx.artist);
        else if (idx.artist) artists.push(idx.artist);
      });
    }
    
    // If server didn't slice, we slice locally to be safe
    return artists.length > size ? artists.slice(offset, offset + size) : artists;
  }

  async getRecentSongs(offset = 0, size = 20): Promise<Song[]> {
    // Current Subsonic API is album-oriented. To get paged SONGS, we fetch recent albums,
    // flatten them into a list of tracks, and then slice that list.
    // We fetch a sufficient number of albums (e.g. 50) to build a decent song list.
    const data = await this.fetchSubsonic('getAlbumList2', { 
      type: 'newest', 
      size: '50', // Fetch enough albums to extract songs
      offset: '0' 
    });
    
    const albums = data.albumList2?.album || [];
    const allSongs: Song[] = [];
    
    for (const album of albums) {
      const albumData = await this.fetchSubsonic('getAlbum', { id: album.id });
      if (albumData.album?.song) {
        allSongs.push(...albumData.album.song);
      }
    }
    
    // Return the slice from the aggregate song list
    return allSongs.slice(offset, offset + size);
  }

  async getGenres(offset = 0, size = 20): Promise<Genre[]> {
    // OpenSubsonic supports offset/size for many lists
    const data = await this.fetchSubsonic('getGenres', {
      offset: offset.toString(),
      size: size.toString()
    });
    const genres = (data.genres?.genre || []).map((g: any) => ({
      ...g,
      name: g.name || g.value // Ensure name is populated from value if missing
    }));
    return genres.length > size ? genres.slice(offset, offset + size) : genres;
  }

  async getPlaylists(offset = 0, size = 20): Promise<Playlist[]> {
    const data = await this.fetchSubsonic('getPlaylists', {
      offset: offset.toString(),
      size: size.toString()
    });
    const playlists = data.playlists?.playlist || [];
    return playlists.length > size ? playlists.slice(offset, offset + size) : playlists;
  }

  async getArtist(id: string): Promise<{ artist: Artist; albums: Album[] }> {
    const data = await this.fetchSubsonic('getArtist', { id });
    const artist = data.artist;
    const albums = artist?.album || [];
    
    return {
      artist: {
        id: artist.id,
        name: artist.name,
        albumCount: artist.albumCount,
        artistImageUrl: artist.artistImageUrl
      },
      albums: albums.map((a: any) => ({
        id: a.id,
        name: a.title || a.name, // Subsonic sometimes uses title for albums in getArtist
        artist: a.artist,
        artistId: a.artistId,
        year: a.year,
        genre: a.genre,
        coverArt: a.coverArt,
        songCount: a.songCount
      }))
    };
  }

  async getAlbumSongs(id: string): Promise<Song[]> {
    const data = await this.fetchSubsonic('getAlbum', { id });
    const songs = data.album?.song || [];
    
    return songs.map((s: any) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      artistId: s.artistId,
      album: s.album,
      albumId: s.albumId,
      duration: s.duration,
      coverArt: s.coverArt,
      bitRate: s.bitRate,
      suffix: s.suffix
    }));
  }

  async getAlbums(type: string = 'newest', size: number = 50, offset: number = 0): Promise<Album[]> {
    const data = await this.fetchSubsonic('getAlbumList2', {
      type,
      size: size.toString(),
      offset: offset.toString()
    });
    
    const albums = data.albumList2?.album || [];
    return albums.map((a: any) => ({
      id: a.id,
      name: a.title || a.name,
      artist: a.artist,
      artistId: a.artistId,
      year: a.year,
      genre: a.genre,
      coverArt: a.coverArt,
      songCount: a.songCount
    }));
  }

  getCoverArtUrl(id: string, size: number = 300): string {
    const config = AuthService.getActiveConfig();
    if (!config) return '';
    return `${config.baseUrl}/rest/getCoverArt.view?u=${config.userName}&t=${config.token}&s=${config.salt}&v=1.16.1&c=websonic&id=${id}&size=${size}`;
  }
}
