import { expect, test, type Page, type Request } from '@playwright/test';

type AnalyticsWindow = Window & {
  __gtm_loaded__?: boolean;
  __posthog_initialized__?: boolean;
  dataLayer?: Array<Record<string, unknown>>;
};

const isAnalyticsProviderRequest = (url: string) =>
  /googletagmanager|google-analytics|posthog/i.test(url);

async function prepareHydratedContactForm(page: Page) {
  const posts: Request[] = [];
  const analyticsRequests: string[] = [];

  await page.addInitScript(() => {
    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow.__gtm_loaded__ = true;
    analyticsWindow.__posthog_initialized__ = true;
    analyticsWindow.dataLayer = [];
  });

  await page.route('**/*', async (route) => {
    const request = route.request();

    if (isAnalyticsProviderRequest(request.url())) {
      analyticsRequests.push(request.url());
      await route.abort();
      return;
    }

    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/'
    ) {
      posts.push(request);
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'ok',
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/');

  const form = page.locator('#contactForm');
  await form.scrollIntoViewIfNeeded();
  const island = form.locator('xpath=ancestor::astro-island[1]');

  await expect
    .poll(() => island.getAttribute('ssr'), {
      message: 'contact form should be hydrated before submitting',
    })
    .toBeNull();

  return { form, posts, analyticsRequests };
}

test.describe('Contact form validation', () => {
  test('rejects an entirely blank submission before analytics or network', async ({
    page,
  }) => {
    const { form, posts, analyticsRequests } =
      await prepareHydratedContactForm(page);

    await form.getByRole('button', { name: 'Envoyer' }).click();

    await expect(page.locator('#name-error')).toHaveRole('alert');
    await expect(page.locator('#message-error')).toHaveRole('alert');
    await expect(page.locator('#name')).toBeFocused();
    expect(posts).toHaveLength(0);
    expect(analyticsRequests).toHaveLength(0);

    const startedEvents = await page.evaluate(() => {
      const analyticsWindow = window as AnalyticsWindow;

      return (analyticsWindow.dataLayer ?? []).filter(
        (item) => item['event'] === 'contact_form_submit_started'
      );
    });

    expect(startedEvents).toHaveLength(0);
  });

  test('requires at least one contact channel', async ({ page }) => {
    const { form, posts, analyticsRequests } =
      await prepareHydratedContactForm(page);

    await form.locator('[name="name"]').fill('  Camille  ');
    await form.locator('[name="message"]').fill('  Consultation pour Oslo  ');
    await form.getByRole('button', { name: 'Envoyer' }).click();

    const contactError = page.locator('#contact-method-error');
    await expect(contactError).toHaveRole('alert');
    await expect(form.locator('[name="email"]')).toHaveAttribute(
      'aria-describedby',
      /contact-method-error/
    );
    await expect(form.locator('[name="phone"]')).toHaveAttribute(
      'aria-describedby',
      /contact-method-error/
    );
    await expect(form.locator('[name="email"]')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await expect(form.locator('[name="phone"]')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await expect(form.locator('[name="email"]')).toBeFocused();
    expect(posts).toHaveLength(0);
    expect(analyticsRequests).toHaveLength(0);

    const startedEvents = await page.evaluate(() => {
      const analyticsWindow = window as AnalyticsWindow;

      return (analyticsWindow.dataLayer ?? []).filter(
        (item) => item['event'] === 'contact_form_submit_started'
      );
    });

    expect(startedEvents).toHaveLength(0);
  });

  test('rejects a malformed non-empty email', async ({ page }) => {
    const { form, posts, analyticsRequests } =
      await prepareHydratedContactForm(page);

    await form.locator('[name="name"]').fill('Camille');
    await form.locator('[name="email"]').fill('camille@');
    await form.locator('[name="message"]').fill('Consultation pour Oslo');
    await form.getByRole('button', { name: 'Envoyer' }).click();

    await expect(page.locator('#email-error')).toHaveRole('alert');
    await expect(form.locator('[name="email"]')).toBeFocused();
    expect(posts).toHaveLength(0);
    expect(analyticsRequests).toHaveLength(0);

    const startedEvents = await page.evaluate(() => {
      const analyticsWindow = window as AnalyticsWindow;

      return (analyticsWindow.dataLayer ?? []).filter(
        (item) => item['event'] === 'contact_form_submit_started'
      );
    });

    expect(startedEvents).toHaveLength(0);
  });

  test('submits one normalized email payload and resets after success', async ({
    page,
  }) => {
    const { form, posts, analyticsRequests } =
      await prepareHydratedContactForm(page);

    await form.locator('[name="name"]').fill('  Camille  ');
    await form.locator('[name="animal"]').fill('  Oslo  ');
    await form
      .locator('[name="message"]')
      .fill('  Consultation pour une boiterie  ');
    await form.getByRole('button', { name: 'Envoyer' }).click();
    await expect(page.locator('#contact-method-error')).toHaveRole('alert');
    expect(posts).toHaveLength(0);

    await form.locator('[name="email"]').fill('camille@example.com');
    await form.getByRole('button', { name: 'Envoyer' }).click();

    await expect
      .poll(() => posts.length, { message: 'one form POST should be sent' })
      .toBe(1);
    await expect(
      page.getByText('Message envoyé ! Nous vous répondrons rapidement.')
    ).toBeVisible();
    await expect(page.locator('#contact-method-error')).toHaveCount(0);

    const body = new URLSearchParams(posts[0]?.postData() ?? '');
    expect(body.getAll('form-name')).toEqual(['contact']);
    expect(body.get('name')).toBe('Camille');
    expect(body.get('animal')).toBe('Oslo');
    expect(body.get('email')).toBe('camille@example.com');
    expect(body.get('phone')).toBe('');
    expect(body.get('message')).toBe('Consultation pour une boiterie');

    for (const fieldName of ['name', 'animal', 'email', 'phone', 'message']) {
      await expect(form.locator(`[name="${fieldName}"]`)).toHaveValue('');
    }

    expect(analyticsRequests).toHaveLength(0);
    const startedEvents = await page.evaluate(() => {
      const analyticsWindow = window as AnalyticsWindow;

      return (analyticsWindow.dataLayer ?? []).filter(
        (item) => item['event'] === 'contact_form_submit_started'
      );
    });

    expect(startedEvents).toHaveLength(1);
  });

  test('submits with a normalized phone when email is empty', async ({
    page,
  }) => {
    const { form, posts, analyticsRequests } =
      await prepareHydratedContactForm(page);

    await form.locator('[name="name"]').fill('Morgan');
    await form.locator('[name="phone"]').fill('  06 12 34 56 78  ');
    await form.locator('[name="message"]').fill('Question pour Nala');
    await form.getByRole('button', { name: 'Envoyer' }).click();

    await expect.poll(() => posts.length).toBe(1);
    const body = new URLSearchParams(posts[0]?.postData() ?? '');

    expect(body.getAll('form-name')).toEqual(['contact']);
    expect(body.get('email')).toBe('');
    expect(body.get('phone')).toBe('06 12 34 56 78');
    expect(analyticsRequests).toHaveLength(0);
  });

  test('keeps a human-hidden text honeypot in the payload', async ({
    page,
  }) => {
    const { form, posts } = await prepareHydratedContactForm(page);
    const honeypot = form.locator('[name="bot-field"]');

    await expect(honeypot).toHaveAttribute('type', 'text');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(honeypot).toHaveAttribute('autocomplete', 'off');
    await expect(form.getByTestId('contact-honeypot')).toBeHidden();

    await form.locator('[name="name"]').fill('Morgan');
    await form.locator('[name="email"]').fill('morgan@example.com');
    await form.locator('[name="message"]').fill('Question pour Nala');
    await form.getByRole('button', { name: 'Envoyer' }).click();

    await expect.poll(() => posts.length).toBe(1);
    const body = new URLSearchParams(posts[0]?.postData() ?? '');
    expect(body.get('bot-field')).toBe('');
  });

  test('keeps native required and email constraints without JavaScript', async ({
    browser,
    baseURL,
  }) => {
    expect(baseURL).toBeTruthy();
    if (!baseURL) {
      throw new Error('Playwright baseURL must be configured');
    }

    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    const posts: Request[] = [];
    const analyticsRequests: string[] = [];

    try {
      await context.route('**/*', async (route) => {
        const request = route.request();

        if (isAnalyticsProviderRequest(request.url())) {
          analyticsRequests.push(request.url());
          await route.abort();
          return;
        }

        if (
          request.method() === 'POST' &&
          new URL(request.url()).pathname === '/'
        ) {
          posts.push(request);
          await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<p>ok</p>',
          });
          return;
        }

        await route.continue();
      });

      await page.goto('/');
      const form = page.locator('#contactForm');
      await form.scrollIntoViewIfNeeded();

      expect(await form.getAttribute('novalidate')).toBeNull();
      await expect(form.locator('[name="name"]')).toHaveAttribute(
        'required',
        ''
      );
      await expect(form.locator('[name="message"]')).toHaveAttribute(
        'required',
        ''
      );

      await form.getByRole('button', { name: 'Envoyer' }).click();
      expect(posts).toHaveLength(0);

      await form.locator('[name="name"]').fill('Camille');
      await form.locator('[name="message"]').fill('Consultation pour Oslo');
      await form.locator('[name="email"]').fill('camille@');
      await form.getByRole('button', { name: 'Envoyer' }).click();
      expect(posts).toHaveLength(0);

      await form.locator('[name="email"]').fill('camille@example.com');
      await form.getByRole('button', { name: 'Envoyer' }).click();
      await expect.poll(() => posts.length).toBe(1);
      expect(analyticsRequests).toHaveLength(0);
    } finally {
      await context.close();
    }
  });
});
