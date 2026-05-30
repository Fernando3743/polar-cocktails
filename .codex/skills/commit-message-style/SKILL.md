---
name: commit-message-style
description: Use this when writing, rewriting, reviewing, or proposing git commit messages for the Polar repository so they match the existing commit-message style.
---

# Polar Commit Message Style

Use this style for commit messages in this repository.

## Source Pattern

Base the style on the substantive local history:

```text
feat(storefront): wire real cocktail photos and polish UI to match design
feat: build Polar granizado storefront, ordering backend and admin
```

Treat `Initial commit from Create Next App` as a generated bootstrap exception, not the house style.

## Subject

- Use Conventional Commits: `type(scope): summary` when a scope is clear, or `type: summary` for broad changes.
- Prefer `feat` for user-facing product work; use standard types like `fix`, `chore`, `docs`, `refactor`, or `test` only when they fit better.
- Scope is short and concrete, such as `storefront`, `admin`, `checkout`, `supabase`, or `menu`.
- Write the summary in lowercase imperative form: `wire`, `build`, `polish`, `fix`, `add`, `replace`.
- Keep the subject direct and specific. Do not end it with a period.

## Body

For small commits, a subject line is enough.

For larger commits, add a blank line and then a concrete body:

- Start with a one-sentence or short paragraph summary only when it adds useful context.
- Use `- ` bullets for the details.
- Begin bullets with the affected area when helpful: `Hero:`, `Storefront:`, `Auth-gated admin:`, `Supabase:`, `Docs:`, `a11y:`.
- Mention exact files, routes, components, config, classes, tokens, or APIs when that makes the change easier to review.
- Include implementation-relevant rationale, not generic praise or marketing copy.
- Group related changes in the same bullet rather than listing every file mechanically.

## Tone

- Concrete, technical, and compact.
- Product names and domain language are welcome when they clarify the change, for example `Polar`, `granizado`, `Sabores`, or `Supabase`.
- Avoid vague summaries like `update files`, `misc fixes`, or `improve UI`.
- Do not add generated-by or co-author trailers unless the user explicitly requests them or the commit process requires them.

## Example

```text
feat(storefront): polish menu imagery and checkout states

- Menu: wire transparent product photos through ProductCard and seed data
- Checkout: recompute totals server-side and show confirmation state after submit
- a11y: add distinct labels for icon-only footer and cart controls
- config: allow Supabase image hosts in next.config for optimized DB photos
```
