# samai-sdk docs & marketing site

Next.js 16 (App Router) site for samai-sdk: a marketing homepage and a full
documentation section, built to match the SDK's actual shipped features.

## Design

A dark, technical "signal routing" identity — the SDK's core mental model is
a request traveling through swappable stages (guardrail → provider → tool
loop → handoff → guardrail → traced output), so that's the literal signature
element on the homepage: an animated schematic diagram.

- **Palette:** deep slate base (`#0a0d13`), electric blue = signal/data flow
  (dominant accent, `#5c8dff`), amber = guardrail/checkpoint (secondary,
  used sparingly and only in functional contexts).
- **Type:** Space Grotesk (display), Manrope (body), IBM Plex Mono (UI
  labels/eyebrows), JetBrains Mono (code blocks) — self-hosted via
  `@fontsource/*`, not `next/font/google`, so the build has no external
  network dependency on `fonts.googleapis.com`.
- **Motion:** framer-motion for the hero diagram and card reveals, all
  gated behind `useReducedMotion()` / a global `prefers-reduced-motion`
  media query.

## Structure

```
app/
  page.tsx              — homepage
  docs/
    layout.tsx           — sidebar + content shell for all docs pages
    page.tsx              — /docs (Introduction)
    installation/         — /docs/installation
    quick-start/          — /docs/quick-start
    agents/                — /docs/agents
    tools/                  — /docs/tools
    guardrails/             — /docs/guardrails
    structured-output/      — /docs/structured-output
    providers/               — /docs/providers
    reliability/              — /docs/reliability
    cli/                        — /docs/cli
components/              — Nav, Footer, Hero, SignalDiagram (signature
                            animated element), FeatureGrid, CodeBlock
                            (shiki-based), DocsSidebar, DocPage/DocPager/
                            Callout (shared docs primitives)
lib/docs-nav.ts          — single source of truth for the docs sidebar +
                            prev/next pagination
```

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
```

## Build & deploy

```bash
npm run build
npm run start
```

Static-generates cleanly (`○ Static` for every route) — deploys as-is to
Vercel, Netlify, or any Node host. No environment variables required; the
site itself doesn't call any SDK or model API, it only documents it.

## Content source

All docs content is adapted from the `samai-sdk` repo's own `README.md` —
kept in sync manually for now. If the README changes, update the matching
page under `app/docs/*/page.tsx` (each page is plain TSX with a `CodeBlock`
component per snippet, not MDX, so there's no separate compile step).
