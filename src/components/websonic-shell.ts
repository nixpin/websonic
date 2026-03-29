import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';

/**
 * WebSonic Shell
 * Implements a unique room-based layout with a wooden desk foreground.
 * - main: Area above the desk for the player interface/library
 * - player: Slot for controls, integrated into the desk surface
 */
@customElement('websonic-shell')
export class WebSonicShell extends BaseElement {
  static styles = [
    ...BaseElement.styles,
    css`
    :host {
      display: block;
      position: relative;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      /* Main background - cozy room atmosphere */
      background: #000 url('/theme/bg.webp') no-repeat center center fixed;
      background-size: cover;
      color: var(--color-stone-100);
      font-family: var(--font-family-body);
    }

    /* Primary content area (Holds the Amp, stuck to the bottom) */
    main {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40; /* Above the desk layers */
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end; /* Ground the amplifier */
      overflow: hidden;
      pointer-events: none; /* Pass events through to desk controls if needed */
    }

    main > * {
      pointer-events: auto; /* Re-enable for actual content */
    }

    /* Desk foreground structure */
    .desk {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 294px; /* Specific height for the desk foreground as requested */
      z-index: 20;
    }

    /* Interactive overlay for player controls on the desk */
    .desk-content {
      position: absolute;
      inset: 0;
      pointer-events: auto;
      z-index: 30;
      display: flex;
      align-items: flex-end;
      padding-bottom: 20px;
    }

    .desk-repeat {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 100%;
      background: url('/theme/desk-down-repeat.webp') repeat-x bottom center;
      background-size: auto 100%;
    }

    .desk-left {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 306px; /* Scaled width of the left wooden edge */
      height: 100%;
      background: url('/theme/desk-left.webp') no-repeat left bottom;
      background-size: contain;
    }

    .desk-right {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 310px; /* Scaled width of the right wooden edge */
      height: 100%;
      background: url('/theme/desk-right.webp') no-repeat right bottom;
      background-size: contain;
    }

    @media (max-width: 1024px) {
      .desk-left, .desk-right {
        width: 30%; /* Responsive scaling for smaller screens */
      }
    }
  `];

  render() {
    return html`
      <main>
        <slot name="main"></slot>
      </main>

      <div class="desk">
        <div class="desk-repeat"></div>
        <div class="desk-left"></div>
        <div class="desk-right"></div>
        
        <div class="desk-content">
          <slot name="player"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'websonic-shell': WebSonicShell;
  }
}
