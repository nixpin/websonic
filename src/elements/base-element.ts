import { LitElement } from 'lit';
import { sharedStyles } from './shared-styles';

/**
 * WebSonicBaseElement
 * Architectural Base for all WebSonic custom elements.
 * 
 * DESIGN PATTERN:
 * - Uses Shadow DOM by default for professional encapsulation.
 * - Integrates global Tailwind v4 utilities via sharedStyles.
 * - Components can extend styles by spreading: 
 *   static override styles = [...BaseElement.styles, css` ... `];
 */
export class BaseElement extends LitElement {
  static styles: any = [...sharedStyles];
}
