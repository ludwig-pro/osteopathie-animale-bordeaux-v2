export const prestations = [
  {
    id: 'chien-chat',
    title: 'Chien & Chat',
    alt: 'Chien et chat ensemble représentant les consultations pour ces animaux',
    imageKey: 'chienetchat' as const,
    basePrice: '60',
    domicilePrice: '80',
    variants: [
      { description: 'adulte', basePrice: '60', domicilePrice: '60' },
      { description: 'moins de 6 mois', basePrice: '50', domicilePrice: '50' },
      { description: 'moins de 3 mois', basePrice: '40', domicilePrice: '40' },
    ],
  },
  {
    id: 'nac',
    title: 'N.A.C',
    alt: 'Furet représentant les Nouveaux Animaux de Compagnie (NAC)',
    imageKey: 'furet' as const,
    basePrice: '50',
    domicilePrice: '50',
  },
  {
    id: 'cheval',
    title: 'Cheval',
    alt: 'Cheval représentant les consultations en ostéopathie équine',
    imageKey: 'cheval' as const,
    basePrice: '90',
    domicilePrice: '90',
  },
  {
    id: 'forfait',
    title: 'Forfait',
    alt: 'Illustration du forfait mensuel pour les éleveurs',
    imageKey: 'forfait' as const,
    basePrice: '40',
    domicilePrice: '40',
  },
];
