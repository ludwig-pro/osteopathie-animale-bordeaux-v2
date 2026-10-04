# CookieConsent and Google Tag Manager

The site owns the banner, saved preferences, and PostHog. GTM owns Google
Analytics and Google Ads. The public template in
[`site-cookie-consent.tpl`](./site-cookie-consent.tpl) bridges the site's choices
to Google's consent APIs. The full account export and conversion labels remain
outside the repository.

## Template tags

Import the template into the web container and create two tags:

| Tag                                       | Template mode              | Trigger                            |
| ----------------------------------------- | -------------------------- | ---------------------------------- |
| CookieConsent - Initialize Google consent | Initialize default consent | Consent Initialization - All Pages |
| CookieConsent - Update Google consent     | Update visitor choice      | Custom event `site_consent_update` |

The template only runs when `window.__cookieConsentManaged === true`. It starts
with all four Google consent types denied, then reads `window.siteConsent`:

| Site choice       | Google consent types                               |
| ----------------- | -------------------------------------------------- |
| `googleAnalytics` | `analytics_storage`                                |
| `googleAds`       | `ad_storage`, `ad_user_data`, `ad_personalization` |

Only literal `true` grants a service. A missing choice stays denied. After each
update, the template queues `site_consent_ready`. Google applies the consent API
update before processing this new event. Google tags must not fire on
`site_consent_update` itself, because the update takes effect after that event.

The template can read the two site globals, read/write `dataLayer`, and write the
four consent types. It has no permission to send requests, access cookies, or
read other globals. Its included GTM tests cover legacy pages, missing choices,
and separate Analytics/Ads choices.

## Google tags

- Google Analytics configuration: fire on a pageview with Analytics consent or
  on `site_consent_ready` with Analytics consent; fire once per page. Require
  additional `analytics_storage` consent.
- Conversion Linker: fire on a pageview with Ads consent or on
  `site_consent_ready` with Ads consent; fire once per page. Require additional
  `ad_storage`, `ad_user_data`, and `ad_personalization` consent.
- Google Ads conversions: use `contact_form_submit_succeeded`,
  `contact_phone_clicked`, and `contact_email_clicked`, respectively, and require
  the same three Ads consent types. The form conversion represents a successful
  response from the site, rather than an attempted native form submission.
- GA4 site interactions: use the exact event names below, `{{Event}}` as the event
  name, and require additional `analytics_storage` consent.

```text
calendly_external_link_clicked
contact_section_cta_clicked
contact_phone_clicked
contact_email_clicked
contact_form_submit_started
contact_form_submit_succeeded
contact_form_submit_failed
```

All managed-site triggers must also test the corresponding
`window.siteConsent` boolean, so an absent template cannot grant consent by
accident. There is no PostHog tag in GTM. Axeptio is blocked when the managed-site
marker is present.

During the transition, pages without the marker retain their previous Axeptio,
Analytics, linker, and native Ads conversion triggers. The consent template
leaves those pages' Google consent state unset. Retain paused Universal Analytics
tags and their original triggers unchanged. Remove this legacy path only after
the updated site has been deployed and verified.

The site's `site_cookie_consent` cookie lasts 182 days. Changing a choice emits
`site_consent_update`; withdrawing a loaded service reloads the page to
stop its existing listeners. GTM is loaded only after Google Analytics or Google
Ads is accepted.

## Verification

The migration was prepared in the isolated workspace
[CookieConsent - consentement par service](https://tagmanager.google.com/#/container/accounts/6004973871/containers/52411835/workspaces/9)
of `GTM-KCM49LQ`, based on published version 7, then published as
[version 8](https://tagmanager.google.com/#/versions/accounts/6004973871/containers/52411835/versions/8)
on 4 October 2026. The existing Default Workspace was preserved. GTM's preview
compiler accepted the configuration. The PR 22
Netlify preview was tested with the compiled workspace loaded through its GTM
preview environment. The compiled script's managed marker and ready event were
checked before testing. Analytics-only and Ads-only choices produced the
expected four consent states, cookies, and provider requests; the three Ads
conversion events generated their corresponding requests. Adding Analytics
after Ads updated consent without reloading; withdrawing either service
reloaded the page and retained the other choice. PostHog-only and refusal
loaded no Google tags; PostHog withdrawal removed its cookies and storage.

Tag Assistant's popup connection could not be established in the available
browsers. These are runtime checks of the compiled workspace through the
preview environment, rather than a connected Tag Assistant session. Provider
collection endpoints were blocked during the checks to avoid test conversions,
so dashboard receipt is not established. Deploy the compatible container before
the site, then verify the production delivery after each coordinated release.

Before publishing a container version, verify a fresh browser context, refusal,
Analytics only, Ads only, PostHog only, granting Analytics after Ads on the same
page, and withdrawing a loaded Google service. Confirm actual requests and
cookies as well as GTM's consent state. Mocked local tests establish the site
contract; they do not prove that the published container is configured correctly
or that the providers receive events.

Google's API documentation:

- [Create a consent mode template](https://developers.google.com/tag-platform/tag-manager/templates/consent-apis)
- [Custom template APIs](https://developers.google.com/tag-platform/tag-manager/templates/api)
- [Custom template permissions](https://developers.google.com/tag-platform/tag-manager/templates/permissions)
