import * as CookieConsent from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import '../styles/consent.css';
import type { PostHog } from 'posthog-js';
import type { AnalyticsPayload } from './analytics';

const gtmId = import.meta.env.PUBLIC_GTM_ID;
const posthogKey = import.meta.env.PUBLIC_POSTHOG_KEY;
const posthogHost =
  import.meta.env.PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let gtmLoaded = false;
let posthog: PostHog | undefined;
let posthogLoading = false;
let reloading = false;

const stopPosthog = () => {
  if (!posthog) return;
  posthog.set_config({ autocapture: false, capture_pageleave: false });
  posthog.opt_out_capturing();
};

const clearDeniedCookies = (consent: NonNullable<Window['siteConsent']>) => {
  const patterns: RegExp[] = [];
  if (!consent.googleAnalytics) patterns.push(/^_ga/);
  if (!consent.googleAds) {
    patterns.push(/^_gcl_/);
    try {
      window.localStorage.removeItem('_gcl_ls');
    } catch {
      // Consent must keep working when browser storage is unavailable.
    }
  }
  if (!consent.posthog) {
    patterns.push(/^ph_/);
    if (posthogKey) {
      try {
        window.localStorage.removeItem(`ph_${posthogKey}_posthog`);
        window.sessionStorage.removeItem(`ph_${posthogKey}_posthog`);
      } catch {
        // Consent must keep working when browser storage is unavailable.
      }
    }
  }
  CookieConsent.eraseCookies(patterns);
  // GA and Ads use the apex domain on the production www host.
  if (window.location.hostname.endsWith('.osteopathie-animale-bordeaux.fr')) {
    CookieConsent.eraseCookies(
      patterns,
      '/',
      'osteopathie-animale-bordeaux.fr'
    );
  }
};

const currentConsent = () => ({
  googleAnalytics: CookieConsent.acceptedService(
    'googleAnalytics',
    'analytics'
  ),
  googleAds: CookieConsent.acceptedService('googleAds', 'marketing'),
  posthog: CookieConsent.acceptedService('posthog', 'analytics'),
});

const loadGtm = () => {
  if (!gtmId || gtmLoaded) return;
  gtmLoaded = true;
  window.dataLayer?.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
};

const enablePosthog = (
  sdk: Pick<PostHog, 'set_config' | 'opt_in_capturing' | 'capture'>
) => {
  sdk.set_config({ autocapture: true, capture_pageleave: true });
  // No opt-in event: only the authorized pageview and subsequent interactions.
  sdk.opt_in_capturing({ captureEventName: false });
  sdk.capture('$pageview');
};

const loadPosthog = async () => {
  if (!posthogKey || posthogLoading || posthog || reloading) return;
  posthogLoading = true;
  try {
    // Serve the SDK with the site; do not load optional remote extensions.
    const { default: sdk } = await import('posthog-js/no-external');
    if (!window.siteConsent?.posthog || reloading) return;
    posthog = sdk;
    // SDK opt-out does not gate its queued/retried requests on unload. These
    // pinned-version guards check consent again at the final dispatch points.
    // Reload on withdrawal ensures these old queues cannot resume later.
    const sendRequest = sdk._send_request.bind(sdk);
    sdk._send_request = (request) => {
      if (window.siteConsent?.posthog && !reloading) sendRequest(request);
    };
    sdk.init(posthogKey, {
      api_host: posthogHost,
      defaults: '2026-01-30',
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_flags: true,
      person_profiles: 'never',
      mask_all_text: true,
      mask_all_element_attributes: true,
      rageclick: false,
      capture_dead_clicks: false,
      loaded: (loadedSdk) => {
        // Batched requests and retries bypass _send_request in this SDK.
        const queue = sdk._retryQueue;
        if (queue) {
          const dispatch = queue.retriableRequest.bind(queue);
          queue.retriableRequest = (...args: Parameters<typeof dispatch>) => {
            if (window.siteConsent?.posthog && !reloading) dispatch(...args);
          };
        }
        if (window.siteConsent?.posthog && !reloading) enablePosthog(loadedSdk);
        else loadedSdk.opt_out_capturing();
      },
    });
  } catch {
    // A blocked SDK must not break the banner or the site's other features.
    posthog = undefined;
  } finally {
    posthogLoading = false;
  }
};

