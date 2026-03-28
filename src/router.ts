import { Routes } from '@lit-labs/router';
import { html, type ReactiveControllerHost } from 'lit';

// Import views so they are registered as custom elements
import './views/dashboard-view';

/**
 * Global Router Configuration
 * Externalized to keep the app shell clean and modular.
 */
export const createRouter = (host: ReactiveControllerHost & HTMLElement) => {
  const router = new Routes(host as any, [
    {
      path: '/',
      render: () => html`<dashboard-view></dashboard-view>`
    },
    {
      path: '*',
      enter: async () => {
        await router.goto('/');
        return true;
      }
    }
  ]);
  return router;
};
