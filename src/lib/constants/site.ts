export const SITE_CONFIG = {
  title: 'Ostéopathe animalier à Bordeaux et Bègles | Agathe Lescout',
  description:
    "Consultations d'ostéopathie animale à Bordeaux, Bègles et en Gironde pour chiens, chats, NAC, chevaux et bovins.",
  url: 'https://www.osteopathie-animale-bordeaux.fr',
  themeColor: '#c0823f',
  gtmId: 'GTM-KCM49LQ',
} as const;

export const BUSINESS_CONFIG = {
  name: 'Agathe Lescout, Ostéopathe animalier',
  practitionerName: 'Agathe Lescout',
  practitionerJobTitle: 'Ostéopathe animalier',
  telephone: '+33665550792',
  email: 'agathe.lescout.osteo@gmail.com',
  sameAs: ['https://www.facebook.com/AgatheLescout/'],
  priceRange: '€€',
  address: {
    streetAddress: '34 rue du Maréchal Joffre',
    addressLocality: 'Bègles',
    postalCode: '33130',
    addressRegion: 'Gironde',
    addressCountry: 'FR',
  },
  geo: {
    latitude: 44.805434,
    longitude: -0.550281,
  },
  openingHoursSpecification: [
    {
      dayOfWeek: ['Monday', 'Friday'],
      opens: '09:00',
      closes: '19:00',
    },
  ],
  areaServed: ['Bordeaux', 'Bègles', 'Gironde'],
} as const;

type BreadcrumbItem = {
  name: string;
  item: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

export function getCanonicalUrl(path = '/') {
  return new URL(path, SITE_CONFIG.url).toString();
}

export function getDefaultOgImageUrl() {
  return getCanonicalUrl('/icon.png');
}

export function buildProfessionalServiceSchema({
  canonicalUrl,
  description = SITE_CONFIG.description,
  areaServed = BUSINESS_CONFIG.areaServed,
}: {
  canonicalUrl: string;
  description?: string;
  areaServed?: readonly string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE_CONFIG.url}/#professional-service`,
    name: BUSINESS_CONFIG.name,
    description,
    url: canonicalUrl,
    image: getDefaultOgImageUrl(),
    priceRange: BUSINESS_CONFIG.priceRange,
    telephone: BUSINESS_CONFIG.telephone,
    email: BUSINESS_CONFIG.email,
    sameAs: BUSINESS_CONFIG.sameAs,
    areaServed: areaServed.map((name) => ({
      '@type': 'City',
      name,
    })),
    address: {
      '@type': 'PostalAddress',
      ...BUSINESS_CONFIG.address,
    },
    geo: {
      '@type': 'GeoCoordinates',
      ...BUSINESS_CONFIG.geo,
    },
    openingHoursSpecification: BUSINESS_CONFIG.openingHoursSpecification.map(
      (slot) => ({
        '@type': 'OpeningHoursSpecification',
        ...slot,
      })
    ),
  };
}

export function buildPersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_CONFIG.url}/#practitioner`,
    name: BUSINESS_CONFIG.practitionerName,
    jobTitle: BUSINESS_CONFIG.practitionerJobTitle,
    telephone: BUSINESS_CONFIG.telephone,
    email: BUSINESS_CONFIG.email,
    url: SITE_CONFIG.url,
    sameAs: BUSINESS_CONFIG.sameAs,
    worksFor: {
      '@type': 'ProfessionalService',
      name: BUSINESS_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

export function buildFaqSchema(items: readonly FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
