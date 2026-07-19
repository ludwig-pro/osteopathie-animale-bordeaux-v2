import { expect, test, type Page } from '@playwright/test';
import { ACTIVE_SPECIES } from '../../src/lib/constants/services';
import { BUSINESS_CONFIG } from '../../src/lib/constants/site';

const LEGACY_HEALTH_COPY = [
  /diagnostic final/i,
  /garanti(?:e|r) .{0,40}bonne santé/i,
  /insuffisance rénale/i,
  /24\s+à\s+48\s*h/i,
  /10\s+à\s+15\s+jours/i,
  /diarrhée légère/i,
  /évitera les blessures/i,
  /améliora ses performances/i,
  /crânio-sacrées/i,
  /techniques réflexes/i,
  /acupressure/i,
] as const;

const OFFICIAL_SOURCE_URLS = [
  'https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000034451012',
  'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034451034',
  'https://www.veterinaire.fr/la-profession-veterinaire/nos-grands-dossiers/osteopathie-animale',
] as const;

async function expectLegacyCopyAbsent(page: Page): Promise<void> {
  for (const legacyText of LEGACY_HEALTH_COPY) {
    await expect(page.locator('body')).not.toContainText(legacyText);
  }
}

test.describe('Animal health content contract', () => {
  test('desktop keeps every active animal free of legacy clinical promises', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.locator('#animaux').scrollIntoViewIfNeeded();

    for (const animal of ACTIVE_SPECIES) {
      const menuItem = page.locator(
        `#animaux [role="menuitem"][data-animal-key="${animal.key}"]`
      );
      await expect(menuItem).toBeVisible();
      await menuItem.click();
      await expect(page.locator('#animaux h3')).toHaveText(animal.displayName);
      await expectLegacyCopyAbsent(page);
    }
  });

  test('mobile keeps every active animal free of legacy clinical promises', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('#animaux').scrollIntoViewIfNeeded();

    for (const animal of ACTIVE_SPECIES) {
      const animalSelect = page.locator('#animaux button').first();
      await animalSelect.click();
      const option = page.locator(
        `#animaux [role="option"][data-animal-key="${animal.key}"]`
      );
      await expect(option).toBeVisible();
      await option.click();
      await expect(page.locator('#animaux h3')).toHaveText(animal.displayName);
      await expectLegacyCopyAbsent(page);
    }
  });

  test('safety, governance and official sources are visible without external requests', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByText('Quand contacter un vétérinaire ?')
    ).toBeVisible();
    await expect(page.locator('body')).toContainText(
      'En cas d’urgence, n’attendez pas.'
    );

    const review = page.getByTestId('editorial-review');
    await review.scrollIntoViewIfNeeded();
    await expect(review).toBeVisible();
    await expect(review).toContainText('Responsable du site : Agathe Lescout');
    await expect(review).toContainText('Revue documentaire');
    await expect(review).toContainText('19 juillet 2026');
    await expect(review).toContainText('19 juillet 2027');

    for (const href of OFFICIAL_SOURCE_URLS) {
      const link = review.locator(`a[href="${href}"]`);
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', href);
    }

    await expect(page.locator('body')).toContainText(
      BUSINESS_CONFIG.registration.registryNumber
    );
    await expectLegacyCopyAbsent(page);
  });

  test('essential regulatory and review copy is present in static HTML', async ({
    request,
  }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toContain('Qu’est-ce que l’ostéopathie animale ?');
    expect(html).toContain('exclusivement manuelles');
    expect(html).toContain('non instrumentales et non forcées');
    expect(html).toContain('limité aux troubles fonctionnels');
    expect(html).toContain('ne remplace pas le suivi vétérinaire');
    expect(html).toContain('Revue documentaire');
    expect(html).toContain('Responsable du site : Agathe Lescout');
    expect(html).toContain('19 juillet 2026');
    expect(html).toContain('19 juillet 2027');
    expect(html).toContain(BUSINESS_CONFIG.registration.registryNumber);

    for (const href of OFFICIAL_SOURCE_URLS) {
      expect(html).toContain(`href="${href}"`);
    }

    expect(html).not.toMatch(/diagnostic final/i);
    expect(html).not.toMatch(/24\s+à\s+48\s*h/i);
    expect(html).not.toMatch(/10\s+à\s+15\s+jours/i);
    expect(html).not.toMatch(/diarrhée légère/i);
    expect(html).not.toMatch(/etc\.\.\./i);
  });
});
