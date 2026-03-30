import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { MusicService } from '../services/music-service';
import type { Artist, Genre, Playlist, Album, Song } from '../services/music-service';
import { PlaybackService } from '../services/playback-service';
import './websonic-pagination';

type LibraryTab = 'artists' | 'genres' | 'playlists';

// @TODO: Split into smaller components
@customElement('library-panel')
export class LibraryPanel extends BaseElement {
    @property({ type: Boolean }) isOpen = false;
    @state() activeTab: LibraryTab = 'artists';
    @state() artists: Artist[] = [];
    @state() genres: Genre[] = [];
    @state() playlists: Playlist[] = [];
    @state() loading = false;
    @state() currentPage = 1;
    @state() totalPages = 1;

    // Artist Detail State
    @state() selectedArtistId: string | null = null;
    @state() selectedArtist: Artist | null = null;
    @state() artistAlbums: Album[] = [];
    @state() expandedAlbumIds: Set<string> = new Set();
    @state() expandedPlaylistIds: Set<string> = new Set();
    @state() albumSongs: { [id: string]: Song[] } = {};
    @state() playlistSongs: { [id: string]: Song[] } = {};
    @state() private showPlaylistPicker = false;
    @state() private pendingSongIdsToPlaylist: string[] = [];
    @state() private pendingIds: Set<string> = new Set();
    @state() private loadingPlaylists = false;
    @state() private playlistSearchQuery = '';

    private readonly itemsPerPage = 20;

