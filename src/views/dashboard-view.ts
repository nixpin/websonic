import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';
import './player-dashboard-view';

/**
 * Dashboard View (Integrated Tablet Contents)
 * Hosts the currently active view (Player, Queues, etc.) 
 * within the equipment frame.
 */
@customElement('dashboard-view')
export class DashboardView extends BaseElement {
  static styles = [
    ...BaseElement.styles,
    css`
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }
  `];

  render() {
    return html`
      <!-- Entry point for the player dashboard -->
      <player-dashboard-view></player-dashboard-view>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dashboard-view': DashboardView;
  }
}
