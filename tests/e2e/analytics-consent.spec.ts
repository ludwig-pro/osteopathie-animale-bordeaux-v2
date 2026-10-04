import { expect, test, type Locator, type Page } from '@playwright/test';

type ConsentState = {
  googleAnalytics: boolean;
  googleAds: boolean;
  posthog: boolean;
};

type ConsentWindow = Window & {
  __cookieConsentManaged?: boolean;
  siteConsent?: ConsentState;
  trackSiteEvent?: (event: string, payload?: Record<string, unknown>) => void;
  dataLayer?: Array<Record<string, unknown>>;
};

const deniedConsent: ConsentState = {
  googleAnalytics: false,
  googleAds: false,
  posthog: false,
};

const isGoogleRequest = (url: string) =>
  /(^|\.)(googletagmanager|google-analytics|googleadservices)\.com$/i.test(
    new URL(url).hostname
  ) || /(^|\.)doubleclick\.net$/i.test(new URL(url).hostname);

const isPostHogRequest = (url: string) =>
  /(^|\.)posthog\.com$/i.test(new URL(url).hostname);

const banner = (page: Page) =>
  page.getByRole('dialog', { name: 'Vos préférences de cookies', exact: true });

const preferences = (page: Page) =>
  page.getByRole('dialog', { name: 'Personnaliser les cookies', exact: true });

async function readConsent(page: Page) {
  return page.evaluate(() => (window as ConsentWindow).siteConsent);
}

async function prepareConsentPage(
  page: Page,
  baseURL: string | undefined,
  posthogResponseStatus = 200
) {
  if (!baseURL) {
    throw new Error('Playwright baseURL must be configured');
  }

  const siteOrigin = new URL(baseURL).origin;
  const externalRequests: string[] = [];

  // Exercise human-visitor tracking: PostHog suppresses webdriver sessions and
  // HeadlessChrome client-hint brands, even with Playwright's normal user agent.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
  });

  // Keep every third-party request local, including SDK scripts and event POSTs.
  // Run with PUBLIC_GTM_ID=GTM-TESTCONSENT PUBLIC_POSTHOG_KEY=phc_test_consent.
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.origin === siteOrigin) {
      await route.continue();
      return;
    }

    externalRequests.push(request.url());

    if (request.resourceType() === 'script') {
      await route.fulfill({
        contentType: 'application/javascript',
        body:
          url.hostname === 'www.googletagmanager.com'
            ? `
                if (window.siteConsent.googleAnalytics) {
                  document.cookie = '_ga=consent-test; Path=/';
                }
                if (window.siteConsent.googleAds) {
                  document.cookie = '_gcl_au=consent-test; Path=/';
                }
              `
            : '',
      });
      return;
    }

    await route.fulfill({
      status: isPostHogRequest(request.url()) ? posthogResponseStatus : 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        status: 1,
        featureFlags: {},
        featureFlagPayloads: {},
      }),
    });
  });

  await page.goto('/');
  await expect(banner(page)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => typeof (window as ConsentWindow).trackSiteEvent)
    )
    .toBe('function');

  return externalRequests;
}

async function openPreferences(page: Page) {
  await banner(page).getByRole('button', { name: 'Personnaliser' }).click();
  const dialog = preferences(page);
  await expect(dialog).toBeVisible();

  // CookieConsent services live in initially collapsed purpose sections.
  const collapsedSections = dialog.locator('button[aria-expanded="false"]');
  while ((await collapsedSections.count()) > 0) {
    await collapsedSections.first().click();
  }

  return dialog;
}

async function selectService(dialog: Locator, name: string) {
  await dialog.getByRole('checkbox', { name, exact: true }).check();
  await dialog.getByRole('button', { name: 'Enregistrer mes choix' }).click();
  await expect(dialog).toBeHidden();
}

async function reopenPreferences(page: Page) {
  const button = page.getByRole('button', {
    name: 'Vos préférences en matière de cookies',
  });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(preferences(page)).toBeVisible();
}

