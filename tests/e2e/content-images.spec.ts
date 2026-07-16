import { expect, test, type Locator, type Page } from '@playwright/test';

const viewports = [
  { key: '375x812', width: 375, height: 812 },
  { key: '768x1024', width: 768, height: 1024 },
  { key: '1024x768', width: 1024, height: 768 },
  { key: '1280x900', width: 1280, height: 900 },
  { key: '1440x900', width: 1440, height: 900 },
];

const logicalImageKeysByAlt = new Map([
  ['deux chiens', 'animal-dog'],
  ['un chat', 'animal-chat'],
  ['un cheval', 'animal-horse'],
  ['une vache', 'animal-cow'],
  ['un lapin', 'animal-rabbit'],
  [
    'Chien et chat ensemble représentant les consultations pour ces animaux',
    'pricing-dog-cat',
  ],
  [
    'Furet représentant les Nouveaux Animaux de Compagnie (NAC)',
    'pricing-ferret',
  ],
  ['Illustration du forfait mensuel pour les éleveurs', 'pricing-package'],
  [
    "Chaton tigré donnant la patte lors d'un examen ostéopathique",
    'consultation-kitten',
  ],
  [
    'Ostéopathe pratiquant une manipulation vertébrale sur un cheval',
    'consultation-correction',
  ],
  ['Bulldog anglais recevant un soin ostéopathique', 'osteopathy-bulldog'],
  [
    "Portrait d'Agathe Lescout, ostéopathe spécialisée dans les animaux",
    'about-portrait',
  ],
]);

const animals = [
  {
    desktopLabel: 'Le chat',
    mobileCurrent: 'Le chien',
    mobileNext: 'Le chat',
    alt: 'un chat',
  },
  {
    desktopLabel: 'Le cheval',
    mobileCurrent: 'Le chat',
    mobileNext: 'Le cheval',
    alt: 'un cheval',
  },
  {
    desktopLabel: 'La vache',
    mobileCurrent: 'Le cheval',
    mobileNext: 'La vache',
    alt: 'une vache',
  },
  {
    desktopLabel: 'N.A.C.',
    mobileCurrent: 'La vache',
    mobileNext: 'Les nouveaux animaux de compagnie',
    alt: 'un lapin',
  },
  {
    desktopLabel: 'Le chien',
    mobileCurrent: 'Les nouveaux animaux de compagnie',
    mobileNext: 'Le chien',
    alt: 'deux chiens',
  },
];

const animalImageSelector =
  'img[alt="deux chiens"], img[alt="un chat"], img[alt="un cheval"], img[alt="une vache"], img[alt="un lapin"]';

async function assertResponsiveImage(locator: Locator, page: Page) {
  await locator.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      locator.evaluate(
        (image: HTMLImageElement) =>
          image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
      )
    )
    .toBe(true);

  const imageData = await locator.evaluate((image: HTMLImageElement) => ({
    alt: image.alt,
    currentSrc: image.currentSrc,
    srcSet: image.srcset,
    sizes: image.sizes,
    renderedWidth: image.getBoundingClientRect().width,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  }));

  expect(imageData.srcSet).not.toBe('');
  expect(imageData.sizes.trim()).not.toBe('');
  expect(imageData.naturalWidth).toBeGreaterThan(0);
  expect(imageData.naturalHeight).toBeGreaterThan(0);

  const candidates = imageData.srcSet.split(',').map((candidate) => {
    const match = candidate.trim().match(/^(.*)\s+(\d+)w$/);
    expect(match, `invalid srcset candidate: ${candidate}`).not.toBeNull();

    return {
      url: new URL(match![1]!, page.url()).href,
      width: Number(match![2]),
    };
  });

  expect(candidates).toHaveLength(3);
  expect(candidates.every(({ width }) => width > 0)).toBe(true);

  const currentCandidate = candidates.find(
    ({ url }) => url === imageData.currentSrc
  );
  expect(
    currentCandidate,
    `currentSrc must match a candidate for ${imageData.alt}`
  ).toBeDefined();

  const widths = candidates.map(({ width }) => width).sort((a, b) => a - b);
  const expectedWidth =
    widths.find((width) => width >= imageData.renderedWidth) ?? widths.at(-1);
  expect(currentCandidate?.width).toBe(expectedWidth);

  const logicalImageKey = logicalImageKeysByAlt.get(imageData.alt);
  expect(
    logicalImageKey,
    `unknown logical image for alt "${imageData.alt}"`
  ).toBeDefined();
  return logicalImageKey!;
}

test.describe('Responsive content images', () => {
  test('serve the smallest adequate candidate across content layouts', async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    expect(baseURL).toBeTruthy();

    const aggregateKeys = new Set<string>();

    for (const viewport of viewports) {
      const context = await browser.newContext({
        baseURL,
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
      });

      try {
        const page = await context.newPage();
        await page.goto('/');
        expect(await page.evaluate(() => window.devicePixelRatio)).toBe(1);

        const contentImages = page.getByTestId('responsive-content-image');
        await expect(contentImages).toHaveCount(8);

        const animalIsland = page
          .locator('astro-island')
          .filter({ hasText: "L'ostéopathie pour qui ?" });
        await expect(animalIsland).toHaveCount(1);
        await expect
          .poll(() =>
            animalIsland.evaluate((island) => island.hasAttribute('ssr'))
          )
          .toBe(false);

        const viewportKeys = new Set<string>();
        for (let index = 0; index < 8; index += 1) {
          const logicalKey = await assertResponsiveImage(
            contentImages.nth(index),
            page
          );
          viewportKeys.add(logicalKey);
          aggregateKeys.add(`${viewport.key}/${logicalKey}`);
        }

        const animalImage = page.locator(animalImageSelector);
        await expect(animalImage).toHaveCount(1);

        for (const animal of animals) {
          const previous = await animalImage.evaluate(
            (image: HTMLImageElement) => ({
              src: image.src,
              alt: image.alt,
            })
          );

          if (viewport.width === 375) {
            await page
              .getByRole('button', {
                name: animal.mobileCurrent,
                exact: true,
              })
              .click();
            await page
              .getByRole('option', { name: animal.mobileNext, exact: true })
              .click();
          } else {
            await page
              .getByRole('menuitem', {
                name: animal.desktopLabel,
                exact: true,
              })
              .click();
          }

          await page.waitForFunction(
            ({ selector, previousSrc, previousAlt, expectedAlt }) => {
              const image = document.querySelector(selector);
              return (
                image instanceof HTMLImageElement &&
                image.src !== previousSrc &&
                image.alt !== previousAlt &&
                image.alt === expectedAlt
              );
            },
            {
              selector: animalImageSelector,
              previousSrc: previous.src,
              previousAlt: previous.alt,
              expectedAlt: animal.alt,
            }
          );

          const logicalKey = await assertResponsiveImage(animalImage, page);
          viewportKeys.add(logicalKey);
          aggregateKeys.add(`${viewport.key}/${logicalKey}`);
        }

        expect(viewportKeys.size).toBe(12);
      } finally {
        await context.close();
      }
    }

    expect(aggregateKeys.size).toBe(60);
  });
});
