import { expect, test, type Page, type Route } from '@playwright/test';

const STABILIZATION_WINDOW_MS = 1_500;

const countMainFrameDocumentRequests = (page: Page) => {
  let count = 0;

  page.on('request', (request) => {
    if (
      request.isNavigationRequest() &&
      request.resourceType() === 'document' &&
      request.frame() === page.mainFrame()
    ) {
      count += 1;
    }
  });

  return () => count;
};

const fulfillMissingChunk = async (route: Route) => {
  await route.fulfill({
    status: 404,
    contentType: 'text/html; charset=utf-8',
    headers: {
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
    body: '<!doctype html><title>Not Found</title><p>Missing chunk</p>',
  });
};

const blockSessionStorage = async (
  page: Page,
  options: {
    blockHistoryWrites?: boolean;
    seedHistorySentinel?: boolean;
  } = {}
) => {
  await page.addInitScript(({ blockHistoryWrites, seedHistorySentinel }) => {
    const storageBaseline = {
      getItem: Storage.prototype.getItem,
      replaceState: History.prototype.replaceState,
      setItem: Storage.prototype.setItem,
    };
    const throwSecurityError = () => {
      throw new DOMException('Storage access is blocked', 'SecurityError');
    };

    Object.defineProperty(window, '__moduleRecoveryStorageBaseline', {
      configurable: true,
      value: storageBaseline,
    });
    Object.defineProperties(window.sessionStorage, {
      getItem: {
        configurable: true,
        value: throwSecurityError,
      },
      setItem: {
        configurable: true,
        value: throwSecurityError,
      },
    });

    if (seedHistorySentinel && window.history.state === null) {
      window.history.replaceState(
        { moduleRecoverySentinel: 'preserved' },
        '',
        window.location.href
      );
    }

    if (blockHistoryWrites) {
      Object.defineProperty(window.history, 'replaceState', {
        configurable: true,
        value: throwSecurityError,
      });
    }
  }, options);
};

const expectOnlySessionStorageIsBlocked = async (page: Page) => {
  const state = await page.evaluate(() => {
    const baseline = (
      window as typeof window & {
        __moduleRecoveryStorageBaseline: {
          getItem: typeof Storage.prototype.getItem;
          replaceState: typeof History.prototype.replaceState;
          setItem: typeof Storage.prototype.setItem;
        };
      }
    ).__moduleRecoveryStorageBaseline;

    const throwsSecurityError = (operation: () => void) => {
      try {
        operation();
        return false;
      } catch (error) {
        return error instanceof DOMException && error.name === 'SecurityError';
      }
    };

    return {
      sessionGetItemInstanceOverride: Object.prototype.hasOwnProperty.call(
        window.sessionStorage,
        'getItem'
      ),
      sessionGetItemThrows: throwsSecurityError(() =>
        window.sessionStorage.getItem('module-recovery-test')
      ),
      sessionSetItemInstanceOverride: Object.prototype.hasOwnProperty.call(
        window.sessionStorage,
        'setItem'
      ),
      sessionSetItemThrows: throwsSecurityError(() =>
        window.sessionStorage.setItem('module-recovery-test', '1')
      ),
      storagePrototypeUntouched:
        Storage.prototype.getItem === baseline.getItem &&
        Storage.prototype.setItem === baseline.setItem,
      localStorageUntouched:
        window.localStorage.getItem === baseline.getItem &&
        window.localStorage.setItem === baseline.setItem,
    };
  });

  expect(state).toEqual({
    sessionGetItemInstanceOverride: true,
    sessionGetItemThrows: true,
    sessionSetItemInstanceOverride: true,
    sessionSetItemThrows: true,
    storagePrototypeUntouched: true,
    localStorageUntouched: true,
  });
};

const expectHistoryWritesAreBlocked = async (page: Page) => {
  const state = await page.evaluate(() => {
    const baseline = (
      window as typeof window & {
        __moduleRecoveryStorageBaseline: {
          replaceState: typeof History.prototype.replaceState;
        };
      }
    ).__moduleRecoveryStorageBaseline;

    let throwsSecurityError = false;
    try {
      window.history.replaceState({}, '', window.location.href);
    } catch (error) {
      throwsSecurityError =
        error instanceof DOMException && error.name === 'SecurityError';
    }

    return {
      historyInstanceOverrideActive:
        window.history.replaceState !== baseline.replaceState,
      historyPrototypeUntouched:
        History.prototype.replaceState === baseline.replaceState,
      throwsSecurityError,
    };
  });

  expect(state).toEqual({
    historyInstanceOverrideActive: true,
    historyPrototypeUntouched: true,
    throwsSecurityError: true,
  });
};

test.describe('Module script recovery', () => {
  test('recovers from a stale Astro chunk response', async ({ page }) => {
    let failedModuleRequest = false;
    const getDocumentRequestCount = countMainFrameDocumentRequests(page);

    await page.route('**/_astro/*.js', async (route) => {
      if (failedModuleRequest) {
        await route.continue();
        return;
      }

      failedModuleRequest = true;
      await fulfillMissingChunk(route);
    });

    await page.goto('/');

    await expect(page.getByTestId('cta-booking-online')).toBeVisible();
    await expect.poll(getDocumentRequestCount).toBe(2);
    await page.waitForTimeout(STABILIZATION_WINDOW_MS);
    expect(getDocumentRequestCount()).toBe(2);
  });

  test('does not loop when sessionStorage is blocked', async ({ page }) => {
    const getDocumentRequestCount = countMainFrameDocumentRequests(page);

    await blockSessionStorage(page, { seedHistorySentinel: true });
    await page.route('**/_astro/*.js', async (route) => {
      await fulfillMissingChunk(route);
    });

    await page.goto('/');

    await expect.poll(getDocumentRequestCount).toBe(2);
    await page.waitForTimeout(STABILIZATION_WINDOW_MS);
    expect(getDocumentRequestCount()).toBe(2);
    await expectOnlySessionStorageIsBlocked(page);
    await expect(page.getByTestId('cta-booking-online')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => ({
          marker: window.history.state?.__moduleScriptRecoveryAttempted,
          sentinel: window.history.state?.moduleRecoverySentinel,
        }))
      )
      .toEqual({
        marker: true,
        sentinel: 'preserved',
      });
  });

  test('does not reload for a different failed module after recovery', async ({
    page,
  }) => {
    const getDocumentRequestCount = countMainFrameDocumentRequests(page);
    let firstFailedModuleUrl: string | undefined;
    let secondFailedModuleUrl: string | undefined;

    await blockSessionStorage(page);
    await page.route('**/_astro/*.js', async (route) => {
      const moduleUrl = route.request().url();
      const documentRequestCount = getDocumentRequestCount();

      if (documentRequestCount === 1 && firstFailedModuleUrl === undefined) {
        firstFailedModuleUrl = moduleUrl;
        await fulfillMissingChunk(route);
        return;
      }

      if (
        documentRequestCount === 2 &&
        secondFailedModuleUrl === undefined &&
        moduleUrl !== firstFailedModuleUrl
      ) {
        secondFailedModuleUrl = moduleUrl;
        await fulfillMissingChunk(route);
        return;
      }

      await route.continue();
    });

    await page.goto('/');

    await expect.poll(getDocumentRequestCount).toBe(2);
    await expect
      .poll(() =>
        [firstFailedModuleUrl, secondFailedModuleUrl].filter(
          (moduleUrl) => moduleUrl !== undefined
        )
      )
      .toHaveLength(2);
    expect(firstFailedModuleUrl).toBeDefined();
    expect(secondFailedModuleUrl).toBeDefined();
    expect(secondFailedModuleUrl).not.toBe(firstFailedModuleUrl);
    await page.waitForTimeout(STABILIZATION_WINDOW_MS);
    expect(getDocumentRequestCount()).toBe(2);
    await expectOnlySessionStorageIsBlocked(page);
  });

  test('does not reload when persistent recovery markers cannot be written', async ({
    page,
  }) => {
    const getDocumentRequestCount = countMainFrameDocumentRequests(page);

    await blockSessionStorage(page, { blockHistoryWrites: true });
    await page.route('**/_astro/*.js', fulfillMissingChunk);

    await page.goto('/');

    await page.waitForTimeout(STABILIZATION_WINDOW_MS);
    expect(getDocumentRequestCount()).toBe(1);
    await expectOnlySessionStorageIsBlocked(page);
    await expectHistoryWritesAreBlocked(page);
    await expect(page.getByTestId('cta-booking-online')).toBeVisible();
  });
});
