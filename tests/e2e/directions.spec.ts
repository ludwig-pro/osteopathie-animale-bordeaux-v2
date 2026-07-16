import { expect, test } from '@playwright/test';
import { BUSINESS_CONFIG } from '../../src/lib/constants/site';

type DirectionsTestCounters = {
  geolocationCalls: number;
  geolocationSpyActive: boolean;
  windowOpenCalls: number;
  windowOpenSpyActive: boolean;
};

declare global {
  interface Window {
    __directionsTestCounters: DirectionsTestCounters;
  }
}

test('directions link works without geolocation or a scripted popup', async ({
  context,
  page,
}) => {
  let googleRequestCount = 0;
  let newPageCount = 0;

  await context.route('https://www.google.fr/maps/dir/**', async (route) => {
    googleRequestCount += 1;
    await route.abort();
  });
  context.on('page', (newPage) => {
    if (newPage !== page) {
      newPageCount += 1;
    }
  });

  await page.addInitScript(() => {
    const counters: DirectionsTestCounters = {
      geolocationCalls: 0,
      geolocationSpyActive: false,
      windowOpenCalls: 0,
      windowOpenSpyActive: false,
    };

    Object.defineProperty(window, '__directionsTestCounters', {
      configurable: true,
      value: counters,
    });

    const geolocationSpy = () => {
      counters.geolocationCalls += 1;
    };
    Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
      configurable: true,
      value: geolocationSpy,
    });
    counters.geolocationSpyActive =
      navigator.geolocation.getCurrentPosition === geolocationSpy;

    const windowOpenSpy = () => {
      counters.windowOpenCalls += 1;
      return null;
    };
    Object.defineProperty(window, 'open', {
      configurable: true,
      value: windowOpenSpy,
    });
    counters.windowOpenSpyActive = window.open === windowOpenSpy;
  });

  await page.goto('/');

  const directionsLink = page.getByRole('link', {
    name: "Obtenir l'itinéraire",
  });
  await directionsLink.scrollIntoViewIfNeeded();

  const mapIsland = directionsLink.locator('xpath=ancestor::astro-island[1]');
  await expect(mapIsland).toHaveCount(1);
  await expect.poll(() => mapIsland.getAttribute('ssr')).toBeNull();

  await expect(directionsLink).toHaveAttribute('target', '_blank');
  await expect(directionsLink).toHaveAttribute('rel', /noopener/);
  await expect(directionsLink).toHaveAttribute('rel', /noreferrer/);

  const href = await directionsLink.getAttribute('href');
  expect(href).not.toBeNull();

  const directionsUrl = new URL(href!);
  expect(directionsUrl.origin).toBe('https://www.google.fr');
  expect(directionsUrl.pathname).toBe('/maps/dir/');
  expect(directionsUrl.searchParams.get('api')).toBe('1');
  expect(directionsUrl.searchParams.get('destination')).toBe(
    `${BUSINESS_CONFIG.geo.latitude},${BUSINESS_CONFIG.geo.longitude}`
  );
  expect(directionsUrl.searchParams.get('travelmode')).toBe('driving');

  const baselineCounters = await page.evaluate(
    () => window.__directionsTestCounters
  );
  expect(baselineCounters.geolocationSpyActive).toBe(true);
  expect(baselineCounters.windowOpenSpyActive).toBe(true);

  await directionsLink.evaluate((link) => {
    link.addEventListener('click', (event) => event.preventDefault(), {
      capture: true,
    });
  });
  await directionsLink.click();
  await page.waitForTimeout(100);

  const finalCounters = await page.evaluate(
    () => window.__directionsTestCounters
  );
  expect(finalCounters.geolocationCalls).toBe(
    baselineCounters.geolocationCalls
  );
  expect(finalCounters.windowOpenCalls).toBe(baselineCounters.windowOpenCalls);
  expect(googleRequestCount).toBe(0);
  expect(newPageCount).toBe(0);
});
