import { SITE_CONFIG as SHARED_SITE_CONFIG } from '../../../site.config.mjs';

export const SITE_CONFIG = SHARED_SITE_CONFIG;

export const buildAbsoluteUrl = (pathname = '/') =>
  new URL(pathname, SITE_CONFIG.url).toString();

export const LOCAL_BUSINESS_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': buildAbsoluteUrl('/#organization'),
  name: SITE_CONFIG.businessName,
  description: SITE_CONFIG.description,
  url: SITE_CONFIG.url,
  image: buildAbsoluteUrl(SITE_CONFIG.ogImagePath),
  telephone: SITE_CONFIG.phone,
  email: SITE_CONFIG.email,
  areaServed: SITE_CONFIG.serviceAreas.map((name) => ({
    '@type': 'City',
    name,
  })),
  address: {
    '@type': 'PostalAddress',
    ...SITE_CONFIG.address,
  },
  openingHours: SITE_CONFIG.openingHours,
  sameAs: [SITE_CONFIG.facebookUrl],
};
