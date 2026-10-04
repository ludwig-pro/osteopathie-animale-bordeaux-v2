import { expect, test, type Locator, type Page } from '@playwright/test';

const viewports = [
  { key: '375x812', width: 375, height: 812 },
  { key: '768x1024', width: 768, height: 1024 },
  { key: '1024x768', width: 1024, height: 768 },
  { key: '1280x900', width: 1280, height: 900 },
  { key: '1440x900', width: 1440, height: 900 },
];

const logicalImageKeysByAlt = new Map([
  ['Le chien', 'animal-dog'],
  ['Le chat', 'animal-chat'],
  ['Le cheval', 'animal-horse'],
  ['une vache', 'animal-cow'],
  ['Les NAC', 'animal-rabbit'],
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
    'Cheval représentant les consultations en ostéopathie équine',
    'pricing-horse',
  ],
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
    renderedHeight: image.getBoundingClientRect().height,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
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
  expect(
    currentCandidate?.width,
    `${imageData.alt} rendered at ${imageData.renderedWidth}x${imageData.renderedHeight}px in ${imageData.viewportWidth}x${imageData.viewportHeight} with sizes "${imageData.sizes}"`
  ).toBe(expectedWidth);

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
    if (!baseURL) {
      throw new Error('Playwright baseURL must be configured');
    }

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
        await expect(contentImages).toHaveCount(12);

        const viewportKeys = new Set<string>();
        for (let index = 0; index < 12; index += 1) {
          const logicalKey = await assertResponsiveImage(
            contentImages.nth(index),
            page
          );
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
