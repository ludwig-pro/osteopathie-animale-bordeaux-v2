export const localPageLinks = [
  {
    title: 'Animaux',
    href: '/animaux',
    description:
      "Chiens, chats, chevaux, bovins et NAC: motifs fréquents de consultation et bénéfices d'un suivi ostéopathique.",
  },
  {
    title: 'Zones desservies',
    href: '/zones-desservies',
    description:
      'Interventions à domicile autour de Bordeaux et repères pour organiser une consultation selon votre secteur.',
  },
  {
    title: 'Cabinet à Bègles',
    href: '/cabinet-begles',
    description:
      "Accès, stationnement, horaires et déroulé d'une consultation en cabinet à Bègles.",
  },
  {
    title: 'FAQ',
    href: '/faq',
    description:
      "Réponses rapides sur les tarifs, la prise de rendez-vous, les indications et les contre-indications.",
  },
  {
    title: "Cas d'usage",
    href: '/cas-d-usage',
    description:
      'Exemples concrets de situations où une consultation ostéopathique peut être pertinente.',
  },
] as const;

export const animalHighlights = [
  {
    key: 'chien',
    title: 'Chiens',
    reasons: ['boiterie', 'arthrose', 'troubles digestifs', 'chien de sport'],
  },
  {
    key: 'chat',
    title: 'Chats',
    reasons: [
      'stress chronique',
      'chute ou faux mouvement',
      'arthrose',
      'troubles respiratoires',
    ],
  },
  {
    key: 'cheval',
    title: 'Chevaux',
    reasons: [
      "baisse de performance",
      "irrégularité d'allure",
      'douleurs du dos',
      'préparation ou récupération',
    ],
  },
  {
    key: 'vache',
    title: 'Bovins',
    reasons: [
      'boiterie',
      'troubles digestifs',
      'vêlage difficile',
      'animal couché',
    ],
  },
  {
    key: 'nac',
    title: 'NAC',
    reasons: [
      'post-traumatique',
      'troubles digestifs',
      'troubles respiratoires',
      "changement d'état général",
    ],
  },
] as const;

export const serviceAreas = [
  'Bordeaux',
  'Bègles',
  'Talence',
  'Pessac',
  'Mérignac',
  "Villenave-d'Ornon",
  'Gradignan',
  'Floirac',
  'Cenon',
  'Le Bouscat',
  'Bruges',
  'Eysines',
] as const;

export const faqItems = [
  {
    question: "Quand consulter un ostéopathe animalier ?",
    answer:
      "Une consultation peut être utile en prévention, après un traumatisme, en cas de boiterie, d'arthrose, de troubles fonctionnels, de baisse de performance ou de changement de comportement.",
  },
  {
    question: "Est-ce que l'ostéopathie remplace le vétérinaire ?",
    answer:
      "Non. L'ostéopathie n'intervient pas en première intention lors de signes inflammatoires, fiévreux, d'abattement ou de douleur aiguë. Dans ces situations, le vétérinaire reste le premier interlocuteur.",
  },
  {
    question: 'Quels animaux sont pris en charge ?',
    answer:
      'Les consultations concernent les chiens, chats, chevaux, bovins et nouveaux animaux de compagnie comme les lapins, rongeurs ou furets.',
  },
  {
    question: 'Les consultations se font-elles à domicile ou en cabinet ?',
    answer:
      "Les deux sont possibles. Les consultations à domicile sont proposées autour de Bordeaux sur rendez-vous, et des créneaux en cabinet sont disponibles à Bègles.",
  },
  {
    question: "Combien de temps dure une consultation d'ostéopathie animale ?",
    answer:
      "La séance comprend l'anamnèse, l'examen clinique, l'examen ostéopathique, le traitement et les conseils de suivi. La durée exacte dépend de l'animal et du motif de consultation.",
  },
  {
    question: 'Faut-il prévoir du repos après la séance ?',
    answer:
      "Oui. Un repos de 24 à 48 heures est recommandé, puis une phase d'adaptation peut durer une dizaine de jours selon l'ancienneté des restrictions traitées.",
  },
  {
    question: 'Quels sont les tarifs ?',
    answer:
      "Les tarifs varient selon l'animal et le lieu de consultation. La page d'accueil détaille les prix en cabinet et à domicile, avec un forfait déplacement autour de Bordeaux.",
  },
] as const;

export const useCases = [
  {
    title: 'Chien qui boite après une activité sportive',
    animals: 'Chiens',
    summary:
      "Après canicross, agility ou simple promenade, une gêne locomotrice peut justifier un bilan ostéopathique pour limiter les compensations.",
  },
  {
    title: 'Chat stressé ou moins mobile',
    animals: 'Chats',
    summary:
      'Un chat qui saute moins, se cache davantage ou présente des tics de léchage peut bénéficier d’une consultation adaptée à sa sensibilité.',
  },
  {
    title: 'Cheval en baisse de performance',
    animals: 'Chevaux',
    summary:
      "Une irrégularité d'allure, une difficulté à l'incurvation ou un changement de comportement au travail sont des motifs fréquents de suivi.",
  },
  {
    title: 'Bovin après vêlage difficile',
    animals: 'Bovins',
    summary:
      "Après la mise bas, l'ostéopathie peut s'intégrer à la prise en charge globale du troupeau pour accompagner récupération et confort locomoteur.",
  },
  {
    title: 'Lapin ou furet après une chute',
    animals: 'NAC',
    summary:
      "Les petits animaux sont exposés aux faux mouvements et au stress. Une consultation peut aider après un épisode traumatique ou un changement d'état général.",
  },
] as const;
