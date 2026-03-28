import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { createRouter } from '../router';
import { BaseElement } from './base-element';
import { subsonicContext } from '../context/subsonic-context';
import type { SubsonicClient } from '../sdk/subsonic';

// Registration of layout components
import '../components/websonic-shell';
import '../components/websonic-player-display';

@customElement('websonic-app')
export class WebSonicApp extends BaseElement {
  // Global Subsonic Client Context
  @provide({ context: subsonicContext })
  @state()
  subsonicClient: SubsonicClient | null = null;

  // Externalized router configuration
  routes = createRouter(this);

  render() {
    return html`
      <websonic-shell>
        <div slot="main" class="flex flex-col items-center justify-end w-full h-full">
          <!-- Central Audio Equipment Interface -->
          <div class="relative w-full max-w-6xl flex justify-center items-end">
             <img src="/theme/amp.webp" class="w-full h-auto drop-shadow-[0_-5px_45px_rgba(0,0,0,0.9)]" alt="Amplifier">
             
             <!-- Primary Player Interface (Tablet Display Overlay, raised for better visibility) -->
             <div class="absolute inset-0 flex items-center justify-center -translate-y-[29%]">
                <websonic-player-display></websonic-player-display>
             </div>
          </div>
        </div>

        <div slot="player" class="flex items-center justify-center w-full px-12">
           <!-- Playback controls will be integrated into the desk surface -->
           <p class="text-stone-400 font-mono text-sm tracking-widest uppercase opacity-50">
             System Ready / WebSonic Audio Engine
           </p>
        </div>
      </websonic-shell>
    `;
  }
}
