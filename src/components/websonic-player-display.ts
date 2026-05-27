import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { PlayerService } from '../services/player-service';

/**
 * WebSonic Player Display
 * A tablet-style interface that fits into the audio equipment dashboard.
 * Features an info screen and a tactile wooden control panel.
 */
@customElement('websonic-player-display')
export class WebSonicPlayerDisplay extends BaseElement {
  @property({ type: Boolean }) hideControls = false;
  @property({ type: Boolean }) isPlaying = false;
  @property({ type: Number }) gain = 50;
  @property({ type: Boolean }) isAuthenticated = false;

  private _onStateChanged = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    this.isPlaying = detail.isPlaying;
    if (detail.gain !== undefined) this.gain = detail.gain;
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('websonic-player-state-changed', this._onStateChanged);

    const state = PlayerService.getInstance().getState();
    this.isPlaying = state.isPlaying;
    if (state.gain !== undefined) this.gain = state.gain;
  }

  disconnectedCallback() {
    window.removeEventListener('websonic-player-state-changed', this._onStateChanged);
    super.disconnectedCallback();
  }

  private _togglePlay() {
    PlayerService.getInstance().togglePlayback();
  }

  private _next() {
    PlayerService.getInstance().next();
  }

  private _prev() {
    PlayerService.getInstance().prev();
  }

  private _volumeDown() {
    const v = Math.max(0, this.gain - 5);
    PlayerService.getInstance().setVolume(v);
  }

  private _volumeUp() {
    const v = Math.min(100, this.gain + 5);
    PlayerService.getInstance().setVolume(v);
  }

  private _volumeTrackClick(e: MouseEvent) {
    const track = e.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const vol = Math.round((x / rect.width) * 100);
    PlayerService.getInstance().setVolume(Math.max(0, Math.min(100, vol)));
  }

  private _emit(eventName: string) {
    this.dispatchEvent(new CustomEvent(eventName, { bubbles: true, composed: true }));
  }

  static styles = [
    ...BaseElement.styles,
    css`
    :host {
      display: block;
      width: 600px;
      height: 400px;
      position: relative;
      filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.5));
    }

    /* Outer Tablet Frame (Pure CSS implementation of the bezel) */
    .tablet-frame {
      position: absolute;
      inset: 0;
      z-index: 10;
      pointer-events: none;
      
      /* High-end matte charcoal material */
      background: linear-gradient(145deg, #1a1a1c, #0a0a0b);
      border-radius: 25px; /* (10px screen radius + 15px bezel width) */
      
      /* 
         Professional "Hollow Box" Masking Technique 
         This punches a perfect rounded hole with the matching border radius.
      */
      padding: 15px; /* Bezel width */
      -webkit-mask: 
        linear-gradient(#fff 0 0) content-box, 
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      
      /* Distinct golden/bronze metallic rim highlight */
      border: 2px solid #8c734b;
      
      /* External shadows and Internal rim lighting for metallic effect */
      box-shadow: 
        0 20px 40px rgba(0, 0, 0, 0.8),
        inset 0 1px 2px rgba(255, 196, 0, 0.25),   /* Top-down rim light */
        inset 0 -2px 10px rgba(0, 0, 0, 0.9);      /* Depth shadow */
    }

    /* Inner screen bevel/gasket as a separate layer to avoid masking */
    .gasket {
      position: absolute;
      inset: 12px;
      z-index: 11;
      border: 1px solid rgba(0, 0, 0, 0.4);
      background: none;
      border-radius: 13px;
      box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.6);
      pointer-events: none;
    }

    /* High-resolution display area */
    .content {
      position: absolute;
      inset: 15px; /* Matched to the frame thickness */
      background: #000;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      z-index: 5;
    }

    /* Top Info Screen / Content Area */
    .screen-top {
      flex: 1; /* Default to fill available space */
      background: linear-gradient(to bottom, #2a2a2c, #1a1a1c);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      z-index: 5;
    }

    /* Bottom Control Panel (Wooden texture) */
    .control-panel {
      height: 80px; /* Fixed height for the hardware panel */
      background: #2b1d16; /* Fallback wood color */
      border-top: 1px solid rgba(0,0,0,0.5);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 40px;
    }

    /* Mock wood grain via overlay or background */
    .control-panel::before {
      content: '';
      position: absolute;
      inset: 0;
      background: url('/theme/desk-down-repeat.webp') center;
      background-size: cover;
      opacity: 0.4;
      mix-blend-mode: multiply;
    }

    .btn {
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      z-index: 20;
      transition: all 0.2s ease;
    }

    .btn svg {
      width: 24px;
      height: 24px;
      fill: #ff9d00; /* Glowing amber */
      filter: drop-shadow(0 0 5px rgba(255, 157, 0, 0.5));
    }

    .btn:hover {
      transform: scale(1.1);
    }
    
    .btn-play, .btn-prev, .btn-next {
      background: rgba(0,0,0,0.2);
      border-radius: 50%;
      border: 1px solid rgba(255,157,0,0.2);
      box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
    }

    /* ── Utility Bar (mobile only) ── */
    .utility-bar {
      display: none;
    }

    .mobile-vol-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
    }

    .mobile-vol-row .vol-track {
      flex: 1;
    }

    .mobile-action-row {
      display: flex;
      border-top: 1px solid var(--color-border-premium);
    }

    .mobile-action-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 8px;
      color: var(--color-text-dim);
      cursor: pointer;
      transition: color 0.2s;
      user-select: none;
      -webkit-user-select: none;
      border-right: 1px solid var(--color-border-premium);
    }

    .mobile-action-btn:last-child {
      border-right: none;
    }

    .mobile-action-btn:hover {
      color: var(--color-accent-from);
    }

    .mobile-action-btn svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    .mobile-action-label {
      font-size: 10px;
      font-family: var(--font-family-heading);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .mobile-server-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 8px;
      color: var(--color-text-dim);
      cursor: pointer;
      transition: color 0.2s;
      user-select: none;
      -webkit-user-select: none;
      border-top: 1px solid var(--color-border-premium);
    }

    .mobile-server-btn:hover {
      color: var(--color-accent-from);
    }

    .mobile-server-btn svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    .mobile-server-label {
      font-size: 10px;
      font-family: var(--font-family-heading);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .vol-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--color-border-strong);
      border-radius: 50%;
      cursor: pointer;
      color: var(--color-text-dim);
      font-size: 16px;
      font-family: var(--font-family-heading);
      transition: all 0.2s;
      user-select: none;
      -webkit-user-select: none;
    }

    .vol-btn:hover {
      color: var(--color-accent-from);
      border-color: var(--color-accent-primary);
    }

    .vol-track {
      width: 60px;
      height: 3px;
      background: var(--color-border-strong);
      border-radius: 2px;
      position: relative;
    }

    .vol-fill {
      height: 100%;
      background: var(--color-accent-primary);
      border-radius: 2px;
      transition: width 0.2s;
    }

    /* ── Mobile Breakpoint ── */
    @media (max-width: 640px) {
      :host {
        width: 100%;
        height: 100%;
        filter: none;
      }

      .tablet-frame,
      .gasket {
        display: none;
      }

      .content {
        inset: 0;
        border-radius: 0;
      }

      .screen-top {
        background: #000;
      }

      .control-panel {
        height: 72px;
        gap: 48px;
        border-top: 1px solid var(--color-border-strong);
      }

      .control-panel::before {
        display: none;
      }

      .utility-bar {
        display: block;
        background: #111;
        border-top: 1px solid var(--color-border-strong);
      }

      .mobile-vol-row .vol-track {
        width: auto;
        height: 4px;
      }
    }
  `];

  render() {
    return html`
      <div class="tablet-frame"></div>
      <div class="gasket"></div>
      <div class="content">
        <div class="screen-top">
          <!-- Main display slot for digital views -->
          <slot></slot>
        </div>

        ${!this.hideControls ? html`
          <div class="control-panel">
            <div class="btn btn-prev" @click=${this._prev}>
              <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </div>
            <div class="btn btn-play" @click=${this._togglePlay}>
              ${this.isPlaying ? html`
                <svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ` : html`
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              `}
            </div>
            <div class="btn btn-next" @click=${this._next}>
              <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </div>
          </div>

          <div class="utility-bar">
            ${this.isAuthenticated ? html`
              <div class="mobile-vol-row">
                <div class="vol-btn" @click=${this._volumeDown}>−</div>
                <div class="vol-track" @click=${this._volumeTrackClick}><div class="vol-fill" style="width: ${this.gain}%"></div></div>
                <div class="vol-btn" @click=${this._volumeUp}>+</div>
              </div>

              <div class="mobile-action-row">
                <div class="mobile-action-btn" @click=${() => this._emit('toggle-library')}>
                  <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                  <span class="mobile-action-label">Library</span>
                </div>
                <div class="mobile-action-btn" @click=${() => this._emit('toggle-queue')}>
                  <svg viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
                  <span class="mobile-action-label">Queue</span>
                </div>
              </div>

              <div class="mobile-server-btn" @click=${() => this._emit('logout')}>
                <svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                <span class="mobile-server-label">Change Server</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'websonic-player-display': WebSonicPlayerDisplay;
  }
}
