import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { MusicService } from '../services/music-service';
import type { Artist, Genre, Playlist, Album, Song } from '../services/music-service';
import { PlaybackService } from '../services/playback-service';
import { ICONS } from './icons';
import './websonic-pagination';

type LibraryTab = 'artists' | 'genres' | 'playlists' | 'search';

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
    @state() private artistSearchQuery = '';
    @state() private globalSearchQuery = '';
    @state() private searchResult: { artists: Artist[], albums: Album[], songs: Song[] } = { artists: [], albums: [], songs: [] };
    private allArtistsCache: Artist[] | null = null;

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

    willUpdate(changedProperties: Map<string, any>) {
        if (changedProperties.has('isOpen') && this.isOpen) {
            this.allArtistsCache = null;
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
                if (!this.allArtistsCache) {
                    // !!!! LOADING ALL ARTISTS AT ONCE (UP TO 15000) FOR INSTANT LOCAL SEARCH
                    this.allArtistsCache = await musicService.getArtists(0, 15000);
                }

                let filteredArtists = this.allArtistsCache;
                if (this.artistSearchQuery) {
                    const query = this.artistSearchQuery.toLowerCase();
                    filteredArtists = filteredArtists.filter(a => a.name.toLowerCase().includes(query));
                }

                this.artists = filteredArtists.slice(offset, offset + this.itemsPerPage);
                this.totalPages = Math.ceil(filteredArtists.length / this.itemsPerPage) || 1;
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

    async handleGlobalSearch(query: string) {
        this.globalSearchQuery = query;
        if (!query.trim()) {
            this.searchResult = { artists: [], albums: [], songs: [] };
            return;
        }

        this.loading = true;
        try {
            const musicService = MusicService.getInstance();
            this.searchResult = await musicService.search(query, 15, 15, 15);
        } catch (e) {
            console.error('Failed to perform global search', e);
        } finally {
            this.loading = false;
        }
    }

    setTab(tab: LibraryTab) {
        this.activeTab = tab;
        this.currentPage = 1;
        this.totalPages = 1;
        this.selectedArtistId = null;
        this.artistSearchQuery = '';
        this.globalSearchQuery = '';
        this.searchResult = { artists: [], albums: [], songs: [] };
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
                   ${ICONS.CLOSE_BOLD}
                </button>
            </div>
            <div class="w-full h-px bg-[#4a3b2a] opacity-10 mb-4"></div>
            <div class="flex gap-4 w-full border-b border-[#4a3b2a]/10 pb-1 mb-4 overflow-x-auto custom-scrollbar no-scrollbar">
                ${(['artists', 'genres', 'playlists', 'search'] as LibraryTab[]).map(tab => html`
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
                ${this.activeTab !== 'search' ? html`
                    <websonic-pagination .currentPage=${this.currentPage} .totalPages=${this.totalPages} @page-change=${this.handlePageChange}></websonic-pagination>
                ` : ''}
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
                   <div class="absolute right-3 top-1/2 -translate-y-1/2">${ICONS.SEARCH}</div>
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
                            <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all text-[#a17c2f]">${ICONS.PLUS}</div>
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
                      ${ICONS.BACK}
                      <span class="text-[10px] uppercase font-black tracking-widest">Back</span>
                  </button>
                  <button @click=${this.handleClose} class="text-[#4a3b2a] opacity-40 hover:opacity-100 transition-opacity p-2 -mr-3 cursor-pointer z-50">
                     ${ICONS.CLOSE_BOLD}
                  </button>
              </div>
              ${this.loading ? html`
                  <div class="flex flex-col items-center justify-center py-24 opacity-30 gap-3 text-[#4a3b2a]">
                      <div class="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <div class="font-serif italic text-sm">Loading artist bio...</div>
                  </div>
              ` : html`
                  <div class="w-full bg-[#4a3b2a]/5 rounded-sm p-6 mb-8 border border-[#4a3b2a]/10 flex flex-col items-center text-center">
                      <div class="w-40 h-40 bg-[#4a3b2a]/10 rounded-full flex items-center justify-center mb-4 shadow-xl text-[#4a3b2a]/20 overflow-hidden relative group-hover:shadow-[0_0_30px_rgba(161,124,47,0.4)] transition-all border-4 border-[#e8d5b1]">
                          ${this.selectedArtist?.coverArt ? html`
                              <img src="${musicService.getCoverArtUrl(this.selectedArtist.coverArt, 300)}" class="w-full h-full object-cover">
                          ` : html`
                              <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#4a3b2a]/5 to-[#4a3b2a]/20">
                                  <div class="scale-[2.5]">${ICONS.ARTIST}</div>
                              </div>
                          `}
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
                                          <div class="placeholder ${album.coverArt ? 'hidden' : ''} w-full h-full flex items-center justify-center opacity-30">${ICONS.ALBUM_PLACEHOLDER}</div>
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
                                              ${ICONS.ADD_ALBUM_TO_PLAYLIST}
                                          </button>
                                          <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueueAlbum(album.id); }} class="p-1.5 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(album.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-30'} hover:opacity-100 transition-all group/add" title="Add entire album to queue">
                                              ${this.pendingIds.has(album.id) ? ICONS.CHECK : ICONS.ADD_ALBUM_TO_QUEUE}
                                          </button>
                                          <div class="pr-2 opacity-20 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#a17c2f]' : ''}">${ICONS.CHEVRON_DOWN}</div>
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
                                                          ${ICONS.ADD_SONG_TO_PLAYLIST}
                                                      </button>
                                                      <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueueSong(song); }} class="p-1 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(song.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-0 group-hover/song:opacity-50 hover:!opacity-100'} transition-all" title="Add to queue">${this.pendingIds.has(song.id) ? ICONS.CHECK : ICONS.ADD_SONG_TO_QUEUE}</button>
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
        const musicService = MusicService.getInstance();
        if (this.activeTab === 'artists') {
            return html`
              <div class="mb-4 px-1">
                 <div class="relative">
                    <input type="text"
                           .value=${this.artistSearchQuery}
                           @input=${(e: Event) => {
                    this.artistSearchQuery = (e.target as HTMLInputElement).value;
                    this.currentPage = 1;
                    this.fetchData();
                }}
                           placeholder="Search artists..."
                           class="w-full bg-[#4a3b2a]/5 border border-[#4a3b2a]/10 rounded px-3 py-2 pr-8 text-xs sm:text-sm text-[#4a3b2a] focus:outline-none focus:border-[#4a3b2a]/30 focus:bg-[#4a3b2a]/10 placeholder:opacity-50 font-medium transition-colors" />
                    ${this.artistSearchQuery ? html`
                        <button @click=${() => {
                        this.artistSearchQuery = '';
                        this.currentPage = 1;
                        this.fetchData();
                    }} class="absolute right-2 top-1/2 -translate-y-1/2 text-[#4a3b2a] opacity-40 hover:opacity-100 p-1 flex items-center justify-center cursor-pointer transition-opacity">
                            <div class="scale-75 origin-center">${ICONS.CLOSE_BOLD}</div>
                        </button>
                    ` : ''}
                 </div>
              </div>
              <div class="flex flex-col gap-1">
                  ${this.artists.map(a => html`
                      <div @click=${() => this.handleArtistClick(a.id)} class="flex items-center gap-3 p-2 border-b border-[#4a3b2a]/5 hover:bg-[#4a3b2a]/5 transition-colors cursor-pointer group">
                          <div class="w-10 h-10 bg-[#4a3b2a]/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:shadow-md transition-all">
                              ${a.coverArt ? html`
                                  <img src="${musicService.getCoverArtUrl(a.coverArt, 150)}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                              ` : html`
                                  <div class="opacity-40 group-hover:opacity-100 transition-opacity">${ICONS.ARTIST}</div>
                              `}
                          </div>
                          <div class="flex flex-col min-w-0">
                              <span class="text-sm font-bold text-[#4a3b2a] truncate">${a.name}</span>
                              <span class="text-[10px] text-[#4a3b2a]/50 italic">${a.albumCount || 0} Albums</span>
                          </div>
                      </div>
                  `)}
                  ${this.artists.length === 0 && !this.loading ? html`
                      <div class="text-[10px] text-[#4a3b2a]/40 italic py-8 text-center px-4">
                          No artists matching "${this.artistSearchQuery}"
                      </div>
                  ` : ''}
              </div>
            `;
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
                  <div class="transition-transform group-hover:rotate-90">${ICONS.PLUS}</div>
              </button>
          </div>
          ${this.playlists.map(p => {
                const isExpanded = this.expandedPlaylistIds.has(p.id);
                const songs = this.playlistSongs[p.id] || [];
                return html`
              <div class="flex flex-col bg-white/5 border border-transparent hover:border-[#4a3b2a]/20 transition-all rounded-sm mb-1">
                  <div @click=${() => this.togglePlaylist(p)} class="flex items-center gap-3 p-2 cursor-pointer group">
                      <div class="w-10 h-10 bg-[#4a3b2a]/10 rounded flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity">${ICONS.PLAYLIST}</div>
                      <div class="flex flex-col flex-1"><span class="text-sm font-bold text-[#4a3b2a]">${p.name}</span><span class="text-[10px] text-[#4a3b2a]/50 italic uppercase font-black tracking-tighter">${p.songCount || 0} Tracks</span></div>
                      <div class="flex items-center gap-1">
                          <button @click=${(e: Event) => { e.stopPropagation(); this.handleRenamePlaylist(p); }} class="p-1.5 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all" title="Rename Playlist">${ICONS.EDIT}</button>
                          <button @click=${(e: Event) => { e.stopPropagation(); this.handleDeletePlaylist(p.id); }} class="p-1.5 rounded-full hover:bg-red-500/10 text-red-900/40 hover:text-red-900 opacity-0 group-hover:opacity-100 transition-all" title="Delete Playlist">${ICONS.DELETE}</button>
                          <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueuePlaylist(p.id); }} class="p-1.5 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(p.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-30'} hover:opacity-100 transition-all group/add" title="Add entire playlist to queue">${this.pendingIds.has(p.id) ? ICONS.CHECK : ICONS.ADD_ALBUM_TO_QUEUE}</button>
                          <div class="pr-2 opacity-20 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#a17c2f]' : ''}">${ICONS.CHEVRON_DOWN}</div>
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
                                      <button @click=${(e: Event) => { e.stopPropagation(); this.handleRemoveFromPlaylist(p.id, index); }} class="p-1 rounded-full hover:bg-red-500/10 text-red-900/40 hover:text-red-900 opacity-0 group-hover/song:opacity-100 transition-all" title="Remove from playlist">${ICONS.REMOVE}</button>
                                      <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueueSong(song); }} class="p-1 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(song.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-0 group-hover/song:opacity-50 hover:!opacity-100'} transition-all" title="Add to queue">${this.pendingIds.has(song.id) ? ICONS.CHECK : ICONS.ADD_SONG_TO_QUEUE}</button>
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
        if (this.activeTab === 'search') {
            const hasResults = this.searchResult.artists.length > 0 || this.searchResult.albums.length > 0 || this.searchResult.songs.length > 0;

            return html`
                <div class="mb-4 px-1">
                    <div class="relative">
                        <input type="text"
                               .value=${this.globalSearchQuery}
                               @input=${(e: Event) => { this.globalSearchQuery = (e.target as HTMLInputElement).value; if (!this.globalSearchQuery.trim()) this.searchResult = { artists: [], albums: [], songs: [] }; }}
                               @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this.handleGlobalSearch(this.globalSearchQuery); }}
                               placeholder="Search across all music (Enter to search)..."
                               class="w-full bg-[#4a3b2a]/5 border border-[#4a3b2a]/10 rounded px-3 py-2 pr-8 text-xs sm:text-sm text-[#4a3b2a] focus:outline-none focus:border-[#4a3b2a]/30 focus:bg-[#4a3b2a]/10 placeholder:opacity-50 font-medium transition-colors" />
                        ${this.globalSearchQuery ? html`
                            <button @click=${() => { this.globalSearchQuery = ''; this.handleGlobalSearch(''); }} class="absolute right-2 top-1/2 -translate-y-1/2 text-[#4a3b2a] opacity-40 hover:opacity-100 p-1 flex items-center justify-center cursor-pointer transition-opacity">
                                <div class="scale-75 origin-center">${ICONS.CLOSE_BOLD}</div>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="flex flex-col gap-6 pb-8">
                    ${this.searchResult.artists.length > 0 ? html`
                        <div class="flex flex-col gap-2">
                            <h4 class="text-[9px] font-black uppercase tracking-[0.3em] text-[#4a3b2a]/40 border-b border-[#4a3b2a]/10 pb-1 mx-1">Artists</h4>
                            ${this.searchResult.artists.map(a => html`
                                <div @click=${() => this.handleArtistClick(a.id)} class="flex items-center gap-3 p-2 hover:bg-[#4a3b2a]/5 rounded-sm transition-colors cursor-pointer group">
                                    <div class="w-8 h-8 bg-[#4a3b2a]/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:shadow-sm transition-all text-[#4a3b2a]/20">
                                        ${a.coverArt ? html`
                                            <img src="${musicService.getCoverArtUrl(a.coverArt, 100)}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                                        ` : ICONS.ARTIST}
                                    </div>
                                    <span class="text-sm font-bold text-[#4a3b2a] truncate">${a.name}</span>
                                </div>
                            `)}
                        </div>
                    ` : ''}

                    ${this.searchResult.albums.length > 0 ? html`
                        <div class="flex flex-col gap-2">
                            <h4 class="text-[9px] font-black uppercase tracking-[0.3em] text-[#4a3b2a]/40 border-b border-[#4a3b2a]/10 pb-1 mx-1">Albums</h4>
                            ${this.searchResult.albums.map(album => html`
                                <div @click=${() => this.handleArtistClick(album.artistId)} class="flex items-center gap-3 p-2 hover:bg-[#4a3b2a]/5 rounded-sm transition-colors cursor-pointer group">
                                    <div class="w-10 h-10 bg-[#4a3b2a]/10 rounded flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center group-hover:bg-[#4a3b2a]/20">
                                          ${album.coverArt ? html`
                                              <img src="${musicService.getCoverArtUrl(album.coverArt, 200)}" class="w-full h-full object-cover">
                                          ` : html`<div class="opacity-20">${ICONS.ALBUM_PLACEHOLDER}</div>`}
                                    </div>
                                    <div class="flex flex-col min-w-0">
                                        <span class="text-sm font-bold text-[#4a3b2a] truncate">${album.name}</span>
                                        <span class="text-[10px] text-[#4a3b2a]/60 uppercase font-black tracking-tighter truncate">${album.artist}</span>
                                    </div>
                                </div>
                            `)}
                        </div>
                    ` : ''}

                    ${this.searchResult.songs.length > 0 ? html`
                        <div class="flex flex-col gap-1">
                            <h4 class="text-[9px] font-black uppercase tracking-[0.3em] text-[#4a3b2a]/40 border-b border-[#4a3b2a]/10 pb-1 mx-1 mb-2">Tracks</h4>
                            ${this.searchResult.songs.map(song => html`
                                <div class="flex items-center gap-3 py-1.5 px-2 hover:bg-[#4a3b2a]/10 rounded-sm transition-colors group/song overflow-hidden">
                                    <div class="flex flex-col flex-1 min-w-0">
                                        <span class="text-[13px] font-bold text-[#4a3b2a] truncate group-hover/song:text-black leading-tight">${song.title}</span>
                                        <div class="flex items-center gap-1.5 mt-0.5 opacity-80">
                                            <span class="text-[10px] font-black text-[#a17c2f] uppercase tracking-widest truncate">${this.cleanMetadata(song.artist)}</span>
                                            <span class="text-[10px] text-[#4a3b2a]/20">/</span>
                                            <span class="text-[10px] text-[#4a3b2a]/60 italic truncate">${this.cleanMetadata(song.album)}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-[9px] font-bold text-[#4a3b2a]/60">${this.formatDuration(song.duration)}</span>
                                        <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueueSong(song); }} class="p-1 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(song.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-0 group-hover/song:opacity-50 hover:!opacity-100'} transition-all" title="Add to queue">
                                            ${this.pendingIds.has(song.id) ? ICONS.CHECK : ICONS.ADD_SONG_TO_QUEUE}
                                        </button>
                                    </div>
                                </div>
                            `)}
                        </div>
                    ` : ''}

                    ${this.globalSearchQuery && !hasResults && !this.loading ? html`
                        <div class="text-[10px] text-[#4a3b2a]/40 italic py-12 text-center px-4 font-serif">
                            Silence in the archives. No matches for "${this.globalSearchQuery}" found.
                        </div>
                    ` : ''}
                </div>
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
