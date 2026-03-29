import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';

/**
 * WebSonic Player Display
 * A tablet-style interface that fits into the audio equipment dashboard.
 * Features an info screen and a tactile wooden control panel.
 */
@customElement('websonic-player-display')
export class WebSonicPlayerDisplay extends BaseElement {
  @property({ type: Boolean }) hideControls = false;

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
    
    .btn-play {
      background: rgba(0,0,0,0.2);
      border-radius: 50%;
      border: 1px solid rgba(255,157,0,0.2);
      box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
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
