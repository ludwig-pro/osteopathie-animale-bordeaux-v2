export type AnimalKey = 'chien' | 'chat' | 'cheval' | 'vache' | 'nac';

export type AnimalConfig = {
  name: string;
  imageKey: string;
  text: string;
  alt: string;
};

export type AnimalsConfiguration = Record<AnimalKey, AnimalConfig>;

export const configuration: AnimalsConfiguration = {
  chien: {
    name: 'Le chien',
    imageKey: 'sectionChien',
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
    alt: 'deux chiens',
  },
  chat: {
    name: 'Le chat',
    imageKey: 'sectionChat',
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
    alt: 'un chat',
  },
  cheval: {
    name: 'Le cheval',
    imageKey: 'sectionCheval',
    text: `"Nous avons presque oublié combien il est étonnant qu'un animal
      aussi grand, aussi puissant et aussi intelligent puisse accepter
      sur son dos un autre animal tellement plus faible!" Peter Gray.
      Nombreuses sont les activités équestres, et les contraintes qui
      s'appliquent sur le dos, les articulations et le système
      physiologique du cheval sont plus importantes que pour tout
      autre espèce domestique. La domestication du cheval s'accompagne
      par des changements dans ses habitudes pouvant entraîner des
      pathologies tels que lombalgie, ensellement, troubles digestifs,
      boiterie etc… Bien souvent ses pathologies s'accompagnent d'une
      baisse de performance, d'un changement de comportement ou d'une
      irrégularité d'allure. En équitation, les professionnels ou les
      amateurs, font de plus en plus appel à des ostéopathes
      animaliers pour soulager les douleurs de leur cheval, le
      préparer à des épreuves importantes ou améliorer ses
      performances. Ils peuvent également le consulter en prévention
      afin d'éviter tendinites, arthroses ou entorses à répétition.`,
    alt: 'un cheval',
  },
  vache: {
    name: 'La vache',
    imageKey: 'sectionVache',
    text: `Qu'elle soit laitière ou allaitante la vache en milieu d'élevage
      est souvent sujette aux glissades, peut se coincer dans les
      logettes ou les cornadis et ainsi se blesser, se bloquer le dos
      et se mettre à boiter. En conséquence, la douleur et la fatigue
      peut affaiblir l'animal, diminuer son état général et entraîner
      des pertes en rendement. Les lésions sont également fréquentes
      lors de la mise bas, surtout lorsque cette dernière a été
      difficile pour la mère ou pour le veau. L'ostéopathie peut
      réellement jouer un rôle important dans le bien-être animal dans
      le milieu de l'élevage. L'éleveur faisant appel régulièrement à
      un ostéopathe peut travailler à la qualité de ses produits et le
      bien-être de ses animaux. Les principaux motifs de consultation
      pour les bovins sont les boiteries, les troubles digestifs et
      respiratoires, les vêlages difficiles, la vache couchée, le veau
      qui ne tête pas ou qui ne se lève pas.`,
    alt: 'une vache',
  },
  nac: {
    name: 'Les nouveaux animaux de compagnie',
    imageKey: 'sectionLapin',
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
    alt: 'un lapin',
  },
};
