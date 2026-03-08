export type NavigationItem = {
  label: string;
  href: string;
};

export const primaryNavigation: NavigationItem[] = [
  { label: 'Animaux', href: '/animaux' },
  { label: 'Zones desservies', href: '/zones-desservies' },
  { label: 'Cabinet à Bègles', href: '/cabinet-begles' },
  { label: 'FAQ', href: '/faq' },
  { label: "Cas d'usage", href: '/cas-d-usage' },
];

export const footerNavigation: NavigationItem[] = [
  { label: 'Accueil', href: '/' },
  { label: 'Animaux', href: '/animaux' },
  { label: 'Zones desservies', href: '/zones-desservies' },
  { label: 'Cabinet à Bègles', href: '/cabinet-begles' },
  { label: 'FAQ', href: '/faq' },
  { label: "Cas d'usage", href: '/cas-d-usage' },
];
