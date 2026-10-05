import type { AnalyticsPayload } from '../lib/analytics';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    __cookieConsentManaged?: boolean;
    siteConsent?: {
      googleAnalytics: boolean;
      googleAds: boolean;
      posthog: boolean;
    };
    trackSiteEvent?: (event: string, payload: AnalyticsPayload) => void;
  }
}

export {};
