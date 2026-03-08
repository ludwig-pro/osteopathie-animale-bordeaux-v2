export const SITE_CONFIG = {
  title: 'Ostéopathe animalier à Bordeaux | Agathe Lescout',
  description:
    "Consultations d'ostéopathie animale à Bordeaux, Bègles et en Gironde avec Agathe Lescout.",
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
