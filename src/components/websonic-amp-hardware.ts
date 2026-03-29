import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';

@customElement('websonic-amp-hardware')
export class WebsonicAmpHardware extends BaseElement {
  @property({ type: Boolean }) isAuthenticated = false;
  @property({ type: Boolean }) isQueueOpen = false;
  @property({ type: Boolean }) isLibraryOpen = false;

  render() {
    return html`
        <img src="/theme/amp.webp" class="w-full h-auto drop-shadow-[0_-5px_45px_rgba(0,0,0,0.9)]" alt="Amplifier">
        
        <!-- Physical Logout Switch Hotspot (Over the 'POWER' toggle) -->
        ${this.isAuthenticated ? html`
          <!-- POWER / LOGOUT -->
          <div 
            class="absolute left-[37.6%] bottom-[19.4%] w-[34px] h-[60px] cursor-pointer group z-[60]"
            @click=${() => this.dispatchEvent(new CustomEvent('logout'))}
          >
            <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-tighter text-white/40 font-mono invisible group-hover:visible whitespace-nowrap">
              Change Server
            </div>
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 bg-amber-500/10 blur-md rounded-full transition-all duration-300"></div>
            <div class="absolute inset-0 border border-amber-500/30 group-hover:border-amber-500/80 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] rounded transition-all"></div>
          </div>

          <!-- QUEUE TOGGLE -->
          <div 
            class="absolute left-[60.5%] bottom-[22%] w-[30px] h-[30px] cursor-pointer group z-[60]"
            @click=${() => this.dispatchEvent(new CustomEvent('toggle-queue'))}
          >
            <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold tracking-widest text-[#d4af37] whitespace-nowrap">Queue</div>
            <div class="absolute inset-0 bg-black/40 rounded-sm border border-amber-500/50 group-hover:border-amber-500/80 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center">
               <div class="w-1.5 h-1.5 rounded-full ${this.isQueueOpen ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-white/10'} transition-all"></div>
            </div>
          </div>

          <!-- LIBRARY TOGGLE -->
          <div 
            class="absolute left-[52.4%] bottom-[18.7%] w-[70px] h-[70px] cursor-pointer group z-[60]"
            @click=${() => this.dispatchEvent(new CustomEvent('toggle-library'))}
          >
            <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold tracking-widest text-[#d4af37] whitespace-nowrap text-center">Library</div>
            <div class="absolute inset-0 rounded-full border-2 border-amber-500/40 bg-gradient-to-b from-white/10 to-transparent group-hover:border-amber-500/80 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center overflow-hidden">
               <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,#ffffff10,transparent)]"></div>
               <div class="w-2 h-2 rounded-full ${this.isLibraryOpen ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,1)]' : 'bg-white/5'} transition-all"></div>
            </div>
          </div>
        ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'websonic-amp-hardware': WebsonicAmpHardware;
  }
}
