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
    text: `Tout comme nous, le corps du chien subit les contraintes de la
      vie quotidienne. Agility, canicross, simples jeux ou promenade,
      quelle que soit son activité votre chien est soumis à des
      contraintes qui peuvent à long terme donner des lésions
      articulaires et musculaires. Mais son alimentation et le climat
      peuvent également avoir un impact sur sa santé et son bien-être.
      Un suivi ostéopathique lui permettra de soulager ses douleurs,
      corriger les lésions articulaires qui se mettent en place et
      d'éviter l'apparition de pathologies liées à l'âge, à son
      activité et à l'environnement. Les principaux motifs de
      consultation pour un chien sont les boiteries, l'arthrose, les
      troubles digestifs ainsi que les troubles du comportement. Pour
      les chiens de sport (agility, canicross, mordant etc…) ou même
      pour les chiens de concours, une consultation de préparation
      et/ou de récupération consistant en des étirements et des
      mobilisations articulaires, lui évitera les blessures, améliora
      ses performances ainsi que sa récupération et lui donnera de
      meilleures allures au travail. Tout ce qu'il faut pour que lui
      et vous puissiez continuer à prendre du plaisir dans votre
      activité !`,
    alt: activeSpeciesByKey.chien.imageAlt,
  },
  chat: {
    name: activeSpeciesByKey.chat.displayName,
    imageKey: activeSpeciesByKey.chat.imageKey,
    text: `Malgré sa souplesse légendaire, le chat est pourtant le premier
      à subir les chutes, les faux mouvements et autres petits
      traumatismes du quotidien, et il sera le dernier à montrer les
      signes d'une douleur ou d'un mal-être. Lui offrir une séance
      d'ostéopathie régulière c'est lui garantir de garder ou de
      retrouver son énergie et sa souplesse afin qu'il continue de
      jouer et de vous câliner comme un jeune chaton. Les principaux
      motifs de consultation pour un chat sont le stress chronique
      avec tic de léchage, la rééducation post-traumatique suite à une
      chute, l'arthrose, les troubles respiratoires et l'insuffisance
      rénale.`,
    alt: activeSpeciesByKey.chat.imageAlt,
  },
  nac: {
    name: activeSpeciesByKey.nac.displayName,
    imageKey: activeSpeciesByKey.nac.imageKey,
    text: `Rongeurs, lapins, furets, tous ces nouveaux animaux domestiques
      font désormais partie de nos vies et subissent tout autant que
      les autres espèces les contraintes de la vie quotidienne. Ses
      petits animaux, souvent très actifs et craintifs sont sujets aux
      chutes, aux blessures et au stress. Pour eux aussi une séance
      d'ostéopathie permet souvent de soulager les lésions et les
      douleurs afin qu'il retrouve leur pleine santé. Les principaux
      motifs de consultation pour les N.A.C sont les consultations
      post-traumatiques (chute, coincé dans la cage etc…), les
      troubles digestifs et respiratoires, une perte d'état général et
      un changement de comportement.`,
    alt: activeSpeciesByKey.nac.imageAlt,
  },
};