const syncConsent = () => {
  const previous = window.siteConsent;
  const next = currentConsent();
  window.siteConsent = next;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: 'site_consent_update',
    consent_google_analytics: next.googleAnalytics ? 'granted' : 'denied',
    consent_google_ads: next.googleAds ? 'granted' : 'denied',
    consent_posthog: next.posthog ? 'granted' : 'denied',
  });

  if (!next.posthog) {
    stopPosthog();
  }
  clearDeniedCookies(next);

  // Unload existing provider listeners after withdrawal. The saved choice is
  // read on the new page before any provider can start again.
  if (
    (gtmLoaded &&
      ((previous?.googleAnalytics && !next.googleAnalytics) ||
        (previous?.googleAds && !next.googleAds))) ||
    (posthog && previous?.posthog && !next.posthog)
  ) {
    reloading = true;
    stopPosthog();
    window.location.reload();
    return;
  }

  if (next.googleAnalytics || next.googleAds) loadGtm();
  if (next.posthog && !previous?.posthog) {
    if (posthog) enablePosthog(posthog);
    else void loadPosthog();
  }
};

window.trackSiteEvent = (event: string, payload: AnalyticsPayload) => {
  if (reloading) return;
  const consent = window.siteConsent;
  if (consent?.googleAnalytics || consent?.googleAds) {
    window.dataLayer?.push({
      ...payload,
      event,
      consent_google_analytics: consent.googleAnalytics ? 'granted' : 'denied',
      consent_google_ads: consent.googleAds ? 'granted' : 'denied',
    });
  }
  if (consent?.posthog) posthog?.capture(event, payload);
};

void CookieConsent.run({
  mode: 'opt-in',
  revision: 1,
  hideFromBots: false,
  cookie: { name: 'site_cookie_consent', expiresAfterDays: 182 },
  onConsent: syncConsent,
  onChange: syncConsent,
  guiOptions: {
    consentModal: {
      layout: 'box',
      position: 'bottom left',
      equalWeightButtons: true,
    },
    preferencesModal: { layout: 'box', equalWeightButtons: true },
  },
  categories: {
    necessary: { enabled: true, readOnly: true },
    analytics: {
      services: {
        googleAnalytics: {
          label: 'Google Analytics',
          cookies: [{ name: /^_ga/ }],
        },
        posthog: { label: 'PostHog', cookies: [{ name: /^ph_/ }] },
      },
    },
    marketing: {
      services: {
        googleAds: { label: 'Google Ads', cookies: [{ name: /^_gcl_/ }] },
      },
    },
  },
  language: {
    default: 'fr',
    translations: {
      fr: {
        consentModal: {
          title: 'Vos préférences de cookies',
          description:
            'Avec votre accord, nous utilisons Google Analytics et PostHog pour comprendre les visites et améliorer le site, et Google Ads pour mesurer nos campagnes publicitaires. Vous pouvez accepter, refuser ou choisir chaque service. Votre choix pourra être modifié à tout moment en bas de page.',
          acceptAllBtn: 'Tout accepter',
          acceptNecessaryBtn: 'Tout refuser',
          showPreferencesBtn: 'Personnaliser',
        },
        preferencesModal: {
          title: 'Personnaliser les cookies',
          acceptAllBtn: 'Tout accepter',
          acceptNecessaryBtn: 'Tout refuser',
          savePreferencesBtn: 'Enregistrer mes choix',
          closeIconLabel: 'Fermer',
          serviceCounterLabel: 'Service|Services',
          sections: [
            {
              title: 'Votre choix',
              description:
                'Les services facultatifs restent désactivés sans votre accord. Votre préférence est conservée pendant six mois. Vous pouvez la modifier ici à tout moment.',
            },
            {
              title: 'Cookies nécessaires',
              description:
                'Le cookie site_cookie_consent mémorise vos choix et permet de respecter vos préférences.',
              linkedCategory: 'necessary',
            },
            {
              title: 'Mesure d’audience',
              description:
                'Google Analytics mesure la fréquentation. PostHog analyse les pages vues et les interactions, sans enregistrement vidéo des sessions. Vous pouvez choisir chaque service séparément.',
              linkedCategory: 'analytics',
            },
            {
              title: 'Publicité',
              description:
                'Google Ads mesure les conversions de nos campagnes publicitaires.',
              linkedCategory: 'marketing',
            },
            {
              title: 'Nous contacter',
              description:
                'Pour toute question concernant vos données : <a href="mailto:agathe.lescout.osteo@gmail.com">agathe.lescout.osteo@gmail.com</a>.',
            },
          ],
        },
      },
    },
  },
}).then(() => {
  // Axeptio choices are deliberately not reused by the new consent manager.
  clearDeniedCookies(currentConsent());
});
