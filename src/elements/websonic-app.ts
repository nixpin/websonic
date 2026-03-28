import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { createRouter } from '../router';
import { BaseElement } from './base-element';
import { subsonicContext } from '../context/subsonic-context';
import { SubsonicClient } from '../sdk/subsonic';
import { AuthService } from '../services/auth-service';

// Registration of layout and view components
import '../components/websonic-shell';
import '../components/websonic-player-display';
import '../views/auth-view.ts';
import '../views/dashboard-view.ts';

@customElement('websonic-app')
export class WebSonicApp extends BaseElement {
  // Global Subsonic Client Context
  @provide({ context: subsonicContext })
  @state()
  subsonicClient: SubsonicClient | null = null;

  @state() private isAuthenticated = false;

  // Externalized router configuration
  routes = createRouter(this as any);

  async connectedCallback() {
    super.connectedCallback();

    // Initial check
    this.isAuthenticated = AuthService.isAuthenticated();

    // Listen for auth changes from anywhere in the app
    window.addEventListener('websonic-auth-changed', () => {
      this.isAuthenticated = AuthService.isAuthenticated();
      if (this.isAuthenticated) {
        const config = AuthService.getActiveConfig();
        if (config) this.subsonicClient = new SubsonicClient(config);
      }
    });

    // Always initialize the client if we have a config
    const config = AuthService.getActiveConfig();
    if (config) {
      this.subsonicClient = new SubsonicClient(config);
    }
  }

  async firstUpdated() {
    // We handle authentication via a centered overlay in the render() method,
    // so no programmatic redirection is needed here.
  }

  private handleLogout() {
    const config = AuthService.getActiveConfig();
    const serverName = config?.baseUrl || 'the server';

    if (confirm(`Are you sure you want to disconnect from ${serverName}?`)) {
      AuthService.logout();
    }
  }

  render() {
    return html`
      <websonic-shell>
        <div slot="main" class="relative w-full h-full flex flex-col items-center justify-end overflow-hidden">
          
          <!-- Bottom Layer: The Physical Jukebox Interface -->
          <div class="relative w-full max-w-6xl flex justify-center items-end">
            <img src="/theme/amp.webp" class="w-full h-auto drop-shadow-[0_-5px_45px_rgba(0,0,0,0.9)]" alt="Amplifier">
            
            <!-- Physical Logout Switch Hotspot (Over the 'POWER' toggle) -->
            ${this.isAuthenticated ? html`
              <div 
                class="absolute left-[37.5%] bottom-[19%] w-[32px] h-[55px] cursor-pointer group z-[60]"
                @click=${this.handleLogout}
                title="Connected to: ${AuthService.getActiveConfig()?.baseUrl} (@${AuthService.getActiveConfig()?.userName})"
              >
                <!-- Subtle electromagnetic glow on hover -->
                <div class="absolute inset-0 opacity-0 group-hover:opacity-100 bg-amber-500/10 blur-md rounded-full transition-all duration-300"></div>
                <div class="absolute inset-0 border border-amber-500/0 group-hover:border-amber-500/30 rounded transition-all"></div>
              </div>
            ` : ''}

            <!-- Primary Player Screen (Hardware frame + Dashboard View) -->
            <div class="absolute inset-0 flex items-center justify-center -translate-y-[29%]">
              <websonic-player-display>
                 <dashboard-view></dashboard-view>
              </websonic-player-display>
            </div>
          </div>

          <!-- Top Layer: The Authorization Overlay (Triggered if not authenticated) -->
          ${!this.isAuthenticated ? html`
            <div class="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-500">
              <div class="scale-110 drop-shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                <websonic-player-display hideControls>
                   <auth-view></auth-view>
                </websonic-player-display>
              </div>
            </div>
          ` : ''}
        </div>

        <div slot="player" class="flex items-center justify-center w-full px-12">
           <p class="text-stone-400 font-mono text-sm tracking-widest uppercase opacity-50">
             System Ready / WebSonic Audio Engine
           </p>
        </div>
      </websonic-shell>
    `;
  }
}
