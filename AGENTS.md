# Repository Guidelines

## Project Structure & Module Organization
The Astro project keeps application code under `src/`. Page routes live in `src/pages` as `.astro` files, reusable UI stays in `src/components` (mostly React islands), domain utilities in `src/lib`, and browser hooks in `src/hooks`. Images are colocated in `src/images`; store very large binaries outside the repo. Core configuration resides at the root (`astro.config.mjs`, `tailwind.config.js`). Environment-specific secrets go in `.env.*` files consumed via Astro/Vite environment variables.

## Build, Test, and Development Commands
- `yarn install`: install dependencies; run after each pull.
- `yarn dev`: start the Astro dev server on port 4321 with HMR.
- `yarn build`: generate the static site (Netlify adapter enabled).
- `yarn preview`: preview the last production build locally.
- `yarn format`: apply Prettier to JS, JSX, Markdown, and Astro files before review.

## Coding Style & Naming Conventions
Follow Prettier defaults (2-space indentation, single quotes, trailing commas where valid). React components and file names use PascalCase (`HeroSection.jsx`), hooks start with `use`, utilities use camelCase. Tailwind classes stay ordered layout → spacing → typography for readability. Always run `yarn format` prior to committing.

## Testing Guidelines
Automated tests are not configured yet. For now, validate changes by running `yarn dev`, exercising interactive flows (Calendly modal, map) across breakpoints, and checking Lighthouse locally. Document manual test notes in pull requests.

## Commit & Pull Request Guidelines
Use short, imperative commit titles (e.g. "Update Hero.jsx"). Keep messages in present tense, ~72 characters max. In PRs, link to the relevant issue/task, explain functional changes, list manual verification steps, and include before/after screenshots for visual updates. Request review once formatting passes and preview builds look correct.

## Deployment Notes
Deployment targets Netlify via `@astrojs/netlify`. Configure Mapbox, ReCAPTCHA, GTM, and other secrets in the Netlify dashboard rather than the repository. After merging to `main`, trigger a Netlify deploy preview to verify headers and offline behaviour.
