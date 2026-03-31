import { css, unsafeCSS } from 'lit';
import tailwindBase from '../style/theme.css?inline';
import mainBase from '../style/main.css?inline';

/**
 * Shared Styles for WebSonic components.
 * This integrates global Tailwind v4 utilities and theme tokens 
 * directly into the Shadow DOM boundary of all components.
 */
export const sharedStyles = [
  unsafeCSS(tailwindBase.replace(/@import[^;]+;/g, '')),
  unsafeCSS(mainBase.replace(/@import[^;]+;/g, '')),
  css`
    :host {
      display: block;
      box-sizing: border-box;
    }
  `
];
