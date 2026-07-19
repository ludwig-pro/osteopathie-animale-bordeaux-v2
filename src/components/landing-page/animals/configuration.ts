import {
  ACTIVE_SPECIES,
  type ActiveSpecies,
  type ActiveSpeciesKey,
} from '../../../lib/constants/services';

export type AnimalKey = ActiveSpeciesKey;

export type AnimalConfig = {
  name: string;
  imageKey: string;
  text: string;
  alt: string;
};

export type AnimalsConfiguration = Record<AnimalKey, AnimalConfig>;

const activeSpeciesByKey = Object.fromEntries(
  ACTIVE_SPECIES.map((animal) => [animal.key, animal])
) as Record<AnimalKey, ActiveSpecies>;

export const configuration: AnimalsConfiguration = {
  chien: {
    name: activeSpeciesByKey.chien.displayName,
    imageKey: activeSpeciesByKey.chien.imageKey,
    text: `Pour le chien, la consultation porte sur la mobilité, la posture et
      le confort fonctionnel, dans les limites du cadre réglementaire. Une
      boiterie, une douleur, un traumatisme, une baisse brutale d’activité ou un
      changement de comportement peuvent nécessiter un diagnostic vétérinaire
      en premier. L’ostéopathie animale ne garantit ni la prévention des
      blessures ou des pathologies, ni l’amélioration des performances.`,
    alt: activeSpeciesByKey.chien.imageAlt,
  },
  chat: {
    name: activeSpeciesByKey.chat.displayName,
    imageKey: activeSpeciesByKey.chat.imageKey,
    text: `Chez le chat, l’observation fonctionnelle reste distincte d’un
      diagnostic vétérinaire. Une douleur, une chute, un changement d’allure,
      de respiration, d’appétit, d’élimination ou de comportement qui est
      nouveau, persistant ou marqué nécessite un avis vétérinaire. La
      consultation d’ostéopathie animale ne remplace pas ce diagnostic.`,
    alt: activeSpeciesByKey.chat.imageAlt,
  },
  nac: {
    name: activeSpeciesByKey.nac.displayName,
    imageKey: activeSpeciesByKey.nac.imageKey,
    text: `Pour les lapins, rongeurs et furets, une chute, une douleur, un
      trouble digestif ou respiratoire, une perte d’état ou un changement de
      comportement impose de contacter un vétérinaire en premier. Une
      manipulation n’est envisagée que si la situation relève du champ autorisé
      et si elle ne risque pas d’aggraver l’état ou de retarder le diagnostic.`,
    alt: activeSpeciesByKey.nac.imageAlt,
  },
};
