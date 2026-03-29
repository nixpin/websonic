import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { createRouter } from '../router';
import { BaseElement } from './base-element';
import { subsonicContext } from '../context/subsonic-context';
import { SubsonicClient } from '../sdk/subsonic';
import { AuthService } from '../services/auth-service';
import { QueueService } from '../services/queue-service';
import { PlayerService } from '../services/player-service';

// Registration of layout and view components
import '../components/websonic-shell';
import '../components/websonic-player-display';
import '../components/websonic-amp-hardware';
import '../components/websonic-auth-overlay';
import '../components/library-panel';
import '../components/queue-panel';
import '../views/auth-view.ts';
import '../views/dashboard-view.ts';

@customElement('websonic-app')
export class WebSonicApp extends BaseElement {
  // Global Subsonic Client Context
  @provide({ context: subsonicContext })
  @state()
  subsonicClient: SubsonicClient | null = null;

  @state() private isAuthenticated = false;
  @state() private isQueueOpen = false;
  @state() private isLibraryOpen = false;

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
        if (config) {
          this.subsonicClient = new SubsonicClient(config);
          QueueService.setClient(this.subsonicClient);
          PlayerService.setClient(this.subsonicClient);
        }
      }
    });

    // Always initialize the client if we have a config
    const config = AuthService.getActiveConfig();
    if (config) {
      this.subsonicClient = new SubsonicClient(config);
      QueueService.setClient(this.subsonicClient);
      PlayerService.setClient(this.subsonicClient);
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

  private toggleQueue() {
    this.isQueueOpen = !this.isQueueOpen;
  }

  private toggleLibrary() {
    this.isLibraryOpen = !this.isLibraryOpen;
    // As per user request: when library opens, queue should also be open
    if (this.isLibraryOpen) {
      this.isQueueOpen = true;
    }
  }

  render() {
    return html`
      <websonic-shell>
        <div slot="main" class="relative w-full h-full flex flex-col items-center justify-end overflow-hidden">
          
          <!-- Bottom Layer: The Physical Jukebox Interface -->
          <div class="relative w-full max-w-6xl flex justify-center items-end">
            <websonic-amp-hardware 
              class="relative w-full"
              .isAuthenticated=${this.isAuthenticated}
              .isQueueOpen=${this.isQueueOpen}
              .isLibraryOpen=${this.isLibraryOpen}
              @logout=${this.handleLogout}
              @toggle-queue=${this.toggleQueue}
              @toggle-library=${this.toggleLibrary}
            ></websonic-amp-hardware>

            <!-- Primary Player Screen (Hardware frame + Dashboard View) -->
            <div class="absolute inset-0 flex items-center justify-center -translate-y-[29%] pointer-events-none">
              <div class="pointer-events-auto">
                <websonic-player-display>
                   <dashboard-view></dashboard-view>
                </websonic-player-display>
              </div>
            </div>
          </div>

          <!-- Top Layer: The Authorization Overlay (Triggered if not authenticated) -->
          <websonic-auth-overlay ?show=${!this.isAuthenticated}></websonic-auth-overlay>

          <!-- Side Panels: Library & Queue -->
          <div class="absolute inset-0 pointer-events-none flex z-[200]">
             <library-panel style="width: 70%;" .isOpen=${this.isLibraryOpen} @close=${() => this.isLibraryOpen = false}></library-panel>
             <queue-panel style="width: 30%;" .isOpen=${this.isQueueOpen} @close=${() => this.isQueueOpen = false}></queue-panel>
          </div>
        </div>

        <div slot="player" class="flex items-center justify-center w-full px-12">
           <p class="text-stone-400 font-mono text-sm tracking-widest uppercase opacity-50">
             
           </p>
        </div>
      </websonic-shell>
    `;
  }
}
