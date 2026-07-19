# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based showcase website for Agathe Lescout, an animal osteopath serving Bordeaux and Gironde. Astro pre-renders the HTML in static mode; React islands add interactivity through selective `client:load` and `client:visible` hydration. Tailwind CSS provides styling.

## Development Commands

**Package Manager:** This project uses `yarn` (v1.22.22). Do not use npm.

```bash
# Install dependencies
yarn install

# Development server (with HMR)
yarn dev
# Server runs on http://localhost:4321

# Build for production (runs type checking first)
yarn build

# Preview production build locally
yarn preview

# Code quality
yarn format          # Format with Prettier
yarn lint            # Run ESLint
yarn lint:fix        # Auto-fix ESLint issues

# Browser contracts against the production build
yarn test:e2e
yarn test:e2e tests/e2e/seo.spec.ts
```

## Architecture

### Astro + React Hybrid

The site follows Astro's architecture where:

- `.astro` files define pages and layouts (`src/pages/`, `src/layouts/`)
- React components (`.tsx`) are pre-rendered into the static HTML and selectively hydrated with Astro client directives
- Indexable copy and landmarks must remain available in the generated HTML when JavaScript is disabled

### Page Structure

The main page (`src/pages/index.astro`) is composed of multiple section components imported and rendered in order:

1. Hero
2. AnimalSection (with animal selection menu)
3. CarteCabinet (map)
4. QuandConsulter
5. Prix
6. DeroulementConsultation
7. OsteopathieAnimale
8. QuiSuisJe
9. Contact (Netlify Forms)
10. Footer

Landing-page sections live under `src/components/landing-page/`; Astro wrappers for image processing and hydration boundaries live under `src/layouts/wrappers/`.

### Component Organization

```
src/components/
├── common/
│   ├── icons/          # Custom SVG icon components
│   └── Banner/         # Banner component
├── landing-page/
│   ├── animals/        # Animal content and accessible selectors
│   ├── contact/        # Contact UI and Netlify form
│   ├── hero/           # Navigation and primary heading
│   ├── map/            # Mapbox integration
│   └── [other sections]
├── layout/
│   └── Footer.tsx
```

### TypeScript Configuration

The project uses **strict TypeScript settings** (`tsconfig.json` extends `astro/tsconfigs/strict`):

- `@typescript-eslint/no-explicit-any` is set to `error` - **never use `any` type**
- All strict compiler options are enabled
- Path alias: `@/*` maps to `src/*`
- JSX configured for React (`react-jsx`, `jsxImportSource: "react"`)

### ESLint Configuration

Uses flat config format (`eslint.config.js`):

- Separate rules for `.ts/.tsx` and `.astro` files
- Strict TypeScript rules enforced
- No explicit function return types required (disabled for React)
- Unused vars pattern: prefix with `_` to ignore

### Styling

**Tailwind CSS** with custom theme extensions:

- Custom color palette: `gold-*` (50-1000), `canard`, `canard-light`
- Forms plugin enabled (`@tailwindcss/forms`)
- Background images configured in `tailwind.config.js`

## Third-Party Integrations

### Environment Variables

Relevant variables (see `.env` and `astro.config.mjs`):

- `PUBLIC_MAPBOX_TOKEN` - Mapbox GL JS for map display
- `PUBLIC_GTM_ID` - Google Tag Manager
- `PUBLIC_POSTHOG_KEY` / `PUBLIC_POSTHOG_HOST` - PostHog analytics
- `PUBLIC_SENTRY_DSN` - Sentry browser monitoring

All public env vars are prefixed with `PUBLIC_` per Astro conventions.

### External Services

1. **Mapbox GL JS** - Used in `CarteCabinet`
   - CSS loaded in `BaseLayout.astro` head
2. **Netlify Forms** - Contact form transport and honeypot handling
3. **Google Tag Manager / PostHog** - Deferred analytics bootstrapped in `BaseLayout.astro`
4. **Sentry** - Optional client monitoring configured in `astro.config.mjs`
5. **React Calendly** - Appointment booking integration

## Key Technical Details

### React Aria

The project uses React Aria for accessible UI components:

- `AnimalSection` has two select menu implementations (mobile/desktop)
- Extensive use of `@react-aria/*` and `@react-stately/*` packages

### Client-Side Hydration

React islands are rendered into the static build before their client-side hydration runs. Use `client:load` only for immediately interactive islands and `client:visible` for deferred hydration. Browser-only code must remain guarded, and critical SEO content must not depend on hydration.

### Hooks

Custom hooks live in `src/lib/hooks/`, including `useHasMounted.ts` for hydration-aware behavior.

## Deployment

Target platform: **Netlify** (static output)

- `output: 'static'` in `astro.config.mjs`
- `@astrojs/sitemap` emits the production sitemap index during the build
- `BaseLayout.astro` derives per-route canonical metadata from `Astro.site`
- No Astro Netlify adapter is enabled; Netlify publishes `dist/`
- Set environment variables in Netlify dashboard before deploying
- Validate remote redirects and 404 behavior only on a Deploy Preview built from the exact commit under review
