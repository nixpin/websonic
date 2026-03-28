import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * WebSonic Player Display
 * A tablet-style interface that fits into the audio equipment dashboard.
 * Features an info screen and a tactile wooden control panel.
 */
@customElement('websonic-player-display')
export class WebSonicPlayerDisplay extends LitElement {
  @property({ type: String }) trackTitle = 'Bohemian Rhapsody';
  @property({ type: String }) artistName = 'Queen';
  @property({ type: String }) albumName = 'A Night at the Opera';
  @property({ type: String }) coverArt = '/theme/screenshot-player.webp'; // Placeholder or actual art

  static styles = css`
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
      border-radius: 20px;
      
      /* External and Internal depth shadows */
      box-shadow: 
        0 15px 35px rgba(0, 0, 0, 0.7),
        inset 0 2px 4px rgba(255, 255, 255, 0.05),
        inset 0 -2px 10px rgba(0, 0, 0, 0.8);
      
      /* Distinct golden/bronze metallic rim highlight */
      border: 2px solid #8c734b; /* Warm antique gold */
      
      /* External shadows and Internal rim lighting for metallic effect */
      box-shadow: 
        0 20px 40px rgba(0, 0, 0, 0.8),
        inset 0 1px 2px rgba(255, 196, 0, 0.25),   /* Top-down rim light */
        inset 0 -2px 10px rgba(0, 0, 0, 0.9);      /* Depth shadow */
    }

    /* Inner screen bevel/gasket */
    .tablet-frame::after {
      content: '';
      position: absolute;
      inset: 12px;
      border: 1px solid rgba(0, 0, 0, 0.4);
      background: rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.6);
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

    /* Top Info Screen */
    .screen-top {
      flex: 1.4;
      background: linear-gradient(to bottom, #2a2a2c, #1a1a1c);
      padding: 24px;
      display: flex;
      gap: 20px;
      position: relative;
    }

    .cover-art {
      width: 140px;
      height: 140px;
      background: #000;
      box-shadow: 0 10px 20px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
    }

    .track-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      color: #ede0c4; /* Warm cream */
      margin-bottom: 4px;
    }

    .artist, .album {
      font-size: 16px;
      color: #9f9172; /* Muted amber */
      opacity: 0.8;
    }

    /* Progress bar */
    .progress-container {
      position: absolute;
      bottom: 20px;
      left: 24px;
      right: 24px;
    }

    .progress-bar {
      height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      position: relative;
    }

    .progress-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 40%;
      background: #d4af37; /* Gold/Amber */
      box-shadow: 0 0 10px #d4af37;
    }

    .time-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-family: monospace;
      color: #9f9172;
      margin-top: 6px;
    }

    /* Bottom Control Panel (Wooden texture) */
    .control-panel {
      flex: 1;
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
    
    .btn-play {
      background: rgba(0,0,0,0.2);
      border-radius: 50%;
      border: 1px solid rgba(255,157,0,0.2);
      box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
    }
  `;

  render() {
    return html`
      <div class="tablet-frame"></div>
      <div class="content">
        <div class="screen-top">
          <div class="cover-art"></div>
          <div class="track-info">
            <div class="title">${this.trackTitle}</div>
            <div class="artist">${this.artistName}</div>
            <div class="album">${this.albumName}</div>
          </div>
          
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
            <div class="time-labels">
              <span>2:14</span>
              <span>5:35</span>
            </div>
          </div>
        </div>

        <div class="control-panel">
           <div class="btn btn-skip">
             <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
           </div>
           <div class="btn btn-play">
             <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
           </div>
           <div class="btn btn-skip">
             <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
           </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'websonic-player-display': WebSonicPlayerDisplay;
  }
}
