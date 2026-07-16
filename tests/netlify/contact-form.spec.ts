import { expect, test, type Page, type Request } from '@playwright/test';

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be set`);
  }

  return value;
}

const marker = requireEnvironmentVariable('NETLIFY_FORM_TEST_MARKER');
const configuredUrl = requireEnvironmentVariable('NETLIFY_FORM_TEST_URL');
const atomicUrl = new URL(configuredUrl);
const atomicOrigin = atomicUrl.origin;

const ANALYTICS_DOMAINS = [
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'googleadservices.com',
  'adservice.google.com',
  'doubleclick.net',
  'googlesyndication.com',
  'posthog.com',
];

const matchesDomain = (hostname: string, domain: string) =>
  hostname === domain || hostname.endsWith(`.${domain}`);

const isAnalyticsProvider = (requestUrl: URL) =>
  ANALYTICS_DOMAINS.some((domain) =>
    matchesDomain(requestUrl.hostname, domain)
  ) ||
  (matchesDomain(requestUrl.hostname, 'google.com') &&
    requestUrl.pathname.startsWith('/pagead/'));

function containsMarker(value: string | null) {
  if (!value) {
    return false;
  }

  if (value.includes(marker)) {
    return true;
  }

  try {
    return decodeURIComponent(value).includes(marker);
  } catch {
    return false;
  }
}

function isAtomicFormPost(request: Request) {
  const requestUrl = new URL(request.url());

  return (
    request.method() === 'POST' &&
    requestUrl.origin === atomicOrigin &&
    requestUrl.pathname === '/' &&
    !requestUrl.search &&
    !requestUrl.hash
  );
}

async function waitForHydration(page: Page) {
  const form = page.locator('form[name="contact"]');
  const island = form.locator('xpath=ancestor::astro-island[1]');

  await form.scrollIntoViewIfNeeded();
  await expect
    .poll(() => island.getAttribute('ssr'), {
      message: 'contact form should be hydrated before submitting',
    })
    .toBeNull();

  return form;
}

test.describe.configure({ mode: 'serial' });

test('submits one contact form to the exact atomic preview', async ({
  page,
}) => {
  const formPosts: Request[] = [];
  let duplicateAtomicPostCount = 0;
  let unexpectedPostCount = 0;
  let markerLeakCount = 0;

  await page.route('**/*', async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const allowedFormPost = isAtomicFormPost(request);
    const requestContainsMarker =
      containsMarker(request.url()) || containsMarker(request.postData());

    if (requestContainsMarker && !allowedFormPost) {
      markerLeakCount += 1;
      await route.abort();
      return;
    }

    if (isAnalyticsProvider(requestUrl)) {
      await route.abort();
      return;
    }

    if (request.method() === 'POST' && !allowedFormPost) {
      unexpectedPostCount += 1;
      await route.abort();
      return;
    }

    if (allowedFormPost) {
      if (formPosts.length > 0) {
        duplicateAtomicPostCount += 1;
        await route.abort();
        return;
      }

      formPosts.push(request);
    }

    await route.continue();
  });

  await page.goto('/');
  expect(page.url()).toBe(atomicUrl.href);

  const form = await waitForHydration(page);
  await expect(form).toHaveAttribute('name', 'contact');
  await expect(form.locator('[name="bot-field"]')).toHaveCount(1);
  await expect(
    form.locator('input[type="hidden"][name="form-name"][value="contact"]')
  ).toHaveCount(1);
  expect(await form.getAttribute('data-netlify')).toBeNull();

  await form.locator('[name="name"]').fill('Netlify acceptance', {
    force: true,
  });
  await form
    .locator('[name="email"]')
    .fill('netlify-acceptance@example.invalid', { force: true });
  await form.locator('[name="message"]').fill(marker, { force: true });
  await form.getByRole('button', { name: 'Envoyer' }).click({ force: true });

  await expect
    .poll(() => formPosts.length, {
      message: 'exactly one atomic form POST should be sent',
    })
    .toBe(1);
  await expect(
    page.getByText('Message envoyé ! Nous vous répondrons rapidement.')
  ).toBeVisible();

  const formPost = formPosts[0];
  if (!formPost) {
    throw new Error('Expected one atomic form POST');
  }

  const formBody = new URLSearchParams(formPost.postData() ?? '');
  expect(formBody.getAll('form-name')).toEqual(['contact']);
  expect(formBody.get('message') === marker).toBe(true);

  let finalRequest = formPost;
  let redirectedRequest = finalRequest.redirectedTo();

  while (redirectedRequest) {
    finalRequest = redirectedRequest;
    redirectedRequest = finalRequest.redirectedTo();
  }

  const finalResponse = await finalRequest.response();
  if (!finalResponse) {
    throw new Error('Expected the form request to receive a response');
  }

  expect(new URL(finalResponse.url()).origin).toBe(atomicOrigin);

  await page.waitForTimeout(500);

  expect(formPosts).toHaveLength(1);
  expect(duplicateAtomicPostCount).toBe(0);
  expect(unexpectedPostCount).toBe(0);
  expect(markerLeakCount).toBe(0);
});
