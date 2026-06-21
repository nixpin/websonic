import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import './websonic-player-display';
import '../views/auth-view';

@customElement('websonic-auth-overlay')
export class WebsonicAuthOverlay extends BaseElement {
  @property({ type: Boolean }) show = false;

  static styles = [
    ...BaseElement.styles,
    css`
      @media (max-width: 640px) {
        .auth-wrapper {
          width: 100%;
          height: 100%;
          transform: none;
          scale: none;
          filter: none;
        }
      }
    `
  ];

  render() {
    if (!this.show) {
      return html``;
    }

    return html`
      <div class="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-500 pointer-events-auto">
        <div class="auth-wrapper scale-110 drop-shadow-[0_0_50px_rgba(212,175,55,0.2)]">
          <websonic-player-display hideControls>
             <auth-view></auth-view>
          </websonic-player-display>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'websonic-auth-overlay': WebsonicAuthOverlay;
  }
}
