import {
  expect,
  test,
  type APIRequestContext,
  type Page,
  type Response,
} from '@playwright/test';
import {
  ACTIVE_SPECIES,
  BOOKING_CONFIG,
  PRICING_CONFIG,
  SERVICE_AREA,
} from '../../src/lib/constants/services';
import {
  BUSINESS_CONFIG,
  LEGAL_CONFIG,
  SITE_CONFIG,
} from '../../src/lib/constants/site';
import { normalizeCanonicalPath } from '../../src/lib/seo';

const PRODUCTION_ORIGIN = 'https://www.osteopathie-animale-bordeaux.fr';
const PRODUCTION_HOME = `${PRODUCTION_ORIGIN}/`;
const LEGAL_PATHS = [
  {
    path: '/mentions-legales/',
    title: `Mentions légales | ${BUSINESS_CONFIG.practitionerName}`,
    heading: 'Mentions légales',
  },
  {
    path: '/politique-confidentialite/',
    title: `Politique de confidentialité | ${BUSINESS_CONFIG.practitionerName}`,
    heading: 'Politique de confidentialité',
  },
] as const;

type JsonLdNode = {
  '@type'?: string;
  '@id'?: string;
  [key: string]: unknown;
};

async function blockProductionNavigation(page: Page): Promise<void> {
  await page.route(`${PRODUCTION_ORIGIN}/**`, (route) => route.abort());
}

function expectLocalResponse(
  response: Response | null,
  baseURL: string,
  expectedStatus: number
): void {
  expect(response).not.toBeNull();
  if (!response) {
    return;
  }

  expect(response.status()).toBe(expectedStatus);
  expect(new URL(response.url()).origin).toBe(new URL(baseURL).origin);
}

function extractLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(
    (match) => match[1]?.replaceAll('&amp;', '&') ?? ''
  );
}

