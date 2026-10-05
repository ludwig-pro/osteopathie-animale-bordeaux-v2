import { readdir, readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

async function findAsset(extension: '.js' | '.css', marker: string) {
  const names = (await readdir('dist/_astro')).filter((name) =>
    name.endsWith(extension)
  );
  const matches = [];
  for (const name of names) {
    if ((await readFile(`dist/_astro/${name}`, 'utf8')).includes(marker))
      matches.push(name);
  }
  expect(matches).toHaveLength(1);
  return `/_astro/${matches[0]}`;
}

const getAssets = async () => ({
  js: await findAsset('.js', 'Unable to load the interactive map stylesheet'),
  css: await findAsset('.css', '.leaflet-pane'),
});

for (const activation of ['click', 'hover', 'keyboard'] as const) {
  test(`keeps the static map until interactive tiles are ready on ${activation}`, async ({
    page,
  }) => {
    const assets = await getAssets();
    const requests = new Set<string>();
    page.on('request', (request) =>
      requests.add(new URL(request.url()).pathname)
    );
    // A local fixture stands in for network tiles; no paid API or real analytics.
    const tile = await readFile('public/images/icon.png');
    await page.route(
      /https:\/\/(tile\.openstreetmap\.org|api\.mapbox\.com)\//,
      (route) => route.fulfill({ body: tile, contentType: 'image/png' })
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Tout refuser' }).click();
    await page.locator('#cc-main .cm').waitFor({ state: 'hidden' });
    const trigger = page.getByTestId('map-load-trigger');
    await trigger.scrollIntoViewIfNeeded();
    await expect(
      trigger.locator('xpath=ancestor::astro-island[1]')
    ).not.toHaveAttribute('ssr');
    const panel = page.locator('.map-panel');
    await expect(panel).toHaveAttribute('data-map-provider', 'mapbox');
    const staticMap = page.locator('.map-static');
    await expect(staticMap.locator('img').first()).toBeVisible();
    expect(requests.has(assets.js)).toBe(false);
    expect(requests.has(assets.css)).toBe(false);
    await expect(panel).toHaveAttribute('data-interactive', 'false');
    await expect(page.locator('.map-interactive')).toHaveCSS('opacity', '0');
    await expect(page.locator('.map-interactive')).toHaveAttribute('inert', '');

    // Pause the lazy module: the existing static view must remain visible.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**${assets.js}`, async (route) => {
      await gate;
      await route.continue();
    });
    if (activation === 'hover') await panel.hover();
    else if (activation === 'keyboard') {
      await trigger.focus();
      await page.keyboard.press('Enter');
    } else await trigger.click();
    await expect.poll(() => requests.has(assets.js)).toBe(true);
    await expect(panel).toHaveAttribute('data-interactive', 'false');
    await expect(staticMap).toBeVisible();
    release();
    await expect(panel).toHaveAttribute('data-interactive', 'true');
    await expect(page.locator('.map-interactive')).toHaveCSS('opacity', '1');
    await expect(page.locator('.map-interactive')).not.toHaveAttribute('inert');
    await expect(trigger).toHaveCount(0);
    expect(requests.has(assets.css)).toBe(true);
    await expect(page.locator('link[data-map-styles="true"]')).toHaveCount(1);
    if (activation === 'keyboard')
      await expect(page.locator('.cabinet-live-map')).toBeFocused();

    const staticMarker = await staticMap
      .locator('.cabinet-map-marker')
      .boundingBox();
    const interactiveMarker = await page
      .locator('.cabinet-live-map .cabinet-map-marker')
      .boundingBox();
    expect(staticMarker).not.toBeNull();
    expect(interactiveMarker).not.toBeNull();
    expect(
      Math.abs(staticMarker!.x - interactiveMarker!.x)
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(staticMarker!.y - interactiveMarker!.y)
    ).toBeLessThanOrEqual(1);
    // Tiles are positioned from the same pixel origin, not an approximate drawing.
    const staticTile = staticMap.locator('img').first();
    const src = await staticTile.getAttribute('src');
    const liveTile = page.locator('.leaflet-tile').filter({ visible: true });
    const staticBounds = await staticTile.boundingBox();
    const matchingLiveBounds = await liveTile.evaluateAll((images, url) => {
      const image = images.find(
        (element) => (element as HTMLImageElement).src === url
      );
      if (!image) return null;
      const rect = image.getBoundingClientRect();
      return { x: rect.x, y: rect.y };
    }, src);
    expect(matchingLiveBounds).not.toBeNull();
    expect(
      Math.abs(staticBounds!.x - matchingLiveBounds!.x)
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(staticBounds!.y - matchingLiveBounds!.y)
    ).toBeLessThanOrEqual(1);
    await panel.hover();
    await expect(page.locator('link[data-map-styles="true"]')).toHaveCount(1);
  });
}

test('preserves the static view and directions when interactive loading fails', async ({
  page,
}) => {
  const assets = await getAssets();
  const tile = await readFile('public/images/icon.png');
  await page.route(
    /https:\/\/(tile\.openstreetmap\.org|api\.mapbox\.com)\//,
    (route) => route.fulfill({ body: tile, contentType: 'image/png' })
  );
  await page.route(`**${assets.css}`, (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Tout refuser' }).click();
  await page.locator('#cc-main .cm').waitFor({ state: 'hidden' });
  const trigger = page.getByTestId('map-load-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await expect(
    trigger.locator('xpath=ancestor::astro-island[1]')
  ).not.toHaveAttribute('ssr');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('La carte est temporairement indisponible.')
  ).toBeVisible();
  await expect(page.locator('.map-static')).toBeVisible();
  await expect(page.locator('.map-panel')).toHaveAttribute(
    'data-interactive',
    'false'
  );
  await expect(
    page.getByRole('link', { name: "Obtenir l'itinéraire" })
  ).toBeVisible();
});

test('does not animate map activation when reduced motion is requested', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.map-interactive')).toHaveCSS(
    'transition-property',
    'none'
  );
});

test('keeps the mobile preview static during scrolling and activates it on tap', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL: baseURL ?? 'http://127.0.0.1:4321',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    const assets = await getAssets();
    const requests = new Set<string>();
    page.on('request', (request) =>
      requests.add(new URL(request.url()).pathname)
    );
    const tile = await readFile('public/images/icon.png');
    await page.route(
      /https:\/\/(tile\.openstreetmap\.org|api\.mapbox\.com)\//,
      (route) => route.fulfill({ body: tile, contentType: 'image/png' })
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Tout refuser' }).tap();
    await page.locator('#cc-main .cm').waitFor({ state: 'hidden' });
    const trigger = page.getByTestId('map-load-trigger');
    await trigger.scrollIntoViewIfNeeded();
    await expect(
      trigger.locator('xpath=ancestor::astro-island[1]')
    ).not.toHaveAttribute('ssr');
    await page
      .locator('.map-panel')
      .dispatchEvent('pointerenter', { pointerType: 'touch' });
    expect(requests.has(assets.js)).toBe(false);
    await page.locator('.map-static').tap({ position: { x: 40, y: 40 } });
    await expect(page.locator('.map-panel')).toHaveAttribute(
      'data-interactive',
      'true'
    );
    await expect(page.locator('.map-interactive')).toHaveCSS('opacity', '1');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      )
    ).toBe(false);
  } finally {
    await context.close();
  }
});
