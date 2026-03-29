import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { type PlayerStatus, PlayerService } from '../services/player-service';

/**
 * Player Dashboard View
 * High-fidelity, analog-inspired "Now Playing" display.
 * Features recessed album art, gold-toned typography, and mechanical progress bar.
 */
@customElement('player-dashboard-view')
export class PlayerDashboardView extends BaseElement {
  @property({ type: Object }) status: PlayerStatus | null = null;
  @state() private internalStatus: PlayerStatus | null = null;

  static styles = [
    ...BaseElement.styles,
    css`
    :host {
      display: block; /* Using block for more predictable padding behavior */
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      background: #1c1c1e; /* Deep dark background like in screenshot */
      color: #ede0c4;
      font-family: var(--font-family-body);
      overflow: hidden;
      position: relative;
    }

    /* Horizontal Layout Container */
    .dashboard-main {
      display: flex;
      gap: 32px;
      align-items: center;
      flex: 1;
    }

    /* Recessed Art Well (Circular cutout for the vinyl effect) */
    .art-well {
      position: relative;
      width: 190px; /* Restored close to original size as vertical was fine */
      height: 190px;
      flex-shrink: 0;
      border-radius: 50%; 
      background: #000;
      /* Depth effect - inner shadows create the recessed look */
      box-shadow: 
        inset 0 10px 20px rgba(0,0,0,0.8),
        inset 0 -5px 10px rgba(255,255,255,0.05),
        0 1px 1px rgba(255,255,255,0.1);
      padding: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #2c2c2e;
    }

    .art-well img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      opacity: 0.9;
      filter: contrast(1.1) brightness(0.9);
      background: #111;
      border: 1px solid rgba(255, 255, 255, 0.4);
      z-index: 5;
    }

    /* Central Vinyl Label / Protective Disk (Semi-transparent overlay in the middle) */
    .vinyl-label-center {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.1); /* Semi-transparent as requested */
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 10;
      pointer-events: none;
      
      /* Subtle radial ring highlight */
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    }

    /* Vinyl Grooves (Subtle overlay for texture) */
    .vinyl-grooves {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: repeating-radial-gradient(
        circle at center,
        transparent 0,
        transparent 1px,
        rgba(0,0,0,0.1) 1px,
        rgba(0,0,0,0.1) 2px
      );
      pointer-events: none;
      z-index: 6;
    }

    /* Rotation Animation for Playback (Applied to the whole record assembly) */
    @keyframes rotate-vinyl {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .record-assembly.is-playing {
      animation: rotate-vinyl 12s linear infinite;
    }

    .record-assembly {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    /* Vinyl Spindle / Hole (Stationary center element) */
    .spindle {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 14px;
      height: 14px;
      background: #000;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 20;
      box-shadow: 
        inset 0 1px 2px rgba(0,0,0,1),
        0 1px 1px rgba(255,255,255,0.1);
    }

    /* Metallic Gasket / Inner Ring */
    .art-well::after {
      content: '';
      position: absolute;
      inset: 6px;
      border: 1px solid rgba(236, 224, 197, 0.1);
      border-radius: 50%;
      pointer-events: none;
    }

    /* Placeholder Vinyl Label - Show text when no art */
    .art-placeholder {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #151517; /* Slate-like vinyl label color */
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px;
      text-align: center;
      box-sizing: border-box;
      border: 1px solid rgba(251, 191, 36, 0.2);
    }

    .art-placeholder .placeholder-artist {
      font-family: var(--font-family-heading);
      color: #fbbf24; /* Amber-gold theme */
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.15em;
      margin-bottom: 6px;
      opacity: 0.8;
      line-clamp: 2;
      overflow: hidden;
    }

    .art-placeholder .placeholder-album {
      font-family: var(--font-family-body);
      color: #ede0c4;
      font-size: 10px;
      opacity: 0.5;
      font-style: italic;
      line-clamp: 2;
      overflow: hidden;
    }

    /* Mechanical Progress Bar */
    .progress-section {
      margin-top: auto;
      padding-top: 24px;
      padding-bottom: 8px; /* Extra breathing room at the bottom */
    }

    .progress-track {
      height: 2px; /* Ultra-slim precision groove */
      background: #000;
      border-radius: 1px;
      position: relative;
      width: 100%;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
      cursor: pointer;
    }

    /* Invisible expanded hit area for easier clicking/seeking */
    .progress-track::before {
      content: '';
      position: absolute;
      top: -12px;
      bottom: -12px;
      left: 0;
      right: 0;
      z-index: 5;
    }

    .progress-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: var(--color-accent-from);
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
      border-radius: 1px;
    }

    /* The Needle - High-precision laser-cut indicator */
    .progress-handle {
      position: absolute;
      top: 50%;
      width: 2px;
      height: 18px; /* Taller needle like a scale marker */
      background: #fbbf24;
      transform: translate(-50%, -50%);
      box-shadow: 
        0 0 8px rgba(251, 191, 36, 0.8),
        0 0 2px rgba(251, 191, 36, 1);
      z-index: 10;
    }

    /* Small dot at the base of the needle for extra mechanical detail */
    .progress-handle::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 50%;
      width: 4px;
      height: 4px;
      background: #fbbf24;
      border-radius: 50%;
      transform: translateX(-50%);
    }

    .time-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: var(--color-text-muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    /* Subtle Grain Overlay for analog feel */
    :host::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
      opacity: 0.03;
      pointer-events: none;
    }

    /* Meta Badges (Audio Quality) - Aligned with the new horizontal padding */
    .meta-badge {
      position: absolute;
      top: 24px;
      right: 15px;
      display: flex;
      gap: 12px;
      font-family: var(--font-family-heading);
      letter-spacing: 0.1em;
    }

    .meta-tag {
      display: inline-block;
      font-size: 10px;
      font-family: ui-monospace, monospace;
      border: 1px solid #3a3a3c;
      padding: 2px 6px;
      border-radius: 4px;
      color: #636366;
      text-transform: uppercase;
      font-weight: bold;
    }
    .viewport-pad {
      padding: 0 10px; /* Small horizontal breathing room as requested */
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
      font-family: var(--font-family-heading); /* Base font for the viewport titular elements */
    }
  `];

