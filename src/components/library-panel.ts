import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { MusicService } from '../services/music-service';
import type { Artist, Genre, Playlist, Album, Song } from '../services/music-service';
import { PlaybackService } from '../services/playback-service';
import './websonic-pagination';

type LibraryTab = 'artists' | 'genres' | 'playlists';

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
  @state() expandedAlbumId: string | null = null;
  @state() albumSongs: { [id: string]: Song[] } = {};

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
  `];

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
    // Peek ahead by requesting 1 extra item to determine if next page exists
    const requestSize = this.itemsPerPage + 1;
    
    try {
      const musicService = MusicService.getInstance();
      let fetchedItems: any[] = [];
      
      if (this.activeTab === 'artists') {
        const allArtists = await musicService.getArtists(0, 5000); // Gonic returns all anyway
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
      if (this.expandedAlbumId === id) {
          this.expandedAlbumId = null;
          return;
      }

      this.expandedAlbumId = id;
      
      // Fetch if not in cache
      if (!this.albumSongs[id]) {
          try {
              const musicService = MusicService.getInstance();
              const songs = await musicService.getAlbumSongs(id);
              this.albumSongs = { 
                  ...this.albumSongs, 
                  [id]: songs 
              };
          } catch (e) {
              console.error('Failed to fetch album songs', e);
          }
      }
  }

  private goBackToList() {
      this.selectedArtistId = null;
      this.selectedArtist = null;
      this.artistAlbums = [];
      this.expandedAlbumId = null;
  }

  setTab(tab: LibraryTab) {
    this.activeTab = tab;
    this.currentPage = 1;
    this.totalPages = 1; 
    this.selectedArtistId = null; // Reset artist view when tab changes
    this.expandedAlbumId = null;
    this.fetchData();
  }

  private handlePageChange(e: CustomEvent<{ page: number }>) {
    this.currentPage = e.detail.page;
    this.fetchData();
  }

  render() {
    const musicService = MusicService.getInstance();

    if (this.selectedArtistId) {
        return this.renderArtistDetail(musicService);
    }

    return html`
      <div class="fixed top-0 left-0 h-full bg-[#e8d5b1] border-r border-[#d3c29d] shadow-[10px_0_30px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-in-out pointer-events-auto overflow-hidden z-[60]"
           style="width: inherit; transform: translateX(${this.isOpen ? '0' : '-100%'})">
        
        <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/cardboard-flat.png');"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

        <div class="relative p-6 h-full flex flex-col items-center">
            <!-- Header aligned with requirements: Title on Left, Close on Right, Same size as Queue -->
            <div class="w-full flex items-center justify-between mb-2">
                <h2 class="text-xl font-black text-[#4a3b2a] opacity-70 uppercase tracking-[0.3em] truncate">Music Library</h2>
                <button @click=${this.handleClose} 
                        class="text-[#4a3b2a] opacity-40 hover:opacity-100 transition-opacity p-2 -mr-3 cursor-pointer z-50" 
                        title="Close Library">
                   <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div class="w-full h-px bg-[#4a3b2a] opacity-10 mb-4"></div>

            <div class="flex gap-4 w-full border-b border-[#4a3b2a]/10 pb-1 mb-4 overflow-x-auto custom-scrollbar">
                ${(['artists', 'genres', 'playlists'] as LibraryTab[]).map(tab => html`
                    <div @click=${() => this.setTab(tab)} 
                         class="cursor-pointer py-1 px-2 text-[10px] font-black uppercase tracking-widest transition-all
                                ${this.activeTab === tab ? 'text-[#4a3b2a] border-b-2 border-[#4a3b2a]' : 'text-[#4a3b2a]/40 hover:text-[#4a3b2a]/70'}">
                        ${tab}
                    </div>
                `)}
            </div>
            
            <div class="flex-1 w-full overflow-y-auto custom-scrollbar px-1">
                ${this.loading ? html`
                    <div class="flex flex-col items-center justify-center h-24 mt-12 opacity-30 gap-3 text-[#4a3b2a]">
                        <div class="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <div class="font-serif italic text-sm">Reviewing archives...</div>
                    </div>
                ` : html`
                    <div class="flex flex-col gap-1">
                        ${this.renderList()}
                    </div>
                `}
            </div>

            <div class="w-full pt-4 mt-2 border-t border-[#4a3b2a]/10">
                <websonic-pagination
                  .currentPage=${this.currentPage}
                  .totalPages=${this.totalPages}
                  @page-change=${this.handlePageChange}
                ></websonic-pagination>
            </div>
        </div>

        </div>
      </div>
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

                  <button @click=${this.handleClose} 
                          class="text-[#4a3b2a] opacity-40 hover:opacity-100 transition-opacity p-2 -mr-3 cursor-pointer z-50" 
                          title="Close Library">
                     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
              </div>

              ${this.loading ? html`
                  <div class="flex flex-col items-center justify-center py-24 opacity-30 gap-3 text-[#4a3b2a]">
                      <div class="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <div class="font-serif italic text-sm">Loading artist bio...</div>
                  </div>
              ` : html`
                  <!-- Artist Card -->
                  <div class="w-full bg-[#4a3b2a]/5 rounded-sm p-4 mb-8 border border-[#4a3b2a]/10 flex flex-col items-center text-center">
                      <div class="w-24 h-24 bg-[#4a3b2a]/10 rounded-full flex items-center justify-center mb-3 shadow-inner">
                         <svg class="w-12 h-12 text-[#4a3b2a]/20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                      </div>
                      <h3 class="text-xl font-black text-[#4a3b2a] uppercase tracking-wide leading-tight">${this.selectedArtist?.name}</h3>
                      <p class="text-[10px] text-[#4a3b2a]/50 italic font-medium uppercase tracking-tighter mt-1">${this.selectedArtist?.albumCount || 0} Albums in archive</p>
                  </div>

                  <div class="w-full">
                      <h4 class="text-[10px] font-black text-[#4a3b2a] opacity-60 uppercase tracking-[0.3em] mb-4 border-b border-[#4a3b2a]/20 pb-1">Albums</h4>
                      <div class="flex flex-col gap-2">
                          ${this.artistAlbums.map(album => {
                              const isExpanded = this.expandedAlbumId === album.id;
                              const songs = this.albumSongs[album.id] || [];

                              return html`
                                <div class="flex flex-col bg-white/5 border border-transparent hover:border-[#4a3b2a]/20 transition-all rounded-sm">
                                  <div @click=${() => this.toggleAlbum(album.id)}
                                       class="flex items-center gap-3 p-2 cursor-pointer group">
                                      <div class="w-12 h-12 bg-[#4a3b2a]/10 rounded flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center relative group-hover:bg-[#4a3b2a]/20 transition-colors">
                                          ${album.coverArt ? html`
                                              <img src="${musicService.getCoverArtUrl(album.coverArt, 80)}" 
                                                   @error=${(e: Event) => {
                                                       const img = e.target as HTMLImageElement;
                                                       img.style.display = 'none';
                                                       const parent = img.parentElement;
                                                       if (parent) parent.querySelector('.placeholder')?.classList.remove('hidden');
                                                   }}
                                                   class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                                          ` : ''}
                                          <div class="placeholder ${album.coverArt ? 'hidden' : ''} w-full h-full flex items-center justify-center opacity-30">
                                              <svg class="w-6 h-6 text-[#4a3b2a]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>
                                          </div>
                                      </div>
                                      <div class="flex flex-col flex-1">
                                          <span class="text-sm font-bold text-[#4a3b2a]">${album.name}</span>
                                          <div class="flex items-center gap-2">
                                              <span class="text-[9px] text-[#4a3b2a]/60 font-black uppercase tracking-tighter">${album.year || 'Unknown Year'}</span>
                                              ${album.genre ? html`
                                                  <span class="text-[9px] text-[#4a3b2a]/30">•</span>
                                                  <span class="text-[9px] text-[#4a3b2a]/60 font-black uppercase tracking-tighter">${album.genre}</span>
                                              ` : ''}
                                              <span class="text-[9px] text-[#4a3b2a]/30">•</span>
                                              <span class="text-[10px] text-[#4a3b2a]/70 italic">${album.songCount || 0} tracks</span>
                                          </div>
                                      </div>
                                      <div class="flex items-center gap-4">
                                          <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueueAlbum(album.id); }}
                                                  class="p-1.5 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(album.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-30'} hover:opacity-100 transition-all group/add" title="Add all to queue">
                                              ${this.pendingIds.has(album.id) ? html`
                                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                                              ` : html`
                                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                              `}
                                          </button>
                                          <div @click=${() => this.toggleAlbum(album.id)}
                                               class="cursor-pointer pr-2 opacity-20 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#a17c2f]' : ''}">
                                              <svg class="w-4 h-4 text-[#4a3b2a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                          </div>
                                      </div>
                                  </div>

                                  <div class="song-list ${isExpanded ? 'expanded' : ''} bg-[#4a3b2a]/5">
                                      ${isExpanded && songs.length === 0 ? html`
                                          <div class="p-4 flex justify-center">
                                              <div class="w-4 h-4 border-2 border-[#4a3b2a]/20 border-t-transparent rounded-full animate-spin"></div>
                                          </div>
                                      ` : songs.map((song, index) => html`
                                          <div class="flex items-center gap-3 py-2 px-4 hover:bg-[#4a3b2a]/10 transition-colors cursor-pointer group/song border-b border-[#4a3b2a]/10 last:border-0"
                                               @click=${() => this.handlePlaySong(song)}>
                                              <span class="text-[9px] font-black text-[#4a3b2a]/40 w-4 group-hover/song:text-[#4a3b2a]/80">${index + 1}</span>
                                              <div class="flex flex-col flex-1 min-w-0">
                                                  <span class="text-xs font-bold text-[#4a3b2a] truncate group-hover/song:text-black">${song.title}</span>
                                                  <div class="flex items-center gap-1.5 opacity-70">
                                                      <span class="text-[8px] font-black uppercase tracking-widest ${song.suffix?.toLowerCase() === 'flac' ? 'text-[#8b5e1a]' : 'text-[#4a3b2a]'}">
                                                          ${song.suffix || 'mp3'}
                                                      </span>
                                                      <span class="text-[8px] opacity-40 text-[#4a3b2a]">•</span>
                                                      <span class="text-[8px] font-black uppercase tracking-widest text-[#4a3b2a]">
                                                          ${song.bitRate ? `${song.bitRate} kbps` : ''}
                                                      </span>
                                                  </div>
                                              </div>
                                              <div class="flex items-center gap-3">
                                                  <span class="text-[9px] font-bold text-[#4a3b2a]/60">${this.formatDuration(song.duration)}</span>
                                                  <button @click=${(e: Event) => { e.stopPropagation(); this.handleQueueSong(song); }}
                                                          class="p-1 rounded-full hover:bg-[#4a3b2a]/20 text-[#4a3b2a] ${this.pendingIds.has(song.id) ? 'opacity-100 text-[#a17c2f]' : 'opacity-0 group-hover/song:opacity-50 hover:!opacity-100'} transition-all" title="Add to queue">
                                                      ${this.pendingIds.has(song.id) ? html`
                                                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                                                      ` : html`
                                                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                                      `}
                                                  </button>
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
      </div>
      `;
  }

  private formatDuration(seconds?: number) {
      if (!seconds) return '--:--';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  }

  @state() private pendingIds: Set<string> = new Set();

  private handlePlaySong(song: Song) {
      this.triggerFeedback(song.id);
      PlaybackService.playSong(song);
  }

  private handleQueueSong(song: Song) {
      this.triggerFeedback(song.id);
      PlaybackService.addToQueue([song]);
  }

  private async handleQueueAlbum(albumId: string) {
      this.triggerFeedback(albumId);
      PlaybackService.addAlbumToQueue(albumId);
  }

  private triggerFeedback(id: string) {
      this.pendingIds.add(id);
      this.requestUpdate();
      setTimeout(() => {
          this.pendingIds.delete(id);
          this.requestUpdate();
      }, 1500);
  }

  private renderList() {
      if (this.activeTab === 'artists') {
          return this.artists.map(a => html`
            <div @click=${() => this.handleArtistClick(a.id)} 
                 class="flex items-center gap-3 p-2 border-b border-[#4a3b2a]/5 hover:bg-[#4a3b2a]/5 transition-colors cursor-pointer group">
                <div class="w-10 h-10 bg-[#4a3b2a]/10 rounded-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                    <svg class="w-5 h-5 text-[#4a3b2a]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-[#4a3b2a]">${a.name}</span>
                    <span class="text-[10px] text-[#4a3b2a]/50 italic">${a.albumCount || 0} Albums</span>
                </div>
            </div>
          `);
      }

      if (this.activeTab === 'genres') {
          return this.genres.map(g => html`
            <div class="flex flex-col p-2 border-b border-[#4a3b2a]/5 hover:bg-[#4a3b2a]/5 transition-colors cursor-pointer group">
                <span class="text-sm font-bold text-[#4a3b2a]">${g.name}</span>
                <span class="text-[10px] text-[#4a3b2a]/50 italic uppercase font-black tracking-tighter">${g.songCount || 0} Tracks</span>
            </div>
          `);
      }

      if (this.activeTab === 'playlists') {
          return this.playlists.map(p => html`
            <div class="flex items-center gap-3 p-2 border-b border-[#4a3b2a]/5 hover:bg-[#4a3b2a]/5 transition-colors cursor-pointer group">
                <div class="w-10 h-10 bg-[#4a3b2a]/10 rounded flex items-center justify-center opacity-30">
                    <svg class="w-5 h-5 text-[#4a3b2a]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9H2v2h17V9zm0-4H2v2h17V5zM2 15h13v-2H2v2zm15-2v6l5-3-5-3z"/></svg>
                </div>
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-[#4a3b2a]">${p.name}</span>
                    <span class="text-[10px] text-[#4a3b2a]/50 italic uppercase font-black tracking-tighter">${p.songCount || 0} Tracks</span>
                </div>
            </div>
          `);
      }

      return html`<div class="opacity-20 text-center p-12 italic text-sm">Library is currently silent.</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'library-panel': LibraryPanel;
  }
}
