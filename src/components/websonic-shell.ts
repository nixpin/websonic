import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

/**
 * WebSonic Shell
 * Provides the core layout structure with slots for modularity:
 * - sidebar: Left navigation area
 * - main: Primary content view
 * - player: Bottom playback bar
 * - header: Top branding/search area (optional)
 */
@customElement('websonic-shell')
export class WebSonicShell extends LitElement {
  static styles = css`
    :host {
      display: grid;
      grid-template-areas:
        "sidebar header"
        "sidebar main"
        "player player";
      grid-template-columns: auto 1fr;
      grid-template-rows: auto 1fr auto;
      height: 100vh;
      overflow: hidden;
      background-color: var(--color-stone-950);
      color: var(--color-stone-100);
    }

    aside {
      grid-area: sidebar;
      width: 280px;
      background-color: var(--color-stone-900);
      border-right: 1px solid var(--color-stone-800);
      display: flex;
      flex-direction: column;
      z-index: var(--z-index-sticky);
    }

    header {
      grid-area: header;
      height: 64px;
      background-color: var(--color-stone-950);
      border-bottom: 1px solid var(--color-stone-800);
      display: flex;
      align-items: center;
      padding: 0 var(--spacing-6);
    }

    main {
      grid-area: main;
      overflow-y: auto;
      padding: var(--spacing-8);
      /* Custom scrollbar for better aesthetics */
      scrollbar-width: thin;
      scrollbar-color: var(--color-stone-700) transparent;
    }

    footer {
      grid-area: player;
      height: 96px;
      background-color: var(--color-stone-900);
      border-top: 1px solid var(--color-stone-800);
      backdrop-filter: var(--backdrop-premium);
      z-index: var(--z-index-sticky);
    }

    @media (max-width: 1024px) {
      :host {
        grid-template-areas:
          "header"
          "main"
          "player";
        grid-template-columns: 1fr;
      }
      aside {
        display: none; /* Mobile navigation would be a drawer */
      }
    }
  `;

  render() {
    return html`
      <aside>
        <slot name="sidebar"></slot>
      </aside>
      <header>
        <slot name="header"></slot>
      </header>
      <main>
        <slot name="main"></slot>
      </main>
      <footer>
        <slot name="player"></slot>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'websonic-shell': WebSonicShell;
  }
}