function extractCanonical(html: string): string | undefined {
  const canonicalTag = (html.match(/<link\b[^>]*>/gi) ?? []).find((tag) =>
    /\brel=(["'])canonical\1/i.test(tag)
  );

  return canonicalTag?.match(/\bhref=(["'])(.*?)\1/i)?.[2];
}

async function collectSitemapPages(
  request: APIRequestContext,
  baseURL: string,
  publishedSitemapUrl: string,
  seen = new Set<string>()
): Promise<string[]> {
  expect(seen.has(publishedSitemapUrl)).toBe(false);
  seen.add(publishedSitemapUrl);

  const publishedUrl = new URL(publishedSitemapUrl);
  expect(publishedUrl.origin).toBe(PRODUCTION_ORIGIN);

  const localUrl = new URL(
    `${publishedUrl.pathname}${publishedUrl.search}`,
    baseURL
  );
  const response = await request.get(localUrl.toString(), { maxRedirects: 0 });

  expect(new URL(response.url()).origin).toBe(new URL(baseURL).origin);
  expect(response.status()).toBe(200);

  const xml = await response.text();
  const locations = extractLocations(xml);
  expect(locations.length).toBeGreaterThan(0);

  if (/<sitemapindex[\s>]/i.test(xml)) {
    const pageUrls: string[] = [];

    for (const location of locations) {
      pageUrls.push(
        ...(await collectSitemapPages(request, baseURL, location, seen))
      );
    }

    return pageUrls;
  }

  expect(xml).toMatch(/<urlset[\s>]/i);
  return locations;
}

test.describe('Static metadata contract', () => {
  test('homepage exposes complete, coherent metadata', async ({
    baseURL,
    page,
  }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL is required.');
    }

    await blockProductionNavigation(page);
    const response = await page.goto('/');

    expectLocalResponse(response, baseURL, 200);
    const title = await page.title();
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(title).toBe(SITE_CONFIG.title);
    expect(description).toBe(SITE_CONFIG.description);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute('href', PRODUCTION_HOME);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index,follow'
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      title
    );
    await expect(
      page.locator('meta[property="og:description"]')
    ).toHaveAttribute('content', description ?? '');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      PRODUCTION_HOME
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      'content',
      title
    );
    await expect(
      page.locator('meta[name="twitter:description"]')
    ).toHaveAttribute('content', description ?? '');
    await expect(
      page.locator(
        'meta[property="og:image"], meta[property="og:image:alt"], meta[name="twitter:image"], meta[name="twitter:image:alt"]'
      )
    ).toHaveCount(0);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(
      SITE_CONFIG.homepage.heading
    );
    await expect(page.locator('h1')).toContainText(
      BUSINESS_CONFIG.practitionerName
    );

    const jsonLdBlocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(jsonLdBlocks).toHaveLength(1);
    for (const jsonLd of jsonLdBlocks) {
      expect(() => JSON.parse(jsonLd)).not.toThrow();
    }

    const schema = JSON.parse(jsonLdBlocks[0] ?? '{}') as {
      '@context'?: string;
      '@graph'?: JsonLdNode[];
    };
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@graph']).toHaveLength(3);

    const localBusiness = schema['@graph']?.find(
      (node) => node['@type'] === 'LocalBusiness'
    );
    const person = schema['@graph']?.find((node) => node['@type'] === 'Person');
    const website = schema['@graph']?.find(
      (node) => node['@type'] === 'WebSite'
    );

    expect(website?.['@id']).toBe(`${PRODUCTION_HOME}#website`);
    expect(person?.['@id']).toBe(`${PRODUCTION_HOME}#agathe-lescout`);
    expect(localBusiness?.['@id']).toBe(`${PRODUCTION_HOME}#local-business`);
    expect(localBusiness?.['telephone']).toBe(BUSINESS_CONFIG.telephone.e164);
    expect(localBusiness?.['email']).toBe(BUSINESS_CONFIG.email);
    expect(localBusiness?.['address']).toMatchObject({
      '@type': 'PostalAddress',
      ...BUSINESS_CONFIG.address,
    });
    expect(localBusiness?.['geo']).toMatchObject({
      '@type': 'GeoCoordinates',
      ...BUSINESS_CONFIG.geo,
    });
    expect(localBusiness?.['openingHoursSpecification']).toMatchObject({
      '@type': 'OpeningHoursSpecification',
      ...BUSINESS_CONFIG.hours.office.schema,
    });
    expect(localBusiness?.['sameAs']).toEqual(BUSINESS_CONFIG.sameAs);
    expect(localBusiness?.['priceRange']).toBe(BUSINESS_CONFIG.priceRange);
    expect(localBusiness?.['areaServed']).toEqual(
      SERVICE_AREA.descriptive.map((area) => ({
        '@type': area.schemaType,
        name: area.name,
      }))
    );
    expect(person?.['identifier']).toMatchObject({
      propertyID: "Registre national d'aptitude",
      value: BUSINESS_CONFIG.registration.registryNumber,
    });

    const serializedSchema = JSON.stringify(schema);
    for (const animal of ACTIVE_SPECIES) {
      expect(serializedSchema.toLocaleLowerCase('fr')).toContain(animal.key);
    }
    expect(serializedSchema).not.toMatch(/cheval|vache|bovin/i);
    expect(serializedSchema).not.toMatch(
      /aggregateRating|review|VeterinaryCare|MedicalBusiness/i
    );
    expect(localBusiness).not.toHaveProperty('image');
  });

  test('active species, booking and prices stay coherent across the homepage', async ({
    baseURL,
    page,
  }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL is required.');
    }

    await blockProductionNavigation(page);
    const response = await page.goto('/');
    expectLocalResponse(response, baseURL, 200);

    const renderedAnimalKeys = new Set(
      await page
        .locator('[data-animal-key]')
        .evaluateAll((elements) =>
          elements
            .map((element) => element.getAttribute('data-animal-key'))
            .filter((value): value is string => Boolean(value))
        )
    );
    expect([...renderedAnimalKeys].sort()).toEqual(
      ACTIVE_SPECIES.map((animal) => animal.key).sort()
    );
    await expect(page.locator('#animaux [role="menu"]')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileAnimalSelect = page
      .locator('#animaux button')
      .filter({ hasText: ACTIVE_SPECIES[0].menuLabel });
    await expect(mobileAnimalSelect).toBeVisible();
    await mobileAnimalSelect.click();
    const mobileAnimalKeys = await page
      .locator('#animaux [role="option"][data-animal-key]')
      .evaluateAll((elements) =>
        elements
          .map((element) => element.getAttribute('data-animal-key'))
          .filter((value): value is string => Boolean(value))
      );
    expect(mobileAnimalKeys.sort()).toEqual(
      ACTIVE_SPECIES.map((animal) => animal.key).sort()
    );
    await expect(page.locator('body')).not.toContainText(
      /Le cheval|La vache|pour les bovins/i
    );

    expect(BOOKING_CONFIG.online.appointmentMode).toBe('office');
    expect(BOOKING_CONFIG.online.eligibleServiceIds).toEqual([
      'chien-chat',
      'nac',
    ]);
    expect(BOOKING_CONFIG.online.eligibleServiceIds.join(',')).not.toContain(
      'forfait'
    );
    expect(BOOKING_CONFIG.direct.appointmentModes).toEqual(['office', 'home']);
    expect(BOOKING_CONFIG.direct.eligibleServiceIds).toContain('forfait');

    const onlineBookingLinks = page.locator(
      `a[href="${BOOKING_CONFIG.online.url}"]`
    );
    await expect(onlineBookingLinks).toHaveCount(1);
    await expect(onlineBookingLinks).toHaveText(BOOKING_CONFIG.online.label);
    await expect(onlineBookingLinks).toHaveAttribute(
      'data-testid',
      'cta-booking-online'
    );
    await expect(
      page.locator(`a[href="tel:${BUSINESS_CONFIG.telephone.e164}"]`).first()
    ).toContainText(BUSINESS_CONFIG.telephone.display);
    await expect(
      page.locator(`a[href="mailto:${BUSINESS_CONFIG.email}"]`).first()
    ).toContainText(BUSINESS_CONFIG.email);

    for (const service of PRICING_CONFIG.services) {
      const card = page.locator(`[data-pricing-service="${service.id}"]`);
      await expect(card).toHaveCount(1);
      await expect(card).toHaveAttribute(
        'data-active-species',
        service.activeSpecies.join(',')
      );
      if (service.amountEur) {
        await expect(card).toContainText(`${service.amountEur}€`);
      }
      for (const variant of service.variants ?? []) {
        await expect(card).toContainText(variant.description);
        await expect(card).toContainText(`${variant.amountEur}€`);
      }
    }

    const pricingSection = page.locator('#tarifs');
    await pricingSection.scrollIntoViewIfNeeded();
    const pricingIsland = page
      .locator('astro-island')
      .filter({ has: pricingSection });
    await expect(pricingIsland).not.toHaveAttribute('ssr', '');
    const homeMode = page.locator('[data-appointment-mode="home"]');
    await homeMode.click();
    await expect(homeMode).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="travel-fee"]')).toBeVisible();
    await expect(page.locator('[data-testid="travel-fee"]')).toContainText(
      `${PRICING_CONFIG.travelFeeEur} €`
    );
  });

  test('unknown routes keep the custom 404 out of the index', async ({
    baseURL,
    page,
  }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL is required.');
    }

    await blockProductionNavigation(page);
    const response = await page.goto('/seo-contract-not-found/');

    expectLocalResponse(response, baseURL, 404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex,follow'
    );
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('normalizes canonical paths without query strings or hashes', () => {
    expect(normalizeCanonicalPath('/')).toBe('/');
    expect(normalizeCanonicalPath('/foo')).toBe('/foo/');
    expect(normalizeCanonicalPath('/foo/')).toBe('/foo/');
    expect(normalizeCanonicalPath('/foo///')).toBe('/foo/');
    expect(normalizeCanonicalPath('/foo?utm_source=test#section')).toBe(
      '/foo/'
    );
    expect(normalizeCanonicalPath('/sitemap.xml?cache=1')).toBe('/sitemap.xml');
  });

  test('robots points to a local-verifiable sitemap of canonical pages', async ({
    baseURL,
    request,
  }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL is required.');
    }

    const robotsResponse = await request.get('/robots.txt', {
      maxRedirects: 0,
    });
    expect(robotsResponse.status()).toBe(200);

    const robots = await robotsResponse.text();
    const sitemapUrl = robots.match(/^Sitemap:\s*(\S+)\s*$/im)?.[1];
    expect(sitemapUrl).toBe(`${PRODUCTION_ORIGIN}/sitemap-index.xml`);

    const sitemapPages = await collectSitemapPages(
      request,
      baseURL,
      sitemapUrl ?? ''
    );
    expect(sitemapPages).toContain(PRODUCTION_HOME);
    expect(sitemapPages.some((url) => new URL(url).pathname === '/404/')).toBe(
      false
    );
    for (const legalPage of LEGAL_PATHS) {
      expect(
        sitemapPages.some((url) => new URL(url).pathname === legalPage.path)
      ).toBe(false);
    }

    for (const sitemapPage of sitemapPages) {
      const publishedUrl = new URL(sitemapPage);
      expect(publishedUrl.origin).toBe(PRODUCTION_ORIGIN);
      expect(publishedUrl.search).toBe('');
      expect(publishedUrl.hash).toBe('');
      expect(publishedUrl.pathname).toBe(
        normalizeCanonicalPath(publishedUrl.pathname)
      );

      const localUrl = new URL(publishedUrl.pathname, baseURL);
      const pageResponse = await request.get(localUrl.toString(), {
        maxRedirects: 0,
      });
      expect(new URL(pageResponse.url()).origin).toBe(new URL(baseURL).origin);
      expect(pageResponse.status()).toBe(200);
      expect(extractCanonical(await pageResponse.text())).toBe(
        publishedUrl.toString()
      );
    }
  });

  for (const legalPage of LEGAL_PATHS) {
    test(`${legalPage.path} is canonical, noindex and linked`, async ({
      baseURL,
      page,
    }) => {
      if (!baseURL) {
        throw new Error('Playwright baseURL is required.');
      }

      await blockProductionNavigation(page);
      const response = await page.goto(legalPage.path);
      expectLocalResponse(response, baseURL, 200);
      await expect(page).toHaveTitle(legalPage.title);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(legalPage.heading);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex,follow'
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${PRODUCTION_ORIGIN}${legalPage.path}`
      );
      await expect(
        page.locator(`footer a[href="${legalPage.path}"]`)
      ).toHaveCount(1);
    });
  }

  test('privacy information is linked next to the contact form', async ({
    baseURL,
    page,
  }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL is required.');
    }

    await blockProductionNavigation(page);
    const response = await page.goto('/');
    expectLocalResponse(response, baseURL, 200);
    await expect(
      page.locator('form#contactForm a[href="/politique-confidentialite/"]')
    ).toHaveCount(1);
    await expect(
      page.locator('footer a[href="/mentions-legales/"]')
    ).toHaveCount(1);
    await expect(
      page.locator('footer a[href="/politique-confidentialite/"]')
    ).toHaveCount(1);
  });

  test('legal identity and privacy essentials render without JavaScript', async ({
    baseURL,
    browser,
  }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL is required.');
    }

    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
    });

    try {
      await context.route(`${PRODUCTION_ORIGIN}/**`, (route) => route.abort());
      const page = await context.newPage();

      const legalResponse = await page.goto('/mentions-legales/');
      expectLocalResponse(legalResponse, baseURL, 200);
      await expect(page.locator('body')).toContainText(
        LEGAL_CONFIG.operator.siren
      );
      await expect(page.locator('body')).toContainText(
        LEGAL_CONFIG.operator.siret
      );
      await expect(page.locator('body')).toContainText(
        BUSINESS_CONFIG.registration.registryNumber
      );
      await expect(
        page.locator(
          `a[href="${BUSINESS_CONFIG.registration.officialDirectoryUrl}"]`
        )
      ).toHaveCount(1);

      const privacyResponse = await page.goto('/politique-confidentialite/');
      expectLocalResponse(privacyResponse, baseURL, 200);
      await expect(page.locator('body')).toContainText(
        `${LEGAL_CONFIG.privacy.contactRetentionMonths} mois`
      );
      await expect(page.locator('body')).toContainText(
        LEGAL_CONFIG.privacy.processorName
      );
      await expect(page.locator('body')).toContainText(
        'supprimées manuellement'
      );
    } finally {
      await context.close();
    }
  });

  for (const { label, viewport } of [
    { label: 'mobile', viewport: { width: 390, height: 844 } },
    { label: 'desktop', viewport: { width: 1280, height: 900 } },
  ]) {
    test(`renders critical content without JavaScript on ${label}`, async ({
      baseURL,
      browser,
    }) => {
      if (!baseURL) {
        throw new Error('Playwright baseURL is required.');
      }

      const context = await browser.newContext({
        baseURL,
        javaScriptEnabled: false,
        viewport,
      });

      try {
        await context.route(`${PRODUCTION_ORIGIN}/**`, (route) =>
          route.abort()
        );
        const page = await context.newPage();
        const response = await page.goto('/');

        expectLocalResponse(response, baseURL, 200);
        await expect(page.locator('main')).toHaveCount(1);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toContainText(
          SITE_CONFIG.homepage.heading
        );
        await expect(page.locator('#osteopathie')).toBeAttached();
        await expect(page.locator('#animaux')).toBeAttached();
        await expect(page.locator('#tarifs')).toBeAttached();
        for (const animal of ACTIVE_SPECIES) {
          await expect(
            page.locator(`[data-animal-key="${animal.key}"]`)
          ).toBeAttached();
        }
        await expect(page.locator('body')).not.toContainText(
          /Le cheval|La vache|pour les bovins/i
        );
        for (const service of PRICING_CONFIG.services) {
          const card = page.locator(`[data-pricing-service="${service.id}"]`);
          await expect(card).toBeAttached();
          if (service.amountEur) {
            await expect(card).toContainText(`${service.amountEur}€`);
          }
          for (const variant of service.variants ?? []) {
            await expect(card).toContainText(variant.description);
            await expect(card).toContainText(`${variant.amountEur}€`);
          }
        }
        await expect(page.locator('body')).toContainText(
          BUSINESS_CONFIG.address.streetAddress
        );
        await expect(page.locator('body')).toContainText(
          BUSINESS_CONFIG.hours.home.display
        );
        await expect(page.locator('body')).toContainText(
          BUSINESS_CONFIG.hours.office.display
        );
        await expect(
          page
            .locator(`a[href="tel:${BUSINESS_CONFIG.telephone.e164}"]`)
            .first()
        ).toContainText(BUSINESS_CONFIG.telephone.display);
        await expect(
          page.locator('footer a[href="/mentions-legales/"]')
        ).toBeAttached();
        await expect(
          page.locator('footer a[href="/politique-confidentialite/"]')
        ).toBeAttached();
      } finally {
        await context.close();
      }
    });
  }
});
