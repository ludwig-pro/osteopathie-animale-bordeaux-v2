import { expect, test } from '@playwright/test';

test.describe('Booking smoke checks', () => {
  test('homepage renders core content and metadata', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Agathe Lescout/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Agathe Lescout/i,
      })
    ).toBeVisible();

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      'href',
      'https://www.osteopathie-animale-bordeaux.fr/'
    );
  });

  test('online booking CTA is visible and initiates Calendly loading', async ({
    page,
  }) => {
    await page.goto('/');

    const onlineBookingCta = page.locator('[data-testid="cta-booking-online"]');
    await expect(onlineBookingCta).toBeVisible();

    const calendlyRequestPromise = page.waitForRequest(
      (request) => request.url().includes('calendly.com'),
      { timeout: 10000 }
    );

    const calendlyIframePromise = page
      .waitForSelector('iframe[src*="calendly.com"]', { timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    const popupButton = onlineBookingCta.locator('button');
    if ((await popupButton.count()) > 0) {
      await popupButton.first().click();
    } else {
      await onlineBookingCta.click();
    }

    const iframeDetected = await calendlyIframePromise;
    if (!iframeDetected) {
      await calendlyRequestPromise;
    }
  });

  test('phone booking CTA navigates to contact section', async ({ page }) => {
    await page.goto('/');

    const phoneBookingCta = page.getByTestId('cta-booking-phone');
    await expect(phoneBookingCta).toBeVisible();
    await phoneBookingCta.click();

    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator('#contact')).toBeVisible();
  });

  test('legal and SEO pages render', async ({ page }) => {
    await page.goto('/mentions-legales');
    await expect(
      page.getByRole('heading', { level: 1, name: /Mentions legales/i })
    ).toBeVisible();

    await page.goto('/osteopathe-animalier-bordeaux');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Osteopathe animalier a Bordeaux/i,
      })
    ).toBeVisible();
  });
});
