import { expect, test } from '@playwright/test';

test.describe('Booking smoke checks', () => {
  test('online booking CTA links to Calendly', async ({ page }) => {
    await page.goto('/');

    const onlineBookingCta = page.locator('[data-testid="cta-booking-online"]');
    await expect(onlineBookingCta).toBeVisible();

    const href = await onlineBookingCta.getAttribute('href');
    expect(href).toContain('calendly.com');

    await expect(onlineBookingCta).toHaveAttribute('target', '_blank');
    await expect(onlineBookingCta).toHaveAttribute('rel', /noopener/);
  });

  test('phone booking CTA navigates to contact section', async ({ page }) => {
    await page.goto('/');

    const phoneBookingCta = page.getByTestId('cta-booking-phone');
    await expect(phoneBookingCta).toBeVisible();
    await phoneBookingCta.click();

    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator('#contact')).toBeVisible();
  });
});
