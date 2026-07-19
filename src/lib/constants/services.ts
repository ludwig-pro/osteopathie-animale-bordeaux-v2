import { BUSINESS_CONFIG } from './site';

export type AppointmentModeKey = 'office' | 'home';
export type ActiveSpeciesKey = 'chien' | 'chat' | 'nac';
export type PricingServiceId = 'chien-chat' | 'nac' | 'forfait';
export type DescriptiveServiceArea = {
  readonly name: string;
  readonly schemaType: 'City' | 'AdministrativeArea';
};

export type ActiveSpecies = {
  readonly key: ActiveSpeciesKey;
  readonly active: true;
  readonly menuLabel: string;
  readonly displayName: string;
  readonly imageKey: 'sectionChien' | 'sectionChat' | 'sectionLapin';
  readonly imageAlt: string;
  readonly examples?: readonly string[];
};

export type PriceVariant = {
  readonly description: string;
  readonly amountEur: number;
};

export type PricingService = {
  readonly id: PricingServiceId;
  readonly title: string;
  readonly imageKey: 'chienetchat' | 'furet' | 'forfait';
  readonly imageAlt: string;
  readonly activeSpecies: readonly ActiveSpeciesKey[];
  readonly appointmentModes: readonly AppointmentModeKey[];
  readonly amountEur?: number;
  readonly variants?: readonly PriceVariant[];
  readonly conditions?: readonly string[];
};

export const ACTIVE_SPECIES = [
  {
    key: 'chien',
    active: true,
    menuLabel: 'Le chien',
    displayName: 'Le chien',
    imageKey: 'sectionChien',
    imageAlt: 'Deux chiens',
  },
  {
    key: 'chat',
    active: true,
    menuLabel: 'Le chat',
    displayName: 'Le chat',
    imageKey: 'sectionChat',
    imageAlt: 'Un chat',
  },
  {
    key: 'nac',
    active: true,
    menuLabel: 'Les nouveaux animaux de compagnie',
    displayName: 'Les nouveaux animaux de compagnie',
    imageKey: 'sectionLapin',
    imageAlt: 'Un lapin',
    examples: ['lapins', 'rongeurs', 'furets'],
  },
] as const satisfies readonly ActiveSpecies[];

export const APPOINTMENT_MODES = {
  office: {
    key: 'office',
    label: 'En cabinet',
    location: BUSINESS_CONFIG.address.addressLocality,
    appointmentOnly: true,
  },
  home: {
    key: 'home',
    label: 'À domicile',
    location: 'Région bordelaise',
    appointmentOnly: true,
  },
} as const satisfies Record<
  AppointmentModeKey,
  {
    readonly key: AppointmentModeKey;
    readonly label: string;
    readonly location: string;
    readonly appointmentOnly: true;
  }
>;

export const SERVICE_AREA = {
  office: [BUSINESS_CONFIG.address.addressLocality],
  home: ['Région bordelaise'],
  descriptive: [
    { name: 'Bordeaux', schemaType: 'City' },
    {
      name: BUSINESS_CONFIG.address.addressLocality,
      schemaType: 'City',
    },
    {
      name: BUSINESS_CONFIG.address.addressRegion,
      schemaType: 'AdministrativeArea',
    },
  ],
} as const satisfies {
  readonly office: readonly string[];
  readonly home: readonly string[];
  readonly descriptive: readonly DescriptiveServiceArea[];
};

export const BOOKING_CONFIG = {
  online: {
    url: 'https://calendly.com/osteopathe-animalier/consultation-osteopathique',
    label: 'Prendre rendez-vous au cabinet en ligne',
    appointmentMode: 'office',
    eligibleServiceIds: ['chien-chat', 'nac'],
  },
  direct: {
    channels: ['telephone', 'email'],
    appointmentModes: ['office', 'home'],
    eligibleServiceIds: ['chien-chat', 'nac', 'forfait'],
  },
} as const satisfies {
  readonly online: {
    readonly url: string;
    readonly label: string;
    readonly appointmentMode: 'office';
    readonly eligibleServiceIds: readonly Exclude<
      PricingServiceId,
      'forfait'
    >[];
  };
  readonly direct: {
    readonly channels: readonly ('telephone' | 'email')[];
    readonly appointmentModes: readonly AppointmentModeKey[];
    readonly eligibleServiceIds: readonly PricingServiceId[];
  };
};

export const PRICING_CONFIG = {
  currency: 'EUR',
  travelFeeEur: 10,
  services: [
    {
      id: 'chien-chat',
      title: 'Chien & Chat',
      imageKey: 'chienetchat',
      imageAlt: 'Chien et chat représentant les consultations pour ces animaux',
      activeSpecies: ['chien', 'chat'],
      appointmentModes: ['office', 'home'],
      variants: [
        { description: 'adulte', amountEur: 60 },
        { description: 'moins de 6 mois', amountEur: 50 },
        { description: 'moins de 3 mois', amountEur: 40 },
      ],
    },
    {
      id: 'nac',
      title: 'NAC',
      imageKey: 'furet',
      imageAlt: 'Furet représentant les nouveaux animaux de compagnie',
      activeSpecies: ['nac'],
      appointmentModes: ['office', 'home'],
      amountEur: 50,
    },
    {
      id: 'forfait',
      title: 'Forfait mensuel',
      imageKey: 'forfait',
      imageAlt: "Illustration du forfait mensuel pour l'élevage",
      activeSpecies: ['chien', 'chat', 'nac'],
      appointmentModes: ['office', 'home'],
      amountEur: 40,
      conditions: [
        'Par animal',
        'À partir de 3 animaux',
        'Élevage ou rééducation',
      ],
    },
  ],
} as const satisfies {
  readonly currency: 'EUR';
  readonly travelFeeEur: number;
  readonly services: readonly PricingService[];
};
