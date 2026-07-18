import {
  expect,
  test,
  type APIRequestContext,
  type Page,
  type Response,
} from '@playwright/test';
import { normalizeCanonicalPath } from '../../src/lib/seo';

const PRODUCTION_ORIGIN = 'https://www.osteopathie-animale-bordeaux.fr';
const PRODUCTION_HOME = `${PRODUCTION_ORIGIN}/`;

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
    expect(title.trim()).not.toBe('');
    expect(description?.trim()).not.toBe('');

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

    const jsonLdBlocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(jsonLdBlocks.length).toBeGreaterThan(0);
    for (const jsonLd of jsonLdBlocks) {
      expect(() => JSON.parse(jsonLd)).not.toThrow();
    }
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
        await expect(page.locator('#osteopathie')).toBeAttached();
        await expect(page.locator('#animaux')).toBeAttached();
        await expect(page.locator('#tarifs')).toBeAttached();
        await expect(page.locator('a[href^="tel:"]').first()).toBeAttached();
      } finally {
        await context.close();
      }
    });
  }
});
