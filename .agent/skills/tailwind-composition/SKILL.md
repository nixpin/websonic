---
name: tailwind-composition
description: Rules and patterns for composing and reusing Tailwind CSS classes using @apply, @utility, and component-based abstraction.
---

# Tailwind Composition Patterns

This skill provides strategies for managing repetitive Tailwind CSS classes, specifically focused on Tailwind v4 and Lit-based projects.

## When to Use This Skill

- When you find yourself repeating the same 10+ classes across multiple elements.
- When you want to create a "Design System" layer on top of Tailwind utilities.
- When building reusable UI components (buttons, cards, inputs).

## 1. Using `@utility` (Recommended for Tailwind v4)

In Tailwind v4, use the `@utility` directive in your CSS to create custom, reusable utility classes. This is the cleanest way to define shared styles.

```css
/* src/style/theme.css */
@utility premium-card {
  @apply p-8 rounded-[2rem] border border-[var(--color-border-premium)];
  @apply bg-[var(--color-surface-glass)] backdrop-blur-2xl;
  @apply shadow-2xl transition-all duration-500 hover:border-[var(--color-border-strong)];
}

@utility btn-primary {
  @apply px-6 py-3 rounded-full font-bold transition-all duration-300;
  @apply bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)];
  @apply hover:scale-105 active:scale-95 text-white;
}
```

## 2. Using `@apply` in Custom Classes

Use `@apply` inside standard CSS classes when you need complex selectors or nested rules that aren't easily expressed as utilities.

```css
.nav-link {
  @apply text-[var(--color-text-dim)] transition-colors duration-200;
  
  &:hover {
    @apply text-[var(--color-text-base)];
  }
  
  &.active {
    @apply text-[var(--color-accent-primary)] font-bold;
  }
}
```

## 3. Template-Level Composition (Lit/JS)

For logic-heavy composition, share class strings in your TypeScript/JavaScript files.

```typescript
// Shared styles constants
export const styles = {
  glass: "bg-white/10 backdrop-blur-lg border border-white/20",
  interactive: "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
  heading: "text-4xl font-black italic tracking-tighter uppercase"
};

// Usage in Lit
render() {
  return html`
    <div class="${styles.glass} ${styles.interactive}">
      <h1 class="${styles.heading}">Sonic</h1>
    </div>
  `;
}
```

## 4. Best Practices

- **Don't Over-Abstract**: Only create utilities/classes for elements that are used in 3+ places.
- **Stay "Atomic" First**: Use raw Tailwind classes for one-off layouts.
- **Semantic Naming**: Name your utilities by *what they are* (`btn-primary`, `input-field`) rather than *how they look* (`blue-rounded-button`).
- **Use CSS Variables**: Compose utilities using the design tokens defined in `:root` to maintain consistency.

## Example: Premium Card Composition

```css
@utility sonic-card {
  @apply relative overflow-hidden rounded-3xl p-6;
  @apply bg-stone-900/50 border border-white/5;
  @apply hover:border-white/10 hover:bg-stone-900/60 transition-all duration-500;
}

@utility sonic-card-glow {
  @apply sonic-card;
  &::before {
    content: '';
    @apply absolute inset-0 opacity-0 transition-opacity duration-500;
    background: radial-gradient(circle at center, var(--color-accent-primary) 0%, transparent 70%);
  }
  &:hover::before {
    @apply opacity-10;
  }
}
```
