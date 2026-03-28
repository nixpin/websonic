---
name: lit-architecture
description: Best practices for building scalable Web Components with Lit. Includes component patterns, Reactive Controllers, state management, and Tailwind v4 integration.
---

# Lit Architecture Best Practices

This skill defines the architectural standards for building maintainable and high-performance Web Components using the Lit library.

## When to Use This Skill

- Creating new custom elements or views.
- Refactoring complex components.
- Implementing cross-cutting concerns (fetching, timers, form handling).
- Defining global state management patterns.

## 1. Class-Based Component Structure

Always use decorators (`@customElement`, `@property`, `@state`) for clarity and minimal boilerplate.

```typescript
import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseElement } from '../elements/base-element';

@customElement('my-component')
export class MyComponent extends BaseElement {
  @property({ type: String }) title = '';
  @state() private _count = 0;

  render() {
    return html`
      <div class="p-4 bg-stone-900 rounded-xl">
        <h2 class="text-xl font-bold">${this.title}</h2>
        <button 
          class="mt-2 px-4 py-2 bg-amber-500 rounded-lg"
          @click=${() => this._count++}
        >
          Count: ${this._count}
        </button>
      </div>
    `;
  }
}
```

## 2. Shared Base Logic (`BaseElement`)

Centralize common logic in a `BaseElement`.
- **Render Root**: Use `createRenderRoot() { return this; }` if you need Tailwind v4 to easily apply styles to the elements (Light DOM) or use proper Shadow DOM with adopted stylesheets.
- **Global Styles**: Inject global tokens via a shared stylesheet or CSS variables.

## 3. Reactive Controllers

Use Reactive Controllers to encapsulate and reuse logic that needs to hook into the component lifecycle (e.g., API calls, subscriptions).

```typescript
// services/api-controller.ts
export class ApiController implements ReactiveController {
  host: ReactiveControllerHost;
  @state() data = null;

  constructor(host: ReactiveControllerHost, private endpoint: string) {
    (this.host = host).addController(this);
  }

  async hostConnected() {
    const response = await fetch(this.endpoint);
    this.data = await response.json();
    this.host.requestUpdate();
  }
}

// Usage in component
private _api = new ApiController(this, '/api/data');
```

## 4. State Management Patterns

- **Props up, Events down**: For simple parent-child communication.
- **Context API (@lit-labs/context)**: For global or subtree state (theme, user, config).
- **External Services**: Singleton services with custom events or Reactive Controllers.

## 5. Optimized Rendering

- **Directive `repeat()`**: Always use for lists to ensure efficient DOM updates.
- **Directive `when()`**: Clearer conditional rendering.
- **Guard and Cache**: Minimize expensive computations.

```typescript
import { repeat } from 'lit/directives/repeat.js';
import { when } from 'lit/directives/when.js';

render() {
  return html`
    ${when(this.items.length > 0, 
      () => html`
        <ul class="space-y-2">
          ${repeat(this.items, (i) => i.id, (i) => html`<li>${i.name}</li>`)}
        </ul>
      `,
      () => html`<p>No items found.</p>`
    )}
  `;
}
```

## 6. Tailwind v4 Integration

- **Standardize Utilities**: Use `@utility` for common UI patterns.
- **Dynamic Classes**: Use `classMap` for state-dependent styling.

```typescript
import { classMap } from 'lit/directives/class-map.js';

render() {
  const classes = { 'opacity-50': this.disabled, 'scale-110': this.active };
  return html`<div class="${classMap(classes)}">Content</div>`;
}
```

## 7. Performance Checklist

- [ ] Use `@state` only for internal UI state.
- [ ] Use `@property` for public API.
- [ ] Avoid complex logic inside `render()`.
- [ ] Debounce resize/scroll listeners if not handled by CSS.
- [ ] Use `firstUpdated()` for one-time setup that requires DOM access.
