import { AuthService } from './auth-service';

export interface Artist {
  id: string;
  name: string;
  albumCount?: number;
  coverArt?: string;
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

  private async fetchSubsonic(method: string, params: Record<string, string | string[]> = {}) {
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
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else {
        url.searchParams.set(key, value);
      }
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
        coverArt: artist.coverArt,
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

  async getPlaylistSongs(id: string): Promise<Song[]> {
    const data = await this.fetchSubsonic('getPlaylist', { id });
    const songs = data.playlist?.entry || [];
    
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

  async createPlaylist(name: string, songIds?: string[]): Promise<Playlist> {
    const params: Record<string, string | string[]> = { name };
    if (songIds && songIds.length > 0) {
      params.songId = songIds;
    }
    const data = await this.fetchSubsonic('createPlaylist', params);
    return data.playlist;
  }

  async updatePlaylist(playlistId: string, options: { 
    name?: string, 
    comment?: string, 
    public?: boolean, 
    addSongIds?: string[], 
    removeIndices?: number[] 
  }): Promise<void> {
    const params: Record<string, string | string[]> = { playlistId };
    if (options.name) params.name = options.name;
    if (options.comment) params.comment = options.comment;
    if (options.public !== undefined) params.public = options.public.toString();
    if (options.addSongIds && options.addSongIds.length > 0) {
      params.songIdToAdd = options.addSongIds;
    }
    if (options.removeIndices && options.removeIndices.length > 0) {
      params.songIndexToRemove = options.removeIndices.map(i => i.toString());
    }
    
    await this.fetchSubsonic('updatePlaylist', params);
  }

  async deletePlaylist(id: string): Promise<void> {
    await this.fetchSubsonic('deletePlaylist', { id });
  }

  async search(query: string, artistCount = 10, albumCount = 10, songCount = 10): Promise<{
    artists: Artist[],
    albums: Album[],
    songs: Song[]
  }> {
    const data = await this.fetchSubsonic('search3', {
      query,
      artistCount: artistCount.toString(),
      albumCount: albumCount.toString(),
      songCount: songCount.toString()
    });

    const searchResult = data.searchResult3 || {};
    
    // Ensure nested objects aren't null/undefined before mapping
    const artists = searchResult.artist || [];
    const albums = searchResult.album || [];
    const songs = searchResult.song || [];
    
    return {
      artists: Array.isArray(artists) ? artists : [artists],
      albums: (Array.isArray(albums) ? albums : [albums]).map((a: any) => ({
        id: a.id,
        name: a.title || a.name || 'Unknown Album',
        artist: a.artist || 'Unknown Artist',
        artistId: a.artistId,
        year: a.year,
        genre: a.genre,
        coverArt: a.coverArt,
        songCount: a.songCount
      })),
      songs: (Array.isArray(songs) ? songs : [songs]).map((s: any) => ({
        id: s.id,
        title: s.title || 'Unknown Track',
        artist: s.artist || 'Unknown Artist',
        artistId: s.artistId,
        album: s.album || 'Unknown Album',
        albumId: s.albumId,
        duration: s.duration || 0,
        coverArt: s.coverArt,
        bitRate: s.bitRate,
        suffix: s.suffix
      }))
    };
  }

  getCoverArtUrl(id: string, size: number = 300): string {
    const config = AuthService.getActiveConfig();
    if (!config) return '';
    return `${config.baseUrl}/rest/getCoverArt.view?u=${config.userName}&t=${config.token}&s=${config.salt}&v=1.16.1&c=websonic&id=${id}&size=${size}`;
  }
}
