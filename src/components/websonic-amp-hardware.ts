import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import { PlayerService } from '../services/player-service';

@customElement('websonic-amp-hardware')
export class WebsonicAmpHardware extends BaseElement {
  @property({ type: Boolean }) isAuthenticated = false;
  @property({ type: Boolean }) isQueueOpen = false;
  @property({ type: Boolean }) isLibraryOpen = false;
  @property({ type: Number }) gain = 50;

  private _onStateChanged = (e: Event) => {
    const status = (e as CustomEvent).detail;
    this.gain = status.gain;
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('websonic-player-state-changed', this._onStateChanged);
  }

  disconnectedCallback() {
    window.removeEventListener('websonic-player-state-changed', this._onStateChanged);
    super.disconnectedCallback();
  }

  private _handleVolumeClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);

    // Calculate absolute angle (0 is North)
    let angle = Math.atan2(x, -y) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    // Map angle to percentage (225deg sweep start, 270deg total sweep)
    const normAngle = (angle - 225 + 360) % 360;

    // Clamp to 270 degree active zone
    let targetAngle = normAngle;
    if (targetAngle > 270) {
      targetAngle = (targetAngle > 315) ? 0 : 270;
    }

    const volume = Math.round((targetAngle / 270) * 100);
    PlayerService.getInstance().setVolume(volume);
  }

  private _handleVolumeWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 5 : -5;
    const newVolume = Math.max(0, Math.min(100, this.gain + delta));
    PlayerService.getInstance().setVolume(newVolume);
  }

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
            <h4 class="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-tighter text-white/40 font-mono invisible group-hover:visible whitespace-nowrap">
              Change Server
            </h4>
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 bg-amber-500/10 blur-md rounded-full transition-all duration-300"></div>
            <div class="absolute inset-0 border border-amber-500/30 group-hover:border-amber-500/80 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] rounded transition-all"></div>
          </div>

          <!-- QUEUE TOGGLE -->
          <div 
            class="absolute left-[60.5%] bottom-[22%] w-[30px] h-[30px] cursor-pointer group z-[60]"
            @click=${() => this.dispatchEvent(new CustomEvent('toggle-queue'))}
          >
            <h4 class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold tracking-widest text-[#FFBF00] whitespace-nowrap">Queue</h4>
            <div class="absolute inset-0 bg-black/40 rounded-sm border border-[#FFBF00]/50 group-hover:border-[#FFBF00]/80 group-hover:shadow-[0_0_15px_rgba(255,191,0,0.4)] transition-all flex items-center justify-center">
               <div class="w-1.5 h-1.5 rounded-full ${this.isQueueOpen ? 'bg-[#FFBF00] shadow-[0_0_8px_rgba(255,191,0,0.8)]' : 'bg-white/10'} transition-all"></div>
            </div>
          </div>

          <!-- LIBRARY TOGGLE -->
          <div 
            class="absolute left-[52.4%] bottom-[18.7%] w-[70px] h-[70px] cursor-pointer group z-[60]"
            @click=${() => this.dispatchEvent(new CustomEvent('toggle-library'))}
          >
            <h4 class="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold tracking-widest text-[#FFBF00] whitespace-nowrap text-center">Library</h4>
            <div class="absolute inset-0 rounded-full border-2 border-[#FFBF00]/40 bg-gradient-to-b from-white/10 to-transparent group-hover:border-[#FFBF00]/80 group-hover:shadow-[0_0_15px_rgba(255,191,0,0.4)] transition-all flex items-center justify-center overflow-hidden">
               <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,#ffffff10,transparent)]"></div>
               <div class="w-2 h-2 rounded-full ${this.isLibraryOpen ? 'bg-[#FFBF00] shadow-[0_0_12px_rgba(255,191,0,1)]' : 'bg-white/5'} transition-all"></div>
            </div>
          </div>

          <!-- VOLUME KNOB -->
          <div 
            class="absolute left-[16%] bottom-[16%] w-[100px] h-[100px] z-[60] flex flex-col items-center group"
          >
            <h4 class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold tracking-widest text-[#FFBF00] whitespace-nowrap">Volume</h4>
            
            <div 
              class="relative w-full h-full rounded-full flex items-center justify-center cursor-pointer overflow-visible"
              @click=${this._handleVolumeClick}
              @wheel=${this._handleVolumeWheel}
            >
              <!-- Background Track (Static Frame, 270 degrees) -->
              <div class="absolute -inset-[15px] rounded-full opacity-[0.15] pointer-events-none"
                   style="background: conic-gradient(from 225deg, #FFBF00 0deg, #FFBF00 270deg, transparent 270deg);
                          mask: radial-gradient(circle, transparent 40px, black 43px, black 47px, transparent 50px);
                          -webkit-mask: radial-gradient(circle, transparent 40px, black 43px, black 47px, transparent 50px);">
              </div>

              <!-- Active Glowing Line (Dynamic) -->
              <div class="absolute -inset-[15px] rounded-full transition-all duration-300 pointer-events-none"
                   style="background: conic-gradient(from 225deg, rgba(255,255,220,0.7) 0deg, rgba(255,255,220,0.7) ${this.gain * 2.7}deg, transparent ${this.gain * 2.7}deg);
                          mask: radial-gradient(circle, transparent 40px, black 43px, black 47px, transparent 50px);
                          -webkit-mask: radial-gradient(circle, transparent 40px, black 43px, black 47px, transparent 50px);
                          filter: blur(1.2px) drop-shadow(0 0 4px rgba(255,191,0,0.8)) drop-shadow(0 0 12px rgba(255,160,0,0.4));">
              </div>

              <!-- Main Knob Body (Matching Library style, now Rich Gold) -->
              <div class="w-[70px] h-[70px] rounded-full border-2 border-[#FFBF00]/40 bg-gradient-to-b from-white/10 to-transparent transition-all overflow-hidden flex items-center justify-center relative shadow-inner group-hover:border-[#FFBF00]/80 group-hover:shadow-[0_0_15px_rgba(255,191,0,0.4)]">
                 <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,#ffffff10,transparent)]"></div>
                 
                 <!-- The Notch (Rotating Dot on the body) -->
                 <div class="absolute inset-0 flex items-start justify-center transition-transform duration-300" 
                      style="transform: rotate(${225 + this.gain * 2.7}deg);">
                      <div class="w-1.5 h-1.5 bg-white shadow-[0_0_8px_white] rounded-full mt-1.5"></div>
                 </div>
              </div>
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
