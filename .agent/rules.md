# Project Rules: WebSonic

These rules are mandatory for all AI agents working on the WebSonic codebase.

## 1. Language Standards
- **English First**: All code comments, documentation, and UI-facing text must be in English.
- **Commit Messages**: Use English for all commit messages.

## 2. Architectural Guidelines
- **Lit & Web Components**: Follow the standard Lit patterns as defined in `lit-architecture` skill.
- **Context API**: Prefer `@lit-labs/context` for shared state (e.g., SubsonicClient).
- **Layout Consistency**: Use `<websonic-shell>` for top-level layout management.

## 3. Styling Standards
- **Tailwind v4**: Use `@utility` and atomic classes for styling.
- **Theme Tokens**: Always prefer `var(--color-*)` or `var(--spacing-*)` from `theme.css` over arbitrary values.
- **Z-Index**: Use the tokenized z-index system (`var(--z-index-*)`).

## 4. Code Quality
- **TypeScript**: Strict typing is required. Avoid `any` at all costs.
- **Reactive State**: Use Reactive Controllers to encapsulate complex non-UI logic.