test.describe('Analytics consent', () => {
  test('blocks analytics before a choice, including interactions and delayed loading', async ({
    page,
    baseURL,
  }) => {
    const requests = await prepareConsentPage(page, baseURL);

    await page.clock.install();
    await page.mouse.click(20, 20);
    await page.keyboard.press('Tab');
    await page.evaluate(() => {
      const consentWindow = window as ConsentWindow;
      consentWindow.trackSiteEvent?.('consent_test_before_choice', {});
      window.dispatchEvent(new Event('pagehide'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.fastForward(10_000);

    expect(requests.filter(isGoogleRequest)).toHaveLength(0);
    expect(requests.filter(isPostHogRequest)).toHaveLength(0);
    expect(await readConsent(page)).toEqual(deniedConsent);
    expect(
      await page.evaluate(() => {
        const consentWindow = window as ConsentWindow;
        return (consentWindow.dataLayer ?? []).some(
          (item) => item['event'] === 'consent_test_before_choice'
        );
      })
    ).toBe(false);
    await expect(banner(page)).toBeVisible();
  });

  test('persists refusal and keeps the footer preferences available', async ({
    page,
    baseURL,
  }) => {
    const requests = await prepareConsentPage(page, baseURL);
    await banner(page).getByRole('button', { name: 'Tout refuser' }).click();
    await expect(banner(page)).toBeHidden();
    expect(await readConsent(page)).toEqual(deniedConsent);

    await page.reload();
    await expect(banner(page)).toBeHidden();
    expect(await readConsent(page)).toEqual(deniedConsent);
    await reopenPreferences(page);
    await expect(
      preferences(page).getByRole('checkbox', {
        name: /nécessaires|essentiels/i,
      })
    ).toBeDisabled();

    expect(requests.filter(isGoogleRequest)).toHaveLength(0);
    expect(requests.filter(isPostHogRequest)).toHaveLength(0);
  });

  test('clears legacy tracking storage on a fresh visit without removing unrelated preferences', async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) throw new Error('Playwright baseURL must be configured');
    await page.context().addCookies(
      ['_ga', '_gcl_au', 'ph_phc_test_consent_posthog'].map((name) => ({
        name,
        value: 'legacy-tracking',
        url: baseURL,
      }))
    );
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'ph_phc_test_consent_posthog',
        'legacy-tracking'
      );
      window.localStorage.setItem('unrelated-preference', 'preserve-me');
    });

    const requests = await prepareConsentPage(page, baseURL);
    expect(await readConsent(page)).toEqual(deniedConsent);
    const cookieNames = (await page.context().cookies()).map(
      ({ name }) => name
    );
    expect(cookieNames).not.toContain('_ga');
    expect(cookieNames).not.toContain('_gcl_au');
    expect(cookieNames).not.toContain('ph_phc_test_consent_posthog');
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem('ph_phc_test_consent_posthog')
      )
    ).toBeNull();
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem('unrelated-preference')
      )
    ).toBe('preserve-me');
    expect(requests.filter(isGoogleRequest)).toHaveLength(0);
    expect(requests.filter(isPostHogRequest)).toHaveLength(0);
  });

  test('allows PostHog alone without loading Google or replaying earlier events', async ({
    page,
    baseURL,
  }) => {
    const requests = await prepareConsentPage(page, baseURL);
    await page.evaluate(() => {
      (window as ConsentWindow).trackSiteEvent?.(
        'consent_test_before_posthog',
        {}
      );
    });
    await selectService(await openPreferences(page), 'PostHog');
    expect(await readConsent(page)).toEqual({
      ...deniedConsent,
      posthog: true,
    });
    await expect.poll(() => requests.some(isPostHogRequest)).toBe(true);
    await expect
      .poll(async () =>
        (await page.context().cookies()).some(({ name }) =>
          name.startsWith('ph_')
        )
      )
      .toBe(true);
    expect(requests.filter(isGoogleRequest)).toHaveLength(0);
    expect(
      await page.evaluate(() =>
        ((window as ConsentWindow).dataLayer ?? []).some(
          (item) => item['event'] === 'consent_test_before_posthog'
        )
      )
    ).toBe(false);

    const requestsBeforeReload = requests.filter(isPostHogRequest).length;
    await page.reload();
    await expect(banner(page)).toBeHidden();
    await expect
      .poll(() => readConsent(page))
      .toEqual({
        ...deniedConsent,
        posthog: true,
      });
    await expect
      .poll(() => requests.filter(isPostHogRequest).length)
      .toBeGreaterThan(requestsBeforeReload);
    expect(requests.filter(isGoogleRequest)).toHaveLength(0);

    await reopenPreferences(page);
    await page.evaluate(() => {
      (window as ConsentWindow).trackSiteEvent?.('consent_test_queued', {});
    });
    const requestsAfterWithdrawal = requests.filter(isPostHogRequest).length;
    await Promise.all([
      page.waitForEvent('load'),
      preferences(page).getByRole('button', { name: 'Tout refuser' }).click(),
    ]);
    await expect.poll(() => readConsent(page)).toEqual(deniedConsent);
    expect(
      (await page.context().cookies()).some(({ name }) =>
        name.startsWith('ph_')
      )
    ).toBe(false);
    await page.clock.install();
    await page.evaluate(() => {
      (window as ConsentWindow).trackSiteEvent?.(
        'consent_test_after_withdrawal',
        {}
      );
      window.dispatchEvent(new Event('pagehide'));
    });
    await page.clock.fastForward(10_000);
    expect(requests.filter(isPostHogRequest)).toHaveLength(
      requestsAfterWithdrawal
    );
  });

  test('drops PostHog batches and retries when consent is withdrawn after a failed request', async ({
    page,
    baseURL,
  }) => {
    const requests = await prepareConsentPage(page, baseURL, 500);
    await selectService(await openPreferences(page), 'PostHog');
    await expect.poll(() => requests.some(isPostHogRequest)).toBe(true);

    await reopenPreferences(page);
    await page.evaluate(() => {
      (window as ConsentWindow).trackSiteEvent?.(
        'consent_test_queued_after_failure',
        {}
      );
    });
    const posthogRequestsBeforeWithdrawal =
      requests.filter(isPostHogRequest).length;
    await Promise.all([
      page.waitForEvent('load'),
      preferences(page).getByRole('button', { name: 'Tout refuser' }).click(),
    ]);
    await expect.poll(() => readConsent(page)).toEqual(deniedConsent);
    await page.clock.install();
    await page.clock.fastForward(20_000);

    expect(requests.filter(isPostHogRequest)).toHaveLength(
      posthogRequestsBeforeWithdrawal
    );
    expect(requests.filter(isGoogleRequest)).toHaveLength(0);
  });

  test('allows Google Analytics independently and clears its cookie on withdrawal', async ({
    page,
    baseURL,
  }) => {
    const requests = await prepareConsentPage(page, baseURL);
    await selectService(await openPreferences(page), 'Google Analytics');
    expect(await readConsent(page)).toEqual({
      ...deniedConsent,
      googleAnalytics: true,
    });
    await expect.poll(() => requests.some(isGoogleRequest)).toBe(true);
    await expect
      .poll(() => page.context().cookies())
      .toEqual(
        expect.arrayContaining([expect.objectContaining({ name: '_ga' })])
      );
    expect(requests.filter(isPostHogRequest)).toHaveLength(0);

    await reopenPreferences(page);
    const subsequentRequestsStart = requests.length;
    await Promise.all([
      page.waitForEvent('load'),
      preferences(page).getByRole('button', { name: 'Tout refuser' }).click(),
    ]);
    await expect.poll(() => readConsent(page)).toEqual(deniedConsent);
    await expect(banner(page)).toBeHidden();
    expect(
      (await page.context().cookies()).map(({ name }) => name)
    ).not.toContain('_ga');
    expect(
      requests.slice(subsequentRequestsStart).filter(isGoogleRequest)
    ).toHaveLength(0);
    expect(requests.filter(isPostHogRequest)).toHaveLength(0);
  });

  test('allows Google Ads without granting audience measurement', async ({
    page,
    baseURL,
  }) => {
    const requests = await prepareConsentPage(page, baseURL);
    await selectService(await openPreferences(page), 'Google Ads');
    expect(await readConsent(page)).toEqual({
      ...deniedConsent,
      googleAds: true,
    });
    await expect.poll(() => requests.some(isGoogleRequest)).toBe(true);
    expect(requests.filter(isPostHogRequest)).toHaveLength(0);
    expect(
      (await page.context().cookies()).map(({ name }) => name)
    ).not.toContain('_ga');
    expect(
      await page.evaluate(() =>
        ((window as ConsentWindow).dataLayer ?? []).findLast(
          (item) => item['event'] === 'site_consent_update'
        )
      )
    ).toMatchObject({
      consent_google_analytics: 'denied',
      consent_google_ads: 'granted',
      consent_posthog: 'denied',
    });
  });

  test('keeps every consent action usable on a narrow screen', async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const requests = await prepareConsentPage(page, baseURL);
    const dialog = banner(page);

    for (const name of ['Tout accepter', 'Tout refuser', 'Personnaliser']) {
      const button = dialog.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      const bounds = await button.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(375);
    }

    const prefs = await openPreferences(page);
    await expect(
      prefs.getByRole('button', { name: 'Enregistrer mes choix' })
    ).toBeVisible();
    await prefs.getByRole('button', { name: 'Tout refuser' }).click();
    await reopenPreferences(page);
    expect(requests.filter(isGoogleRequest)).toHaveLength(0);
    expect(requests.filter(isPostHogRequest)).toHaveLength(0);
  });
});
