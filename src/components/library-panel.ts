import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';

@customElement('library-panel')
export class LibraryPanel extends BaseElement {
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
      <div class="h-full bg-[#f4e4bc] border-r border-[#d3c29d] shadow-[10px_0_30px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-in-out pointer-events-auto overflow-hidden relative"
           style="transform: translateX(${this.isOpen ? '0' : '-100%'})">
        <!-- Aged Paper Texture Overlay -->
        <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/handmade-paper.png');"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
        
        <div class="relative p-6 h-full flex flex-col items-center">
            <h2 class="text-xl font-black text-[#5c4b37] opacity-60 uppercase tracking-[0.3em] mb-4">Music Library</h2>
            <div class="w-full h-px bg-[#5c4b37] opacity-10 mb-4"></div>
            <p class="text-[#5c4b37]/40 italic text-base">The complete catalog awaits your selection...</p>
        </div>
        
        <!-- Close Button for Library -->
        <button @click=${this.handleClose} class="absolute top-3 right-4 text-[#5c4b37] opacity-40 hover:opacity-100 transition-opacity p-2 cursor-pointer">
           <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'library-panel': LibraryPanel;
  }
}
