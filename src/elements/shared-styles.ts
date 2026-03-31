import { css, unsafeCSS } from 'lit';
import tailwindBase from '../style/theme.css?inline';

/**
 * Shared Styles for WebSonic components.
 * This integrates global Tailwind v4 utilities and theme tokens 
 * directly into the Shadow DOM boundary of all components.
 * 
 * We ONLY include the theme/utilities, as global resets and 
 * fonts are handled by index.css at the document level.
 */
export const sharedStyles = [
  unsafeCSS(tailwindBase.replace(/@import\s+url\([^;]+;\s*/g, '')),
  css`
    :host {
      display: block;
      box-sizing: border-box;
    }
  `
];
