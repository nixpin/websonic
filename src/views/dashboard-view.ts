import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';

import './player-dashboard-view.js';

@customElement('dashboard-view')
export class DashboardView extends BaseElement {
  render() {
    return html`
      <player-dashboard-view></player-dashboard-view>
    `;
  }
}
