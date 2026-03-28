import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit-labs/context';
import { createRouter } from '../router';
import { BaseElement } from './base-element';
import { subsonicContext } from '../context/subsonic-context';
import type { SubsonicClient } from '../sdk/subsonic';

// Registration of layout components
import '../components/websonic-shell';

@customElement('websonic-app')
export class WebSonicApp extends BaseElement {
  // Global Subsonic Client Context
  @provide({ context: subsonicContext })
  @state() 
  private subsonicClient: SubsonicClient | null = null;

  // Externalized router configuration
  private routes = createRouter(this);

  render() {
    return html`
      <websonic-shell>
        <!-- Background Effects layer (global) -->
        <div slot="main" class="absolute inset-0 overflow-hidden -z-10 bg-[var(--color-bg-base)]">
          <div class="absolute top-[15%] left-[10%] w-[50%] h-[50%] bg-[var(--color-surface-glow-primary)] blur-[150px] rounded-full opacity-60"></div>
          <div class="absolute bottom-[15%] right-[10%] w-[50%] h-[50%] bg-[var(--color-surface-glow-secondary)] blur-[150px] rounded-full opacity-40"></div>
        </div>

        <div slot="header" class="flex items-center gap-4 w-full">
           <h1 class="text-2xl font-black italic tracking-tighter uppercase mr-auto">
              <span class="bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] bg-clip-text text-transparent">
                WEBSONIC
              </span>
           </h1>
           <!-- Quick search would go here -->
        </div>

        <div slot="sidebar" class="flex flex-col p-6 gap-2">
           <nav class="flex flex-col gap-1">
             <a href="/" class="p-2 hover:bg-white/5 rounded-lg transition-colors">Browse</a>
             <a href="/library" class="p-2 hover:bg-white/5 rounded-lg transition-colors">Library</a>
           </nav>
        </div>

        <div slot="main" class="max-w-7xl mx-auto w-full relative z-10">
           ${this.routes.outlet()}
        </div>

        <div slot="player" class="flex items-center justify-center h-full">
           <p class="text-stone-500 italic">Ready for music...</p>
        </div>
      </websonic-shell>
    `;
  }
}