  private _tickerInterval: any = null;

  private _onStateChanged = (e: Event) => {
    this.internalStatus = (e as CustomEvent).detail;
    this._updateTicker();
  };

  private _updateTicker() {
    const status = this.status || this.internalStatus;
    if (status?.isPlaying) {
      this._startTicker();
    } else {
      this._stopTicker();
    }
  }

  private _startTicker() {
    if (this._tickerInterval) return;
    this._tickerInterval = setInterval(() => {
      const status = this.status || this.internalStatus;
      if (status && status.isPlaying && status.currentTrack) {
        if (status.position < status.currentTrack.duration) {
          // Local increment for smooth UI movement
          this.internalStatus = {
            ...status,
            position: status.position + 1
          };
        }
      }
    }, 1000);
  }

  private _stopTicker() {
    if (this._tickerInterval) {
      clearInterval(this._tickerInterval);
      this._tickerInterval = null;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('websonic-player-state-changed', this._onStateChanged);
    // Initial fetch
    this.internalStatus = PlayerService.getInstance().getState();
    this._updateTicker();
  }

  disconnectedCallback() {
    this._stopTicker();
    window.removeEventListener('websonic-player-state-changed', this._onStateChanged);
    super.disconnectedCallback();
  }

  private handleSeek(e: MouseEvent) {
    const track = e.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    
    const activeStatus = this.status || this.internalStatus;
    const duration = activeStatus?.currentTrack?.duration || 0;
    
    if (duration > 0) {
      const seekSeconds = Math.floor(percentage * duration);
      PlayerService.getInstance().seek(seekSeconds);
    }
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  render() {
    const activeStatus = this.status || this.internalStatus;
    const track = activeStatus?.currentTrack;
    const progress = (track?.duration && activeStatus?.position) ? (activeStatus.position / track.duration) * 100 : 0;
    const coverUrl = track?.coverArt ? PlayerService.getInstance().getCoverArtUrl(track.id) : '/theme/cover-placeholder.webp';

    return html`
      <div class="viewport-pad">
        ${track ? html`
          <div class="meta-badge">
             <h4 class="meta-tag">${activeStatus?.format || 'PCM'}</h4>
             <h4 class="meta-tag text-[9px]">${activeStatus?.bitRate ? Math.round(activeStatus.bitRate / 1000) : '—'}kbps</h4>
          </div>

          <div class="dashboard-main py-4">
            <div class="art-well">
              <div class="record-assembly ${activeStatus?.isPlaying ? 'is-playing' : ''}">
                ${track.coverArt ? html`
                  <img src="${coverUrl}" alt="Album Art">
                ` : html`
                  <div class="art-placeholder">
                    <div class="placeholder-artist">${track.artist}</div>
                    <div class="placeholder-album">${track.album}</div>
                  </div>
                `}
                <div class="vinyl-grooves"></div>
                <div class="vinyl-label-center"></div>
              </div>
              <div class="spindle"></div>
            </div>

            <div class="flex-1 flex flex-col justify-center text-left">
                <h1 class="text-xl font-bold text-[var(--color-accent-from)] drop-shadow-lg mb-2 line-clamp-1">${track.title}</h1>
                <h2 class="text-lg text-[var(--color-text-dim)] mb-1 opacity-90 tracking-wide uppercase">${track.artist}</h2>
                <div class="text-base text-[var(--color-text-muted)] italic opacity-60">${track.album}</div>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-track" @click=${this.handleSeek}>
              <div class="progress-fill" style="width: ${progress}%"></div>
              <div class="progress-handle" style="left: ${progress}%"></div>
            </div>
            <div class="time-labels">
              <span>${this.formatTime(activeStatus?.position || 0)}</span>
              <span>${this.formatTime(track?.duration || 0)}</span>
            </div>
          </div>
        ` : html`
          <div class="flex-1 flex items-center justify-center">
            <div class="text-xl font-bold text-stone-600 tracking-widest uppercase opacity-20">No Track Playing</div>
          </div>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'player-dashboard-view': PlayerDashboardView;
  }
}
