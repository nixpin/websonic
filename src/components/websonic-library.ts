import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { MusicService } from '../services/music-service';
import type { Artist, Song, Genre, Playlist } from '../services/music-service';

type LibraryTab = 'artists' | 'songs' | 'genres' | 'playlists';

@customElement('websonic-library')
export class WebsonicLibrary extends BaseElement {
  @state() activeTab: LibraryTab = 'artists';
  @state() artists: Artist[] = [];
  @state() songs: Song[] = [];
  @state() genres: Genre[] = [];
  @state() playlists: Playlist[] = [];
  @state() loading = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
    }

    .modal {
      position: relative;
      width: 100%;
      max-width: 900px;
      height: 80vh;
      background: linear-gradient(135deg, rgba(30, 30, 30, 0.9), rgba(15, 15, 15, 0.95));
      border: 2px solid rgba(255, 191, 0, 0.2);
      border-radius: 12px;
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 191, 0, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .header {
      padding: 24px;
      border-bottom: 1px solid rgba(255, 191, 0, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tabs {
      display: flex;
      gap: 20px;
      margin-left: 10px;
    }

    .tab {
      color: rgba(255, 191, 0, 0.5);
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      cursor: pointer;
      padding: 8px 12px;
      border-bottom: 2px solid transparent;
      transition: all 0.3s;
    }

    .tab:hover {
      color: rgba(255, 191, 0, 0.8);
    }

    .tab.active {
      color: #FFBF00;
      border-bottom-color: #FFBF00;
      text-shadow: 0 0 10px rgba(255, 191, 0, 0.5);
    }

    .close-btn {
      color: rgba(255, 191, 0, 0.5);
      cursor: pointer;
      font-size: 24px;
      transition: all 0.3s;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .close-btn:hover {
      color: #FFBF00;
      background: rgba(255, 191, 0, 0.1);
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 191, 0, 0.2) transparent;
    }

    .content::-webkit-scrollbar {
      width: 6px;
    }
    .content::-webkit-scrollbar-thumb {
      background: rgba(255, 191, 0, 0.2);
      border-radius: 10px;
    }

    .list-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .list-item:hover {
      background: rgba(255, 191, 0, 0.05);
      border-color: rgba(255, 191, 0, 0.15);
    }

    .item-art {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 1px solid rgba(255, 191, 0, 0.1);
    }

    .item-info {
        flex: 1;
    }

    .item-name {
      color: #dfdfdf;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .item-meta {
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
    }

    .loader {
        display: flex;
        justify-content: center;
        padding-top: 50px;
        color: #FFBF00;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 2px;
    }
  `;

  firstUpdated() {
    this.fetchData();
  }

  async fetchData() {
    this.loading = true;
    try {
      const musicService = MusicService.getInstance();
      if (this.activeTab === 'artists') {
        this.artists = await musicService.getArtists();
      } else if (this.activeTab === 'songs') {
        this.songs = await musicService.getRandomSongs();
      } else if (this.activeTab === 'genres') {
        this.genres = await musicService.getGenres();
      } else if (this.activeTab === 'playlists') {
        this.playlists = await musicService.getPlaylists();
      }
    } catch (e) {
      console.error('Failed to fetch library data', e);
    } finally {
      this.loading = false;
    }
  }

  setTab(tab: LibraryTab) {
    this.activeTab = tab;
    this.fetchData();
  }

  render() {
    return html`
      <div class="backdrop" @click=${() => this.dispatchEvent(new CustomEvent('close'))}></div>
      <div class="modal">
        <div class="header">
          <div class="tabs">
            <div class="tab ${this.activeTab === 'artists' ? 'active' : ''}" @click=${() => this.setTab('artists')}>Artists</div>
            <div class="tab ${this.activeTab === 'songs' ? 'active' : ''}" @click=${() => this.setTab('songs')}>Songs</div>
            <div class="tab ${this.activeTab === 'genres' ? 'active' : ''}" @click=${() => this.setTab('genres')}>Genres</div>
            <div class="tab ${this.activeTab === 'playlists' ? 'active' : ''}" @click=${() => this.setTab('playlists')}>Playlists</div>
          </div>
          <div class="close-btn" @click=${() => this.dispatchEvent(new CustomEvent('close'))}>
            &times;
          </div>
        </div>

        <div class="content">
          ${this.loading ? html`<div class="loader">Tuning Library...</div>` : this.renderTabContent()}
        </div>
      </div>
    `;
  }

  renderTabContent() {
    if (this.activeTab === 'artists') {
      return this.artists.map(a => html`
        <div class="list-item">
          <div class="item-art">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-white/20">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div class="item-info">
            <div class="item-name">${a.name}</div>
            <div class="item-meta">${a.albumCount || 0} Albums</div>
          </div>
        </div>
      `);
    }

    if (this.activeTab === 'songs') {
      const musicService = MusicService.getInstance();
      return this.songs.map(s => html`
        <div class="list-item" @click=${() => console.log('Play song:', s.id)}>
          <div class="item-art">
            ${s.coverArt ? html`<img src="${musicService.getCoverArtUrl(s.id, 100)}" class="w-full h-full object-cover">` : html`
              <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-white/20">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            `}
          </div>
          <div class="item-info">
            <div class="item-name">${s.title}</div>
            <div class="item-meta">${s.artist} • ${s.album}</div>
          </div>
        </div>
      `);
    }

    if (this.activeTab === 'genres') {
      return this.genres.map(g => html`
        <div class="list-item">
          <div class="item-art">
             <span class="text-[10px] text-white/30 font-bold font-mono">GEN</span>
          </div>
          <div class="item-info">
            <div class="item-name">${g.name}</div>
            <div class="item-meta">${g.songCount} Songs</div>
          </div>
        </div>
      `);
    }

    if (this.activeTab === 'playlists') {
      return this.playlists.map(p => html`
        <div class="list-item">
          <div class="item-art">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-white/20">
              <path d="M19 9H2v2h17V9zm0-4H2v2h17V5zM2 15h13v-2H2v2zm15-2v6l5-3-5-3z"/>
            </svg>
          </div>
          <div class="item-info">
            <div class="item-name">${p.name}</div>
            <div class="item-meta">${p.songCount} Songs • By ${p.owner}</div>
          </div>
        </div>
      `);
    }

    return html`<div class="loader">Selection empty</div>`;
  }
}
