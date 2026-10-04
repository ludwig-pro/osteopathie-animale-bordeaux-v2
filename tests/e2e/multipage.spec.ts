import { expect, test } from '@playwright/test';
import { configuration } from '../../src/lib/content/animals';

const animalRoutes = ['chien', 'chat', 'cheval', 'nac'] as const;

for (const animal of animalRoutes) {
  test(`the ${animal} page is directly accessible and preserves its original copy`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/animaux/${animal}/`);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://www.osteopathie-animale-bordeaux.fr/animaux/${animal}/`
    );
    const lead = await page.locator('.animal-hero .body-copy').innerText();
    const body = await page
      .locator('.animal-story article .body-copy')
      .innerText();
    expect(`${lead} ${body}`.replace(/\s+/g, ' ').trim()).toBe(
      configuration[animal].text.replace(/\s+/g, ' ').trim()
    );
    await expect(
      page
        .getByRole('navigation', { name: 'Choisir un animal' })
        .locator('[aria-current="page"]')
    ).toHaveAttribute('href', `/animaux/${animal}/`);
    await expect(
      page.locator('.animal-hero a[href*="calendly.com"]')
    ).toHaveAttribute('target', '_blank');
    await expect(page.locator('.animal-hero-photo')).toBeVisible();
    await page.reload();
    await expect(page.locator('h1')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('desktop menu and animal cards navigate to real pages', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tout refuser', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ouvrir le menu' })
  ).toBeHidden();
  await page.getByRole('button', { name: 'Vos animaux' }).click();
  await page.getByRole('menuitem', { name: 'Le chat' }).click();
  await expect(page).toHaveURL(/\/animaux\/chat\/$/);
  await page
    .getByRole('navigation', { name: 'Choisir un animal' })
    .getByRole('link', { name: 'Le cheval' })
    .click();
  await expect(page).toHaveURL(/\/animaux\/cheval\/$/);
  await page
    .getByRole('link', { name: 'Agathe Lescout — Accueil' })
    .first()
    .click();
  await page.locator('.animal-card').filter({ hasText: 'Les NAC' }).click();
  await expect(page).toHaveURL(/\/animaux\/nac\/$/);
  await page.goBack();
  await expect(page).toHaveURL('/');
});

test('mobile menu manages focus, closes with Escape and follows cross-page anchors', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/animaux/chien/');
  await page.getByRole('button', { name: 'Tout refuser', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Ouvrir le menu' });
  await trigger.click();
  const menu = page.getByRole('dialog', {
    name: 'Agathe Lescout',
    exact: true,
  });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu.getByRole('link', { name: 'Tarifs', exact: true }).click();
  await expect(page).toHaveURL(/\/#tarifs$/);
  await expect(page.locator('#tarifs')).toBeInViewport();
  await expect(menu).toBeHidden();
});

test('pricing tabs and consultation steps work with the keyboard', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tout refuser', exact: true }).click();
  const cabinet = page.getByRole('tab', { name: 'En cabinet', exact: true });
  await cabinet.scrollIntoViewIfNeeded();
  await expect(
    cabinet.locator('xpath=ancestor::astro-island[1]')
  ).not.toHaveAttribute('ssr');
  await cabinet.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'À domicile', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('10€');
  await page.keyboard.press('ArrowLeft');
  await expect(cabinet).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.pricing-note')).toHaveCount(0);
  const treatment = page.getByRole('button', { name: '03 Traitement' });
  await treatment.scrollIntoViewIfNeeded();
  await expect(
    treatment.locator('xpath=ancestor::astro-island[1]')
  ).not.toHaveAttribute('ssr');
  await treatment.click();
  await expect(treatment).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByText('Une fois le diagnostic ostéopathique établi', {
      exact: false,
    })
  ).toBeVisible();
});

test('all pages fit small screens and keep meaningful navigation without JavaScript', async ({
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Playwright baseURL must be configured');
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  for (const route of [
    '/',
    ...animalRoutes.map((animal) => `/animaux/${animal}/`),
  ]) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    await expect(page.locator('.animal-card')).toHaveCount(4);
  }
  await context.close();
});

test('reduced motion keeps the editorial content readable and stops movement', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tout refuser', exact: true }).click();
  const photo = page.locator('.animal-card').first().locator('img');
  await photo.scrollIntoViewIfNeeded();
  await photo.hover();
  await expect(photo).toBeVisible();
  await expect(photo).toHaveCSS('transform', 'none');
  await expect(page.locator('#animaux h2')).toBeVisible();
  expect(
    await page.evaluate(() =>
      document
        .getAnimations()
        .some((animation) => animation.playState === 'running')
    )
  ).toBe(false);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#osteopathie').scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#osteopathie .section-heading')).toHaveCSS(
    'opacity',
    '1'
  );
  await expect(page.locator('#osteopathie .editorial-figure')).toHaveCSS(
    'transform',
    'none'
  );
  await expect(page.locator('#osteopathie h2')).toBeVisible();
});
