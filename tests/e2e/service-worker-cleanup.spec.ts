import { expect, test } from '@playwright/test';

test.describe('Legacy service worker cleanup', () => {
  for (const workerPath of ['/sw.js', '/service-worker.js']) {
    test(`serves ${workerPath} as a standalone cleanup worker`, async ({
      request,
    }) => {
      const response = await request.get(workerPath);
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toMatch(/javascript/);

      const body = await response.text();
      expect(body).toContain('self.registration.unregister()');
      expect(body).toContain('caches.keys()');
      expect(body).not.toContain('importScripts');
    });

    test(`unregisters and clears caches from ${workerPath}`, async ({
      page,
    }) => {
      const cacheName = `legacy-cleanup-${workerPath.replace(/\W+/g, '-')}`;

      await page.goto('/');
      await page.evaluate(async (name) => {
        await caches.open(name);
      }, cacheName);

      try {
        await page.evaluate(async (path) => {
          await navigator.serviceWorker.register(path);
          return true;
        }, workerPath);
      } catch (error) {
        if (!String(error).includes('Execution context was destroyed')) {
          throw error;
        }
      }

      await page.waitForLoadState('domcontentloaded');

      await expect
        .poll(
          async () => {
            try {
              return await page.evaluate(async () => {
                const registrations =
                  await navigator.serviceWorker.getRegistrations();
                return registrations.length;
              });
            } catch (error) {
              if (String(error).includes('Execution context was destroyed')) {
                return Number.POSITIVE_INFINITY;
              }

              throw error;
            }
          },
          { timeout: 10000 }
        )
        .toBe(0);

      await expect
        .poll(
          async () => {
            try {
              return await page.evaluate(async (name) => {
                const cacheNames = await caches.keys();
                return cacheNames.includes(name);
              }, cacheName);
            } catch (error) {
              if (String(error).includes('Execution context was destroyed')) {
                return true;
              }

              throw error;
            }
          },
          { timeout: 10000 }
        )
        .toBe(false);
    });
  }
});
