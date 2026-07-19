export const SITE_CONFIG = {
  title: 'Ostéopathe animalier à Bordeaux et Bègles | Agathe Lescout',
  description:
    "Consultations d'ostéopathie animale pour chiens, chats et NAC, au cabinet de Bègles ou à domicile dans la région bordelaise.",
  homepage: {
    heading: 'Ostéopathe animalier à Bordeaux et Bègles',
  },
  url: 'https://www.osteopathie-animale-bordeaux.fr',
  themeColor: '#c0823f',
  gtmId: 'GTM-KCM49LQ',
} as const;

export const PUBLIC_PROFILE_URLS = {
  facebook: 'https://www.facebook.com/AgatheLescout/',
  googleBusiness:
    'https://www.google.com/maps/place/?q=place_id:ChIJwyvy7e8nVQ0Ru7HFAZyjJkY',
} as const;

export const BUSINESS_CONFIG = {
  publicName: 'Agathe Lescout Ostéopathie animale Bordeaux',
  practitionerName: 'Agathe Lescout',
  practitionerJobTitle: 'Ostéopathe animalier',
  telephone: {
    e164: '+33665550792',
    display: '06 65 55 07 92',
  },
  email: 'agathe.lescout.osteo@gmail.com',
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
  hours: {
    home: {
      display: 'Sur rendez-vous du lundi au vendredi',
    },
    office: {
      display: 'Sur rendez-vous le lundi et le vendredi, de 9 h à 19 h',
      schema: {
        dayOfWeek: ['Monday', 'Friday'],
        opens: '09:00',
        closes: '19:00',
      },
    },
  },
  registration: {
    registryNumber: 'OA69',
    decisionDate: '2018-11-21',
    registrationDate: '2018-11-22',
    wording:
      "Personne non vétérinaire inscrite au Registre national d'aptitude pour réaliser des actes d'ostéopathie animale",
    officialDirectoryUrl: 'https://www.veterinaire.fr/annuaires',
    officialDirectoryApiUrl:
      'https://extranet.veterinaire.fr/api/directories/search-osteopaths',
    historicalRegionalListUrl:
      'https://www.veterinaire.fr/annuaires/liste-regionale-nouvelle-aquitaine',
  },
  profiles: PUBLIC_PROFILE_URLS,
  sameAs: [PUBLIC_PROFILE_URLS.googleBusiness, PUBLIC_PROFILE_URLS.facebook],
} as const;

export const LEGAL_CONFIG = {
  operator: {
    name: BUSINESS_CONFIG.practitionerName,
    legalForm: 'Entrepreneur individuel',
    siren: '842 272 999',
    siret: '842 272 999 00058',
    apeCode: '75.00Z',
    publicationDirector: BUSINESS_CONFIG.practitionerName,
  },
  host: {
    name: 'Netlify, Inc.',
    address: '101 2nd Street, San Francisco, CA 94105, États-Unis',
    termsUrl: 'https://www.netlify.com/legal/terms-of-use/',
    supportUrl: 'https://www.netlify.com/support/',
    privacyUrl: 'https://www.netlify.com/privacy/',
  },
  privacy: {
    contactRetentionMonths: 12,
    processorName: 'Netlify',
  },
} as const;
