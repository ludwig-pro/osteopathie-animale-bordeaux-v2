# Repository Guidelines

## Project Structure & Module Organization
This is a Yarn 1 monorepo. The Astro workspace is `apps/website/`; all site paths below are relative to that workspace. Run installation and root convenience commands from the repository root. The Astro project keeps application code under `src/`. Page routes live in `src/pages` as `.astro` files, reusable UI stays in `src/components` (mostly React islands), domain utilities in `src/lib`, and browser hooks in `src/hooks`. Images are colocated in `src/images`; store very large binaries outside the repo. Astro configuration resides in `astro.config.mjs`; Tailwind 4 uses the Vite plugin and `src/styles/global.css`. Environment-specific secrets go in `.env.*` files consumed via Astro/Vite environment variables.

## Build, Test, and Development Commands
- `yarn install`: install dependencies; run after each pull.
- `yarn dev`: start the Astro dev server on port 4321 with HMR.
- `yarn build`: typecheck and generate the static site for Netlify (no adapter).
- `yarn preview`: preview the last production build locally.
- `yarn format`: apply Prettier to JS, JSX, Markdown, and Astro files before review.

## Coding Style & Naming Conventions
Follow Prettier defaults (2-space indentation, single quotes, trailing commas where valid). React components and file names use PascalCase (`HeroSection.jsx`), hooks start with `use`, utilities use camelCase. Tailwind classes stay ordered layout → spacing → typography for readability. Always run `yarn format` prior to committing.

## Testing Guidelines
Run `yarn check:static`, `yarn test:unit`, and `yarn test:e2e` to validate changes. Also exercise interactive flows (booking, animal selection, map and cookie preferences) across breakpoints, and check Lighthouse locally when relevant. Document manual test notes in pull requests.

## Commit & Pull Request Guidelines
Use short, imperative commit titles (e.g. "Update Hero.jsx"). Keep messages in present tense, ~72 characters max. In PRs, link to the relevant issue/task, explain functional changes, list manual verification steps, and include before/after screenshots for visual updates. Request review once formatting passes and preview builds look correct.

## Deployment Notes
The website is statically deployed to Netlify; root `netlify.toml` defines the workspace build and publish paths. Configure Mapbox, GTM, and other secrets in the Netlify dashboard rather than the repository. After merging to `main`, trigger a Netlify deploy preview to verify headers and offline behaviour.

## Contacts synchronization
The TypeScript Worker lives in `apps/contacts-sync/`. Read `docs/calendly-google-contacts.md` before operations. Run `yarn workspace @osteo/contacts-sync run check`, `test`, and `build`. Tests use fictitious data, mocked upstreams and local SQLite/D1. Never use production credentials in tests, logs, PRs or previews. Deployments and live imports are explicit operator actions. Keep the service paused until the operator completes the simulation and pilot.
