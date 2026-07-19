# Repository Guidelines

## Project Structure & Module Organization

The Astro project keeps application code under `src/`. Page routes live in `src/pages` as `.astro` files, reusable UI stays in `src/components` (mostly React islands), domain utilities in `src/lib`, and browser hooks in `src/lib/hooks`. Images are colocated in `src/images`; store very large binaries outside the repo. Core configuration resides at the root (`astro.config.mjs`, `tailwind.config.js`). Environment-specific secrets go in `.env.*` files consumed via Astro/Vite environment variables.

## Build, Test, and Development Commands

- `yarn install`: install dependencies; run after each pull.
- `yarn dev`: start the Astro dev server on port 4321 with HMR.
- `yarn build`: type-check and generate the static site in `dist/`.
- `yarn preview`: preview the last production build locally.
- `yarn lint`: run ESLint across Astro, JavaScript, and TypeScript source files.
- `yarn test:e2e`: run the complete Playwright suite against a production build.
- `yarn test:e2e tests/e2e/seo.spec.ts`: run the static SEO contract only.
- `yarn format`: apply Prettier to JS, JSX, Markdown, and Astro files before review.

## Coding Style & Naming Conventions

Follow Prettier defaults (2-space indentation, single quotes, trailing commas where valid). React components and file names use PascalCase (`HeroSection.jsx`), hooks start with `use`, utilities use camelCase. Tailwind classes stay ordered layout → spacing → typography for readability. Always run `yarn format` prior to committing.

## Testing Guidelines

Playwright smoke tests live in `tests/e2e`. Before review, run `yarn lint`, `yarn build`, and the relevant Playwright tests. The SEO contract verifies metadata, sitemap/robots, heading landmarks, the 404 response, and critical content without JavaScript. Continue exercising interactive flows such as Calendly and the map across breakpoints, and document manual test notes in pull requests.

## Commit & Pull Request Guidelines

Use short, imperative commit titles (e.g. "Update Hero.jsx"). Keep messages in present tense, ~72 characters max. In PRs, link to the relevant issue/task, explain functional changes, list manual verification steps, and include before/after screenshots for visual updates. Request review once formatting passes and preview builds look correct.

## Deployment Notes

Deployment targets Netlify as a static `dist/` publish; no Astro Netlify adapter is enabled. Configure Mapbox, Sentry, GTM, PostHog, and other secrets in the Netlify dashboard rather than the repository. For remote acceptance, verify that the Deploy Preview was built from the exact commit under review before checking redirects, headers, and the 404 response.
