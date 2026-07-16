import { readdir, readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

type AnalyticsWindow = Window & {
  __gtm_loaded__?: boolean;
  __posthog_initialized__?: boolean;
  dataLayer?: Array<Record<string, unknown>>;
};

const MAPBOX_STYLE_MARKER = 'mapbox://styles/mapbox/standard';
const MAPBOX_CSS_MARKER = '.mapboxgl-map';

async function findSingleAsset(
  extension: '.js' | '.css',
  marker: string
): Promise<string> {
  const assetNames = (await readdir('dist/_astro')).filter((assetName) =>
    assetName.endsWith(extension)
  );
  const matchingAssets: string[] = [];

  for (const assetName of assetNames) {
    const contents = await readFile(`dist/_astro/${assetName}`, 'utf8');

    if (contents.includes(marker)) {
      matchingAssets.push(assetName);
    }
  }

  expect(
    matchingAssets,
    `expected exactly one generated ${extension} asset containing ${marker}`
  ).toHaveLength(1);

  return `/_astro/${matchingAssets[0]}`;
}

function isAnalyticsProvider(requestUrl: URL): boolean {
  const { hostname, pathname } = requestUrl;

  return (
    /(^|\.)googletagmanager\.com$/i.test(hostname) ||
    /(^|\.)google-analytics\.com$/i.test(hostname) ||
    /(^|\.)analytics\.google\.com$/i.test(hostname) ||
    /(^|\.)googleadservices\.com$/i.test(hostname) ||
    /(^|\.)adservice\.google\.com$/i.test(hostname) ||
    /(^|\.)googlesyndication\.com$/i.test(hostname) ||
    /(^|\.)doubleclick\.net$/i.test(hostname) ||
    /(^|\.)posthog\.com$/i.test(hostname) ||
    (/(^|\.)google\.com$/i.test(hostname) && pathname.startsWith('/pagead/'))
  );
}

function isMapboxProvider(hostname: string): boolean {
  return /(^|\.)mapbox\.com$/i.test(hostname);
}

test('loads Mapbox JavaScript and CSS only after an explicit request', async ({
  page,
}) => {
  const mapboxJavaScriptPath = await findSingleAsset(
    '.js',
    MAPBOX_STYLE_MARKER
  );
  const mapboxStylesheetPath = await findSingleAsset('.css', MAPBOX_CSS_MARKER);
  const initialHtml = await readFile('dist/index.html', 'utf8');

  expect(initialHtml).not.toContain(mapboxStylesheetPath);

  let analyticsInterceptionCount = 0;
  let mapboxInterceptionCount = 0;
  let observedMapboxRequestCount = 0;
  const sameOriginRequestPaths = new Set<string>();

  await page.addInitScript(() => {
    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow.__gtm_loaded__ = true;
    analyticsWindow.__posthog_initialized__ = true;
    analyticsWindow.dataLayer = [];
  });

  page.on('request', (request) => {
    const requestUrl = new URL(request.url());

    if (requestUrl.origin === 'http://127.0.0.1:4321') {
      sameOriginRequestPaths.add(requestUrl.pathname);
    }

    if (isMapboxProvider(requestUrl.hostname)) {
      observedMapboxRequestCount += 1;
    }
  });

  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());

    if (isAnalyticsProvider(requestUrl)) {
      analyticsInterceptionCount += 1;
      await route.abort();
      return;
    }

    if (isMapboxProvider(requestUrl.hostname)) {
      mapboxInterceptionCount += 1;
      await route.abort();
      return;
    }

    await route.continue();
  });

  await page.goto('/');

  const loadMapButton = page.getByTestId('map-load-trigger');
  await loadMapButton.scrollIntoViewIfNeeded();
  await expect(loadMapButton).toBeVisible();

  const mapIsland = loadMapButton.locator('xpath=ancestor::astro-island[1]');
  await expect(mapIsland).toHaveCount(1);
  await expect
    .poll(() => mapIsland.getAttribute('ssr'), {
      message: 'map section should be hydrated before requesting Mapbox',
    })
    .toBeNull();

  expect(sameOriginRequestPaths).not.toContain(mapboxJavaScriptPath);
  expect(sameOriginRequestPaths).not.toContain(mapboxStylesheetPath);
  await expect(page.locator('link[data-mapbox-styles="true"]')).toHaveCount(0);
  expect(mapboxInterceptionCount).toBe(0);
  expect(analyticsInterceptionCount).toBe(0);

  await loadMapButton.click();

  await expect
    .poll(() => sameOriginRequestPaths.has(mapboxJavaScriptPath), {
      message: 'Mapbox JavaScript should be requested after the click',
    })
    .toBe(true);
  await expect
    .poll(() => sameOriginRequestPaths.has(mapboxStylesheetPath), {
      message: 'Mapbox CSS should be requested after the click',
    })
    .toBe(true);

  const dynamicStylesheet = page.locator(
    'link[rel="stylesheet"][data-mapbox-styles="true"]'
  );
  await expect(dynamicStylesheet).toHaveCount(1);
  await expect
    .poll(
      () =>
        dynamicStylesheet.evaluate((link) => {
          const stylesheetLink = link as HTMLLinkElement;

          return {
            pathname: new URL(stylesheetLink.href).pathname,
            loaded: stylesheetLink.sheet !== null,
          };
        }),
      { message: 'the singleton Mapbox stylesheet should finish loading' }
    )
    .toEqual({
      pathname: mapboxStylesheetPath,
      loaded: true,
    });

  await expect(loadMapButton).toHaveCount(0);

  const renderedMapOrFallback = page
    .locator('.mapboxgl-map')
    .or(page.getByText('La carte est temporairement indisponible.'))
    .first();
  await expect(renderedMapOrFallback).toBeVisible();

  const renderedMap = page.locator('.mapboxgl-map');
  if ((await renderedMap.count()) > 0) {
    await expect(renderedMap).toHaveCSS('position', 'relative');
    await expect(renderedMap).toHaveCSS('overflow', 'hidden');
  }

  await page.waitForTimeout(250);

  await expect(dynamicStylesheet).toHaveCount(1);
  expect(analyticsInterceptionCount).toBe(0);
  expect(mapboxInterceptionCount).toBe(observedMapboxRequestCount);
});
