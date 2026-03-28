import { LitElement, css } from 'lit';

/**
 * WebSonicBaseElement
 * Global base class for all custom elements in the project.
 * Provides a clean foundation for shared behavior and styles.
 */
export class BaseElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
  `;
  // Common functionality can be added here (e.g., analytics, theme helpers)
  
  // By default, we use Light DOM for Tailwind v4 compatibility in this specific setup, 
  // or we could use Shadow DOM with adoptedStyleSheets. 
  // Given the user wants "straightforward" and "no garbage", 
  // staying with the current Shadow DOM render root bypass (createRenderRoot) 
  // facilitates easy Tailwind utility usage.
  createRenderRoot() {
    return this;
  }
}
