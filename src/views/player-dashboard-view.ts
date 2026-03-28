import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';

/**
 * Player Dashboard View
 * The high-end digital interface for the music player.
 * Displays current track information, album art, and progress.
 */
@customElement('player-dashboard-view')
export class PlayerDashboardView extends BaseElement {
  @property({ type: String }) trackTitle = 'Bohemian Rhapsody';
  @property({ type: String }) artistName = 'Queen';
  @property({ type: String }) albumName = 'A Night at the Opera';
  @property({ type: String }) coverArt = '/theme/screenshot-player.webp';

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: linear-gradient(145deg, #1e1e20, #0a0a0b);
      padding: 24px;
      color: #ede0c4;
      font-family: var(--font-sans);
    }

    .main-display {
      flex: 1;
      display: flex;
      gap: 24px;
      align-items: center;
    }

    .cover-art-container {
      width: 140px;
      height: 140px;
      background: #000;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cover-art-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .track-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
    }

    .title {
      font-size: 26px;
      font-weight: 700;
      color: #d4af37; /* Metallic Gold */
      margin-bottom: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }

    .artist {
      font-size: 18px;
      color: #ede0c4;
      margin-bottom: 2px;
      opacity: 0.9;
    }

    .album {
      font-size: 14px;
      color: #9f9172;
      font-style: italic;
      opacity: 0.7;
    }

    /* Progress bar section */
    .progress-section {
      margin-top: 24px;
    }

    .progress-container {
      height: 6px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
      position: relative;
      margin-bottom: 8px;
      border: 1px solid rgba(0,0,0,0.3);
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);
    }

    .progress-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 45%; /* Match current playback state */
      background: linear-gradient(to right, #8c734b, #d4af37);
      box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
      border-radius: 3px;
    }

    .time-stamps {
      display: flex;
      justify-content: space-between;
      font-family: monospace;
      font-size: 12px;
      color: #9f9172;
      letter-spacing: 0.1em;
    }
  `;

  render() {
    return html`
      <div class="main-display">
        <div class="cover-art-container">
          <img src=${this.coverArt} alt="Album Art">
        </div>
        
        <div class="track-info">
          <div class="title">${this.trackTitle}</div>
          <div class="artist">${this.artistName}</div>
          <div class="album">${this.albumName}</div>
        </div>
      </div>

      <div class="progress-section">
        <div class="progress-container">
          <div class="progress-fill"></div>
        </div>
        <div class="time-stamps">
          <span>02:45</span>
          <span>06:01</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'player-dashboard-view': PlayerDashboardView;
  }
}
