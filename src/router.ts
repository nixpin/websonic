import { Routes } from '@lit-labs/router';
import { html } from 'lit';
import type { ReactiveControllerHost } from 'lit';

// Registration of layout and view components
import './views/auth-view.js';
import './views/dashboard-view.js';

// Explicitly import for type/reference if needed, also triggers registration
import { AuthView } from './views/auth-view.js';
import { DashboardView } from './views/dashboard-view.js';

// Ensure the compiler sees these as used while they handle component registration
[AuthView, DashboardView];

/**
 * Global Router Factory
 * Defines the main application navigation routes.
 */
export function createRouter(host: ReactiveControllerHost & HTMLElement) {
  return new Routes(host, [
    {
      path: '/',
      render: () => html`<dashboard-view></dashboard-view>`
    },
    {
      path: '/login',
      render: () => html`<auth-view></auth-view>`
    },
    {
      path: '*',
      render: () => html`<dashboard-view></dashboard-view>`
    }
  ]);
}
