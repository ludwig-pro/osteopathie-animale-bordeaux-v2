import { expect, test, type Locator } from '@playwright/test';

const expectStaticBoundary = async (locator: Locator) => {
  await expect(locator).toBeVisible();
  await expect(
    locator.evaluate((element) => element.closest('astro-island'))
  ).resolves.toBeNull();
};

const expectInteractiveBoundary = async (locator: Locator) => {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();

  const island = locator.locator('xpath=ancestor::astro-island[1]');
  await expect(island).toHaveCount(1);
  await expect(island).not.toHaveAttribute('ssr');
};

test.describe('Static content section boundaries', () => {
  test('renders static sections without hydration and preserves interactive islands', async ({
    page,
  }) => {
    await page.goto('/');

    await expectStaticBoundary(
      page.getByRole('heading', {
        name: 'Les petits signes comptent.',
      })
    );
    await expectStaticBoundary(
      page.getByRole('heading', {
        name: 'De l’attention, jusque dans le mouvement.',
      })
    );
    await expectStaticBoundary(
      page.getByRole('heading', { name: 'Agathe Lescout', level: 3 })
    );
    await expectStaticBoundary(
      page.getByAltText(
        'Ostéopathe pratiquant une manipulation vertébrale sur un cheval'
      )
    );

    await expectInteractiveBoundary(
      page.locator('[data-testid="cta-booking-online"]')
    );
    await expectStaticBoundary(
      page.getByRole('heading', { name: 'À chacun son accompagnement.' })
    );
    await expectInteractiveBoundary(
      page.locator('[data-testid="map-load-trigger"]')
    );
    await expectInteractiveBoundary(
      page.getByRole('heading', { name: 'Des tarifs clairs.' })
    );
    await expectInteractiveBoundary(page.locator('#contactForm'));
    await expectStaticBoundary(page.locator('footer'));
    await expectInteractiveBoundary(
      page.getByRole('button', { name: '01 Faire connaissance' })
    );
  });
});
