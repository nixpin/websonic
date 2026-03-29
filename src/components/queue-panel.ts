import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';

@customElement('queue-panel')
export class QueuePanel extends BaseElement {
  @property({ type: Boolean }) isOpen = false;

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <style>
        :host {
          display: block;
          height: 100%;
          pointer-events: none;
        }
      </style>
      <div class="h-full bg-[#e8d5b1] border-l border-[#d3c29d] shadow-[-10px_0_30px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-in-out pointer-events-auto overflow-hidden relative"
           style="transform: translateX(${this.isOpen ? '0' : '100%'})">
        <!-- Aged Paper Texture Overlay -->
        <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/cardboard-flat.png');"></div>
        <div class="absolute inset-0 bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>

        <div class="relative p-4 h-full flex flex-col items-center">
           <h2 class="font-serif text-lg font-black text-[#4a3b2a] opacity-70 uppercase tracking-widest mb-4">Play Queue</h2>
           <div class="w-full h-px bg-[#4a3b2a] opacity-10 mb-4"></div>
           <div class="flex-1 flex items-center justify-center">
              <p class="text-[#4a3b2a]/40 font-serif italic text-xs">Your journey is being prepared...</p>
           </div>
        </div>

        <!-- Close Button for Queue -->
        <button @click=${this.handleClose} class="absolute top-4 left-4 text-[#4a3b2a] opacity-40 hover:opacity-100 transition-opacity p-2 cursor-pointer">
           <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'queue-panel': QueuePanel;
  }
}
