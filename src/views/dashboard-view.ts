import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';

@customElement('dashboard-view')
export class DashboardView extends BaseElement {
  render() {
    return html`
      <div class="">
        placeholder for dash board
      </div>
    `;
  }
}
