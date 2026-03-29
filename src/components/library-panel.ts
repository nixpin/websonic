import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { MusicService } from '../services/music-service';
import type { Artist, Genre, Playlist } from '../services/music-service';
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

  private readonly itemsPerPage = 20;

  static styles = [
    ...BaseElement.styles,
    css`
    :host {
      display: block;
      height: 100%;
      pointer-events: none;
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

  setTab(tab: LibraryTab) {
    this.activeTab = tab;
    this.currentPage = 1;
    this.totalPages = 1; 
    this.fetchData();
  }

  private handlePageChange(e: CustomEvent<{ page: number }>) {
    this.currentPage = e.detail.page;
    this.fetchData();
  }

  render() {
    const musicService = MusicService.getInstance();

    return html`
      <div class="fixed top-0 left-0 h-full bg-[#e8d5b1] border-r border-[#d3c29d] shadow-[10px_0_30px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-in-out pointer-events-auto overflow-hidden z-[60]"
           style="width: inherit; transform: translateX(${this.isOpen ? '0' : '-100%'})">
        
        <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/cardboard-flat.png');"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

        <div class="relative p-6 h-full flex flex-col items-center">
            <h2 class="text-xl font-black text-[#4a3b2a] opacity-70 uppercase tracking-[0.3em] mb-4">Music Library</h2>
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
                        ${this.renderList(musicService)}
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

        <button @click=${this.handleClose} class="absolute top-3 right-4 text-[#4a3b2a] opacity-40 hover:opacity-100 transition-opacity p-2 cursor-pointer z-50">
           <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `;
  }

  private renderList(_musicService: MusicService) {
      if (this.activeTab === 'artists') {
          return this.artists.map(a => html`
            <div class="flex items-center gap-3 p-2 border-b border-[#4a3b2a]/5 hover:bg-[#4a3b2a]/5 transition-colors cursor-pointer group">
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
