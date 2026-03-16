import { expect, test } from '@playwright/test';

test.describe('Module script recovery', () => {
  test('recovers from a stale Astro chunk response', async ({ page }) => {
    let failedModuleRequest = false;
    let navigationCount = 0;

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigationCount += 1;
      }
    });

    await page.route('**/_astro/*.js', async (route) => {
      if (failedModuleRequest) {
        await route.continue();
        return;
      }

      failedModuleRequest = true;
      await route.fulfill({
        status: 404,
        contentType: 'text/html; charset=utf-8',
        headers: {
          'cache-control': 'public, max-age=31536000, immutable',
          'x-content-type-options': 'nosniff',
        },
        body: '<!doctype html><title>Not Found</title><p>Missing chunk</p>',
      });
    });

    await page.goto('/');

    await expect(page.getByTestId('cta-booking-online')).toBeVisible();
    await expect.poll(() => navigationCount).toBeGreaterThanOrEqual(2);
  });
});