    static styles = [
        ...BaseElement.styles,
        css`
    :host {
      display: block;
      height: 100%;
      pointer-events: none;
    }

    .song-list {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .song-list.expanded {
        max-height: 1000px;
    }
    
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .animate-in { animation-fill-mode: forwards; }
    .fade-in { animation-name: fade-in; }
    .zoom-in { animation-name: zoom-in; }
    .duration-200 { animation-duration: 200ms; }
  `];

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('keydown', this.handleGlobalKeydown);
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this.handleGlobalKeydown);
        super.disconnectedCallback();
    }

    private handleGlobalKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (this.showPlaylistPicker) {
                this.showPlaylistPicker = false;
            } else if (this.selectedArtistId) {
                this.goBackToList();
            } else if (this.isOpen) {
                this.handleClose();
            }
        }
    };

    private handleClose() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    updated(changedProperties: Map<string, any>) {
        if (changedProperties.has('isOpen') && this.isOpen) {
            this.fetchData();
        }
    }

    async fetchData() {
        this.loading = true;
        const offset = (this.currentPage - 1) * this.itemsPerPage;
        const requestSize = this.itemsPerPage + 1;

        try {
            const musicService = MusicService.getInstance();
            let fetchedItems: any[] = [];

            if (this.activeTab === 'artists') {
                const allArtists = await musicService.getArtists(0, 5000);
                this.artists = allArtists.slice(offset, offset + this.itemsPerPage);
                this.totalPages = Math.ceil(allArtists.length / this.itemsPerPage);
            } else if (this.activeTab === 'genres') {
                fetchedItems = await musicService.getGenres(offset, requestSize);
                if (fetchedItems.length > this.itemsPerPage) {
                    this.genres = fetchedItems.slice(0, this.itemsPerPage);
                    this.totalPages = this.currentPage + 1;
                } else {
                    this.genres = fetchedItems;
                    this.totalPages = this.currentPage;
                }
            } else if (this.activeTab === 'playlists') {
                fetchedItems = await musicService.getPlaylists(offset, requestSize);
                if (fetchedItems.length > this.itemsPerPage) {
                    this.playlists = fetchedItems.slice(0, this.itemsPerPage);
                    this.totalPages = this.currentPage + 1;
                } else {
                    this.playlists = fetchedItems;
                    this.totalPages = this.currentPage;
                }
            }
        } catch (e) {
            console.error('Failed to fetch library data', e);
        } finally {
            this.loading = false;
        }
    }

    async handleArtistClick(id: string) {
        this.selectedArtistId = id;
        this.loading = true;
        try {
            const musicService = MusicService.getInstance();
            const { artist, albums } = await musicService.getArtist(id);
            this.selectedArtist = artist;
            this.artistAlbums = albums;
        } catch (e) {
            console.error('Failed to fetch artist details', e);
        } finally {
            this.loading = false;
        }
    }

    async toggleAlbum(id: string) {
        if (this.expandedAlbumIds.has(id)) {
            this.expandedAlbumIds.delete(id);
            this.expandedAlbumIds = new Set(this.expandedAlbumIds);
            return;
        }
        this.expandedAlbumIds.add(id);
        this.expandedAlbumIds = new Set(this.expandedAlbumIds);
        if (!this.albumSongs[id]) {
            try {
                const musicService = MusicService.getInstance();
                const songs = await musicService.getAlbumSongs(id);
                this.albumSongs = { ...this.albumSongs, [id]: songs };
            } catch (e) {
                console.error('Failed to fetch album songs', e);
            }
        }
    }

    async togglePlaylist(playlist: Playlist) {
        const id = playlist.id;
        if (this.expandedPlaylistIds.has(id)) {
            this.expandedPlaylistIds.delete(id);
            this.expandedPlaylistIds = new Set(this.expandedPlaylistIds);
            return;
        }
        if ((playlist.songCount || 0) === 0) return;
        this.expandedPlaylistIds.add(id);
        this.expandedPlaylistIds = new Set(this.expandedPlaylistIds);
        if (!this.playlistSongs[id]) {
            try {
                const musicService = MusicService.getInstance();
                const songs = await musicService.getPlaylistSongs(id);
                this.playlistSongs = { ...this.playlistSongs, [id]: songs };
            } catch (e) {
                console.error('Failed to fetch playlist songs', e);
            }
        }
    }

    private goBackToList() {
        this.selectedArtistId = null;
        this.selectedArtist = null;
        this.artistAlbums = [];
        this.expandedAlbumIds = new Set();
    }

    setTab(tab: LibraryTab) {
        this.activeTab = tab;
        this.currentPage = 1;
        this.totalPages = 1;
        this.selectedArtistId = null;
        this.expandedAlbumIds = new Set();
        this.expandedPlaylistIds = new Set();
        this.fetchData();
    }

    private handlePageChange(e: CustomEvent<{ page: number }>) {
        this.currentPage = e.detail.page;
        this.fetchData();
    }

    private async handleCreatePlaylist() {
        const name = prompt('Enter name for the new playlist:');
        if (!name) return;
        try {
            const musicService = MusicService.getInstance();
            await musicService.createPlaylist(name);
            this.fetchData();
        } catch (e) {
            console.error('Failed to create playlist', e);
            alert('Failed to create playlist');
        }
    }

    private async handleRenamePlaylist(playlist: Playlist) {
        const newName = prompt('Enter new name for the playlist:', playlist.name);
        if (!newName || newName === playlist.name) return;
        try {
            const musicService = MusicService.getInstance();
            await musicService.updatePlaylist(playlist.id, { name: newName });
            this.fetchData();
        } catch (e) {
            console.error('Failed to rename playlist', e);
            alert('Failed to rename playlist');
        }
    }

    private async handleDeletePlaylist(id: string) {
        if (!confirm('Are you sure you want to delete this playlist forever?')) return;
        try {
            const musicService = MusicService.getInstance();
            await musicService.deletePlaylist(id);
            this.fetchData();
        } catch (e) {
            console.error('Failed to delete playlist', e);
            alert('Failed to delete playlist');
        }
    }

    private async handleAddToPlaylistPrompt(songId: string) {
        this.pendingSongIdsToPlaylist = [songId];
        this.playlistSearchQuery = '';
        this.showPlaylistPicker = true;
        this.loadingPlaylists = true;
        try {
            const musicService = MusicService.getInstance();
            this.playlists = await musicService.getPlaylists(0, 100);
        } catch (e) {
            console.error('Failed to pre-fetch playlists', e);
        } finally {
            this.loadingPlaylists = false;
        }
    }

    private async handleAlbumToPlaylistPrompt(albumId: string) {
        this.playlistSearchQuery = '';
        this.showPlaylistPicker = true;
        this.loadingPlaylists = true;
        try {
            const musicService = MusicService.getInstance();
            const fetchPlaylists = musicService.getPlaylists(0, 100);
            const songs = await musicService.getAlbumSongs(albumId);
            this.pendingSongIdsToPlaylist = songs.map(s => s.id);
            this.playlists = await fetchPlaylists;
        } catch (e) {
            console.error('Failed to prepare album bulk add', e);
            alert('Failed to load songs for this album');
            this.showPlaylistPicker = false;
        } finally {
            this.loadingPlaylists = false;
        }
    }

    private async handleAddToPlaylist(playlistId: string) {
        if (this.pendingSongIdsToPlaylist.length === 0) return;
        try {
            const musicService = MusicService.getInstance();
            await musicService.updatePlaylist(playlistId, { addSongIds: this.pendingSongIdsToPlaylist });
            this.showPlaylistPicker = false;
            this.pendingSongIdsToPlaylist = [];
            delete this.playlistSongs[playlistId];
            this.fetchData();
            this.requestUpdate();
        } catch (e) {
            console.error('Failed to add to playlist', e);
            alert('Failed to add song(s) to playlist');
        }
    }

    private async handleRemoveFromPlaylist(playlistId: string, index: number) {
        if (!confirm('Remove track from this playlist?')) return;
        try {
            const musicService = MusicService.getInstance();
            await musicService.updatePlaylist(playlistId, { removeIndices: [index] });
            this.fetchData();
            const songs = await musicService.getPlaylistSongs(playlistId);
            this.playlistSongs = { ...this.playlistSongs, [playlistId]: songs };
        } catch (e) {
            console.error('Failed to remove from playlist', e);
            alert('Failed to remove track');
        }
    }

    private formatDuration(seconds?: number) {
        if (!seconds) return '--:--';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    private cleanMetadata(str?: string): string {
      if (!str) return 'Unknown';
      // If it's a path, take the last part
      if (str.includes('/') || str.includes('\\')) {
          return str.split(/[/\\]/).pop() || str;
      }
      return str;
  }

  private handleQueueSong(song: Song) {
        this.triggerFeedback(song.id);
        PlaybackService.addToQueue([song]);
    }

    private async handleQueueAlbum(albumId: string) {
        this.triggerFeedback(albumId);
        PlaybackService.addAlbumToQueue(albumId);
    }

    private async handleQueuePlaylist(playlistId: string) {
        this.triggerFeedback(playlistId);
        PlaybackService.addPlaylistToQueue(playlistId);
    }

    private triggerFeedback(id: string) {
        this.pendingIds.add(id);
        this.requestUpdate();
        setTimeout(() => {
            this.pendingIds.delete(id);
            this.requestUpdate();
        }, 1500);
    }

    render() {
        const musicService = MusicService.getInstance();
        let content;

        if (this.selectedArtistId) {
            content = this.renderArtistDetail(musicService);
        } else {
            content = html`
      <div class="fixed top-0 left-0 h-full bg-[#e8d5b1] border-r border-[#d3c29d] shadow-[10px_0_30px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-in-out pointer-events-auto overflow-hidden z-[60]"
           style="width: inherit; transform: translateX(${this.isOpen ? '0' : '-100%'})">
        
        <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/cardboard-flat.png');"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

        <div class="relative p-6 h-full flex flex-col items-center">
            <div class="w-full flex items-center justify-between mb-2">
                <h2 class="text-xl font-black text-[#4a3b2a] opacity-70 uppercase tracking-[0.3em] truncate">Music Library</h2>
                <button @click=${this.handleClose} class="text-[#4a3b2a] opacity-40 hover:opacity-100 transition-opacity p-2 -mr-3 cursor-pointer z-50">
                   <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="w-full h-px bg-[#4a3b2a] opacity-10 mb-4"></div>
            <div class="flex gap-4 w-full border-b border-[#4a3b2a]/10 pb-1 mb-4 overflow-x-auto custom-scrollbar">
                ${(['artists', 'genres', 'playlists'] as LibraryTab[]).map(tab => html`
                    <div @click=${() => this.setTab(tab)} class="cursor-pointer py-1 px-2 text-[10px] font-black uppercase tracking-widest transition-all ${this.activeTab === tab ? 'text-[#4a3b2a] border-b-2 border-[#4a3b2a]' : 'text-[#4a3b2a]/40 hover:text-[#4a3b2a]/70'}">${tab}</div>
                `)}
            </div>
            <div class="flex-1 w-full overflow-y-auto custom-scrollbar px-1">
                ${this.loading ? html`
                    <div class="flex flex-col items-center justify-center h-24 mt-12 opacity-30 gap-3 text-[#4a3b2a]">
                        <div class="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <div class="font-serif italic text-sm">Reviewing archives...</div>
                    </div>
                ` : html`<div class="flex flex-col gap-1">${this.renderList()}</div>`}
            </div>
            <div class="w-full pt-4 mt-2 border-t border-[#4a3b2a]/10">
                <websonic-pagination .currentPage=${this.currentPage} .totalPages=${this.totalPages} @page-change=${this.handlePageChange}></websonic-pagination>
            </div>
        </div>
      </div>`;
        }

        const filteredPlaylists = this.playlists.filter(p =>
            p.name.toLowerCase().includes(this.playlistSearchQuery.toLowerCase())
        );

        return html`
      ${content}
      ${this.showPlaylistPicker ? html`
        <div class="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[999] flex items-center justify-center p-4 pointer-events-auto">
            <div class="bg-[#e8d5b1] border border-[#d3c29d] shadow-2xl rounded-sm w-full max-w-xs p-5 relative overflow-hidden animate-in fade-in zoom-in duration-200">
                <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/cardboard-flat.png');"></div>
                
                <h3 class="text-xs font-black uppercase tracking-[0.2em] text-[#4a3b2a] opacity-60 mb-3">Add to Playlist</h3>
                
                <div class="relative mb-3">
                   <input type="text" 
                          placeholder="SEARCH PLAYLISTS..." 
                          .value="${this.playlistSearchQuery}"
                          @input=${(e: any) => this.playlistSearchQuery = e.target.value}
                          class="w-full bg-[#4a3b2a]/5 border border-[#4a3b2a]/10 rounded-sm px-3 py-2 text-[10px] font-black tracking-widest uppercase placeholder:text-[#4a3b2a]/30 text-[#4a3b2a] focus:outline-none focus:border-[#4a3b2a]/30 transition-colors">
                   <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#4a3b2a]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>

                <div class="flex flex-col gap-1 max-h-[300px] overflow-y-auto mb-4 custom-scrollbar pr-1 min-h-[100px]">
                    ${this.loadingPlaylists ? html`
                        <div class="flex flex-col items-center justify-center py-12 gap-3 opacity-30 text-[#4a3b2a]">
                            <div class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <div class="text-[9px] font-black uppercase tracking-widest">Scanning Archives...</div>
                        </div>
                    ` : filteredPlaylists.length === 0 ? html`
                        <div class="text-[10px] text-[#4a3b2a]/40 italic py-8 text-center px-4">
                            ${this.playlistSearchQuery ? `No playlists matching "${this.playlistSearchQuery}"` : "You haven't created any playlists yet."}
                            ${!this.playlistSearchQuery ? html`<div class="mt-2 block not-italic font-black text-[9px] text-[#a17c2f] cursor-pointer" @click=${() => { this.showPlaylistPicker = false; this.setTab('playlists'); }}>+ New Playlist</div>` : ''}
                        </div>
                    ` : filteredPlaylists.map(p => html`
                        <div @click=${() => this.handleAddToPlaylist(p.id)} class="py-1.5 px-3 bg-white/40 border border-[#4a3b2a]/5 hover:bg-[#a17c2f]/10 hover:border-[#a17c2f]/30 transition-all cursor-pointer rounded-sm group relative overflow-hidden flex items-center justify-between">
                            <div class="flex flex-col flex-1 min-w-0">
                                <span class="text-xs font-bold text-[#4a3b2a] truncate pr-4 group-hover:text-black">${p.name}</span>
                                <span class="text-[7px] font-black text-[#4a3b2a] opacity-30 uppercase tracking-tighter">${p.songCount || 0} tracks</span>
                            </div>
                            <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all text-[#a17c2f]"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg></div>
                        </div>
                    `)}
                </div>
                <button @click=${() => this.showPlaylistPicker = false} class="w-full py-2 text-[10px] uppercase font-black tracking-widest text-[#4a3b2a]/50 hover:text-[#4a3b2a] transition-colors">Cancel</button>
            </div>
        </div>` : ''}
    `;
    }

    private renderArtistDetail(musicService: MusicService) {
        return html`
        <div class="fixed top-0 left-0 h-full bg-[#e8d5b1] border-r border-[#d3c29d] shadow-[10px_0_30px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-in-out pointer-events-auto overflow-hidden z-[60]"
             style="width: inherit; transform: translateX(${this.isOpen ? '0' : '-100%'})">
          <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/cardboard-flat.png');"></div>
          <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
          <div class="relative p-6 h-full flex flex-col items-center overflow-y-auto custom-scrollbar">
              <div class="w-full flex justify-between items-center mb-6">
                  <button @click=${this.goBackToList} class="flex items-center gap-2 text-[#4a3b2a] opacity-70 hover:opacity-100 transition-opacity">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                      <span class="text-[10px] uppercase font-black tracking-widest">Back</span>
                  </button>
                  <button @click=${this.handleClose} class="text-[#4a3b2a] opacity-40 hover:opacity-100 transition-opacity p-2 -mr-3 cursor-pointer z-50">
                     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
              </div>
              ${this.loading ? html`
                  <div class="flex flex-col items-center justify-center py-24 opacity-30 gap-3 text-[#4a3b2a]">
                      <div class="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <div class="font-serif italic text-sm">Loading artist bio...</div>
                  </div>
              ` : html`
                  <div class="w-full bg-[#4a3b2a]/5 rounded-sm p-4 mb-8 border border-[#4a3b2a]/10 flex flex-col items-center text-center">
                      <div class="w-24 h-24 bg-[#4a3b2a]/10 rounded-full flex items-center justify-center mb-3 shadow-inner">
                         <svg class="w-12 h-12 text-[#4a3b2a]/20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                      </div>
                      <h3 class="text-xl font-black text-[#4a3b2a] uppercase tracking-wide leading-tight">${this.selectedArtist?.name}</h3>
                      <p class="text-[10px] text-[#4a3b2a]/50 italic font-medium uppercase tracking-tighter mt-1">${this.selectedArtist?.albumCount || 0} Albums in playlist</p>
                  </div>
                  <div class="w-full">
                      <h4 class="text-[10px] font-black text-[#4a3b2a] opacity-60 uppercase tracking-[0.3em] mb-4 border-b border-[#4a3b2a]/20 pb-1">Albums</h4>
                      <div class="flex flex-col gap-2">
                          ${this.artistAlbums.map(album => {
            const isExpanded = this.expandedAlbumIds.has(album.id);
            const songs = this.albumSongs[album.id] || [];
            return html`
                                <div class="flex flex-col bg-white/5 border border-transparent hover:border-[#4a3b2a]/20 transition-all rounded-sm">
                                  <div @click=${() => this.toggleAlbum(album.id)} class="flex items-center gap-3 p-2 cursor-pointer group">
                                      <div class="w-24 h-24 bg-[#4a3b2a]/10 rounded flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center relative group-hover:bg-[#4a3b2a]/20 transition-colors">
                                          ${album.coverArt ? html`
                                              <img src="${musicService.getCoverArtUrl(album.coverArt, 200)}" @error=${(e: Event) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent) parent.querySelector('.placeholder')?.classList.remove('hidden');
                    }} class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                                          ` : ''}
                                          <div class="placeholder ${album.coverArt ? 'hidden' : ''} w-full h-full flex items-center justify-center opacity-30"><svg class="w-6 h-6 text-[#4a3b2a]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg></div>
                                      </div>
                                      <div class="flex flex-col flex-1">
                                          <span class="text-sm font-bold text-[#4a3b2a]">${album.name}</span>
                                          <div class="flex items-center gap-2">
                                              <span class="text-[9px] text-[#4a3b2a]/60 font-black uppercase tracking-tighter">${album.year || 'Unknown Year'}</span>
                                              ${album.genre ? html`<span class="text-[9px] text-[#4a3b2a]/30">•</span><span class="text-[9px] text-[#4a3b2a]/60 font-black uppercase tracking-tighter">${album.genre}</span>` : ''}
                                              <span class="text-[9px] text-[#4a3b2a]/30">•</span><span class="text-[10px] text-[#4a3b2a]/70 italic">${album.songCount || 0} tracks</span>
                                          </div>
                                      </div>
                                      <div class="flex items-center gap-2">
                                          <button @click=${(e: Event) => { e.stopPropagation(); this.handleAlbumToPlaylistPrompt(album.id); }}
                                                  class="p-1.5 rounded-full hover:bg-[#a17c2f]/20 text-[#4a3b2a]/40 hover:text-[#a17c2f] transition-all" title="Add entire album to playlist">
                                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                                                  <path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                                              </svg>
                                          </button>
                                          <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueueAlbum(album.id); }} class="p-1.5 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(album.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-30'} hover:opacity-100 transition-all group/add" title="Add entire album to queue">
                                              ${this.pendingIds.has(album.id) ? html`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>` : html`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`}
                                          </button>
                                          <div class="pr-2 opacity-20 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#a17c2f]' : ''}"><svg class="w-4 h-4 text-[#4a3b2a] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg></div>
                                      </div>
                                  </div>
                                  <div class="song-list ${isExpanded ? 'expanded' : ''} bg-[#4a3b2a]/5">
                                      ${isExpanded && songs.length === 0 ? html`<div class="p-4 flex justify-center"><div class="w-4 h-4 border-2 border-[#4a3b2a]/20 border-t-transparent rounded-full animate-spin"></div></div>` : songs.map((song, index) => html`
                                          <div class="flex items-center gap-3 py-2 px-4 hover:bg-[#4a3b2a]/10 transition-colors group/song border-b border-[#4a3b2a]/10 last:border-0 overflow-hidden">
                                              <span class="text-[9px] font-black text-[#4a3b2a]/40 w-4 group-hover/song:text-[#4a3b2a]/80">${index + 1}</span>
                                              <div class="flex flex-col flex-1 min-w-0">
                                                  <span class="text-xs font-bold text-[#4a3b2a] truncate group-hover/song:text-black">${song.title}</span>
                                                  <div class="flex items-center gap-1.5 opacity-70">
                                                      <span class="text-[8px] font-black uppercase tracking-widest ${song.suffix?.toLowerCase() === 'flac' ? 'text-[#8b5e1a]' : 'text-[#4a3b2a]'}">${song.suffix || 'mp3'}</span>
                                                      <span class="text-[8px] opacity-40 text-[#4a3b2a]">•</span>
                                                      <span class="text-[8px] font-black uppercase tracking-widest text-[#4a3b2a]">${song.bitRate ? `${song.bitRate} kbps` : ''}</span>
                                                  </div>
                                              </div>
                                              <div class="flex items-center gap-3">
                                                  <span class="text-[9px] font-bold text-[#4a3b2a]/60">${this.formatDuration(song.duration)}</span>
                                                  <div class="flex items-center gap-1">
                                                      <button @click=${(e: Event) => { e.stopPropagation(); this.handleAddToPlaylistPrompt(song.id); }} class="p-1 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] opacity-0 group-hover/song:opacity-50 hover:!opacity-100 transition-all" title="Add to playlist">
                                                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path><circle cx="18" cy="18" r="5" fill="#e8d5b1" stroke="currentColor" stroke-width="1.5"></circle><path d="M18 16v4M16 18h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>
                                                      </button>
                                                      <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueueSong(song); }} class="p-1 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(song.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-0 group-hover/song:opacity-50 hover:!opacity-100'} transition-all" title="Add to queue">${this.pendingIds.has(song.id) ? html`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>` : html`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>`}</button>
                                                  </div>
                                              </div>
                                          </div>
                                      `)}
                                  </div>
                                </div>
                              `;
        })}
                      </div>
                  </div>
              `}
          </div>
        </div>
      `;
    }

    private renderList() {
        if (this.activeTab === 'artists') {
            return this.artists.map(a => html`
          <div @click=${() => this.handleArtistClick(a.id)} class="flex items-center gap-3 p-2 border-b border-[#4a3b2a]/5 hover:bg-[#4a3b2a]/5 transition-colors cursor-pointer group">
              <div class="w-10 h-10 bg-[#4a3b2a]/10 rounded-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity"><svg class="w-5 h-5 text-[#4a3b2a]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
              <div class="flex flex-col"><span class="text-sm font-bold text-[#4a3b2a]">${a.name}</span><span class="text-[10px] text-[#4a3b2a]/50 italic">${a.albumCount || 0} Albums</span></div>
          </div>
        `);
        }
        if (this.activeTab === 'genres') {
            return this.genres.map(g => html`
          <div class="flex flex-col p-2 border-b border-[#4a3b2a]/5 hover:bg-[#4a3b2a]/5 transition-colors cursor-pointer group"><span class="text-sm font-bold text-[#4a3b2a]">${g.name}</span><span class="text-[10px] text-[#4a3b2a]/50 italic uppercase font-black tracking-tighter">${g.songCount || 0} Tracks</span></div>
        `);
        }
        if (this.activeTab === 'playlists') {
            return html`
          <div class="flex justify-between items-center mb-4 px-1">
              <span class="text-[10px] font-black text-[#4a3b2a]/40 uppercase tracking-widest">Your Playlists</span>
              <button @click=${this.handleCreatePlaylist} class="p-1.5 rounded-full bg-[#4a3b2a]/5 hover:bg-[#4a3b2a]/10 text-[#4a3b2a]/60 hover:text-[#4a3b2a] transition-all group">
                  <svg class="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
              </button>
          </div>
          ${this.playlists.map(p => {
                const isExpanded = this.expandedPlaylistIds.has(p.id);
                const songs = this.playlistSongs[p.id] || [];
                return html`
              <div class="flex flex-col bg-white/5 border border-transparent hover:border-[#4a3b2a]/20 transition-all rounded-sm mb-1">
                  <div @click=${() => this.togglePlaylist(p)} class="flex items-center gap-3 p-2 cursor-pointer group">
                      <div class="w-10 h-10 bg-[#4a3b2a]/10 rounded flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity"><svg class="w-5 h-5 text-[#4a3b2a]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9H2v2h17V9zm0-4H2v2h17V5zM2 15h13v-2H2v2zm15-2v6l5-3-5-3z"/></svg></div>
                      <div class="flex flex-col flex-1"><span class="text-sm font-bold text-[#4a3b2a]">${p.name}</span><span class="text-[10px] text-[#4a3b2a]/50 italic uppercase font-black tracking-tighter">${p.songCount || 0} Tracks</span></div>
                      <div class="flex items-center gap-1">
                          <button @click=${(e: Event) => { e.stopPropagation(); this.handleRenamePlaylist(p); }} class="p-1.5 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all" title="Rename Playlist"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                          <button @click=${(e: Event) => { e.stopPropagation(); this.handleDeletePlaylist(p.id); }} class="p-1.5 rounded-full hover:bg-red-500/10 text-red-900/40 hover:text-red-900 opacity-0 group-hover:opacity-100 transition-all" title="Delete Playlist"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                          <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueuePlaylist(p.id); }} class="p-1.5 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(p.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-30'} hover:opacity-100 transition-all group/add" title="Add entire playlist to queue">${this.pendingIds.has(p.id) ? html`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>` : html`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`}</button>
                          <div class="pr-2 opacity-20 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#a17c2f]' : ''}"><svg class="w-4 h-4 text-[#4a3b2a] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg></div>
                      </div>
                  </div>
                  <div class="song-list ${isExpanded ? 'expanded' : ''} bg-[#4a3b2a]/5">
                      ${isExpanded && songs.length === 0 ? html`<div class="p-4 flex justify-center"><div class="w-4 h-4 border-2 border-[#4a3b2a]/20 border-t-transparent rounded-full animate-spin"></div></div>` : songs.map((song, index) => html`
                          <div class="flex items-center gap-3 py-2 px-4 hover:bg-[#4a3b2a]/10 transition-colors group/song border-b border-[#4a3b2a]/10 last:border-0 overflow-hidden">
                              <span class="text-[9px] font-black text-[#4a3b2a]/40 w-4 group-hover/song:text-[#4a3b2a]/80">${index + 1}</span>
                                <div class="flex flex-col flex-1 min-w-0 py-0.5">
                                  <span class="text-[13px] font-bold text-[#4a3b2a] truncate group-hover/song:text-black leading-tight">${song.title}</span>
                                  <div class="flex items-center gap-1.5 mt-0.5 opacity-80">
                                      <span class="text-[10px] font-black text-[#a17c2f] uppercase tracking-widest truncate">${this.cleanMetadata(song.artist)}</span>
                                      <span class="text-[10px] text-[#4a3b2a]/20">/</span>
                                      <span class="text-[10px] text-[#4a3b2a]/60 italic truncate">${this.cleanMetadata(song.album)}</span>
                                      <span class="text-[10px] text-[#4a3b2a]/20">/</span>
                                      <span class="text-[9px] font-black uppercase text-[#4a3b2a]/40 tracking-widest">${song.suffix || 'mp3'}</span>
                                  </div>
                              </div>
                              <div class="flex items-center gap-3">
                                  <span class="text-[9px] font-bold text-[#4a3b2a]/60">${this.formatDuration(song.duration)}</span>
                                  <div class="flex items-center gap-1">
                                      <button @click=${(e: Event) => { e.stopPropagation(); this.handleRemoveFromPlaylist(p.id, index); }} class="p-1 rounded-full hover:bg-red-500/10 text-red-900/40 hover:text-red-900 opacity-0 group-hover/song:opacity-100 transition-all" title="Remove from playlist"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                                      <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueueSong(song); }} class="p-1 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(song.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-0 group-hover/song:opacity-50 hover:!opacity-100'} transition-all" title="Add to queue">${this.pendingIds.has(song.id) ? html`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>` : html`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>`}</button>
                                  </div>
                              </div>
                          </div>
                      `)}
                  </div>
              </div>
            `;
            })}
        `;
        }
        return html`<div class="opacity-20 text-center p-12 italic text-sm">Library is currently silent.</div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'library-panel': LibraryPanel;
    }
}
