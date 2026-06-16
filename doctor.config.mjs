// React Doctor configuration — https://react.doctor/docs
//
// Keep the audit focused on first-party source. Skip the Next.js build output
// (`.next/`) and the original static HTML/CSS/JS prototype (`template/`); both
// are gitignored generated/vendored assets, not code we ship from source, and
// scanning them only surfaces noise (e.g. "secret leak" hits inside bundled
// Supabase library sourcemaps).
//
// Written as .mjs (mirroring eslint.config.mjs) so it stays out of the
// TypeScript `include` globs and does not require react-doctor as a dependency.
//
// Suppressions below are documented, deliberate decisions: each entry is a
// genuine false-positive, by-design behavior, or pure-style preference — not a
// silenced real bug. Rule keys are fully qualified ("<plugin>/<rule>") because
// the matcher compares against `${plugin}/${rule}`; a bare rule name does not
// match. Per-file globs are paren-free ('**/Name.tsx') on purpose: route-group
// parens like (admin) are parsed as extglob groups by picomatch, so they would
// silently fail to match the actual route-group file paths.
const config = {
  ignore: {
    files: [".next/**", "template/**", "doctor.config.mjs"],
    // Project-wide suppressions. These rules flag intentional patterns that
    // recur across the codebase, so silencing them per-file would be noise.
    rules: [
      // Initializing editable form state from props is intentional throughout:
      // edit rows are remounted per id, and settings forms are deliberate
      // snapshots the admin then edits. Not a derived-state bug.
      "react-doctor/no-derived-useState",
      // Multiple related useState calls are intentional and readable; React
      // batches updates within handlers, so this is a style preference.
      // Converting the checkout/admin forms to useReducer would add risk
      // without benefit.
      "react-doctor/prefer-useReducer",
      // These are cohesive form components (checkout, product, settings); their
      // length reflects inherent form complexity. Splitting them would scatter
      // tightly-coupled state and add prop-threading bug surface.
      "react-doctor/no-giant-component",
    ],
    overrides: [
      // By design for a public storefront + single-admin model: anon may read
      // only active catalog rows / public site assets. Admin write policies are
      // documented in the migrations.
      {
        files: ["supabase/migrations/**"],
        rules: ["react-doctor/supabase-rls-policy-risk"],
      },
      // The mount effect deliberately reads the server-trusted order summary
      // from sessionStorage (hydration-safe external read, unavailable during
      // SSR). Documented in code.
      {
        files: ["**/WhatsAppHandoff.tsx"],
        rules: ["react-doctor/no-event-handler", "react-doctor/no-derived-state"],
      },
      // Deliberate raw <img> previews of arbitrary admin-supplied image URLs
      // with onError fallbacks; next/image cannot allowlist arbitrary hosts.
      // Documented + eslint-disabled in code.
      {
        files: ["**/BrandingManager.tsx", "**/ProductForm.tsx"],
        rules: ["react-doctor/nextjs-no-img-element"],
      },
      // schema.org JSON-LD injected via dangerouslySetInnerHTML from
      // server-built objects (JSON.stringify) — the standard, safe Next.js
      // structured-data idiom; no user HTML.
      {
        files: ["**/seo/**"],
        rules: ["react-doctor/no-danger"],
      },
      // global-error renders its own html/body when the root layout (and its
      // CSS/Tailwind) is unavailable, so inline styles are required.
      {
        files: ["**/global-error.tsx"],
        rules: ["react-doctor/no-inline-exhaustive-style"],
      },
      // Already an accessible custom modal (focus trap, Escape, scroll lock,
      // aria-modal); migrating to native <dialog> is a separate
      // behavior-sensitive effort.
      {
        files: ["**/CartDrawer.tsx"],
        rules: ["react-doctor/prefer-html-dialog"],
      },
      // Decorative hero glow tuned to match the design prototype
      // (design/PolarUIPrototype.png); the blur radius is intentional visual
      // design.
      {
        files: ["**/Hero.tsx"],
        rules: ["react-doctor/no-large-animated-blur"],
      },
      // Inputs are labeled via the in-file Field wrapper's htmlFor/id (the rule
      // cannot follow the cross-component association).
      {
        files: ["**/CheckoutForm.tsx"],
        rules: ["react-doctor/control-has-associated-label"],
      },
      // slug-touched flags are intentionally useState to match surrounding form
      // state; a ref would be a negligible micro-optimization.
      {
        files: ["**/CategoriesManager.tsx", "**/ProductForm.tsx"],
        rules: ["react-doctor/rerender-state-only-in-handlers"],
      },
    ],
  },
};

export default config;
