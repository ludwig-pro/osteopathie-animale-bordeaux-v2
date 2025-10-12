# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based showcase website for Agathe Lescout, an animal osteopath serving Bordeaux and Gironde. The site uses Astro for the main framework with React components (via `client:only="react"`) and Tailwind CSS for styling.

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
```

## Architecture

### Astro + React Hybrid

The site follows Astro's architecture where:
- `.astro` files define pages and layouts (`src/pages/`, `src/layouts/`)
- React components (`.tsx`) are used for interactive sections via `client:only="react"` directive
- All React components are client-side only (no SSR for React components)

### Page Structure

The main page (`src/pages/index.astro`) is composed of multiple section components imported and rendered in order:
1. Hero
2. AnimalSection (with animal selection menu)
3. Consultations
4. CarteCabinet (map)
5. QuandConsulter
6. Prix
7. DeroulementConsultation
8. OsteopathieAnimale
9. QuiSuisJe
10. Contact (with ReCAPTCHA)
11. Footer

Each section is a self-contained React component in `src/components/sections/`.

### Component Organization

```
src/components/
├── common/
│   ├── icons/          # Custom SVG icon components
│   ├── Banner/         # Banner component
│   └── ResponsiveImage.tsx
├── contact/
│   ├── Contact.tsx     # Contact form with ReCAPTCHA
│   ├── ContactModal.tsx
│   └── MapBox.tsx      # Mapbox integration
├── layout/
│   └── Footer.tsx
├── pages/
│   └── Home.tsx        # (Legacy, check if still used)
└── sections/
    ├── AnimalSection/  # Complex section with select menus
    │   ├── AnimalSection.tsx
    │   ├── Section.tsx
    │   ├── NewAriaSelectMenu.tsx  # Mobile menu
    │   ├── AriaSelectMenuWeb.tsx  # Desktop menu
    │   └── configutation.ts       # Animal data config
    └── [Various section components]
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

Required variables (see `.env`):
- `PUBLIC_RECAPTCHA_KEY` - Google ReCAPTCHA v3 for contact form
- `PUBLIC_MAPBOX_TOKEN` - Mapbox GL JS for map display
- `PUBLIC_GTM_ID` - Google Tag Manager (already set to GTM-KCM49LQ)

All public env vars are prefixed with `PUBLIC_` per Astro conventions.

### External Services

1. **Mapbox GL JS** (v2.8.1) - Used in `CarteCabinet` component
   - CSS loaded in `BaseLayout.astro` head
2. **Google ReCAPTCHA v3** - Used in `Contact` component
   - Integrated via `react-google-recaptcha-v3`
3. **Google Tag Manager** - Inline script in `BaseLayout.astro`
4. **React Calendly** - Appointment booking integration

## Key Technical Details

### React Aria

The project uses React Aria for accessible UI components:
- `AnimalSection` has two select menu implementations (mobile/desktop)
- Extensive use of `@react-aria/*` and `@react-stately/*` packages

### Client-Side Hydration

All React components use `client:only="react"` directive, meaning:
- No server-side rendering for React components
- Components only render in the browser
- Ensure browser-specific code doesn't break during build

### Hooks

Custom hooks in `src/hooks/`:
- `useHasMounted.js` - Handles hydration and mount state

## Deployment

Target platform: **Netlify** (static output)
- `output: 'static'` in `astro.config.mjs`
- Adapter previously used but removed for static mode
- Set environment variables in Netlify dashboard before deploying
