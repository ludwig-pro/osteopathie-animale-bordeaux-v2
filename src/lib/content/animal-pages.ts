import type { ImageMetadata } from 'astro';
import chien from '../../images/sectionChien.jpg';
import chat from '../../images/sectionChat.jpg';
import cheval from '../../images/sectionCheval.jpg';
import nac from '../../images/sectionLapin.jpg';

export type AnimalSlug = 'chien' | 'chat' | 'cheval' | 'nac';
export type AnimalPageData = {
  slug: AnimalSlug;
  label: string;
  subject: string;
  specialty: string;
  image: ImageMetadata;
  pricingId: string;
  cardDescription: string;
  lead: string;
  paragraphs: string[];
};

export const animalPages: AnimalPageData[] = [
  {
    slug: 'chien',
    label: 'Le chien',
    subject: 'le chien',
    specialty: 'Ostéopathie canine',
    image: chien,
    pricingId: 'chien-chat',
    cardDescription: 'À ses côtés, à chaque âge',
    lead: 'Du chiot plein d’énergie au compagnon qui prend de l’âge, chaque chien a sa façon de bouger. Son accompagnement s’adapte à son quotidien.',
    paragraphs: [
      'Une hésitation à sauter, une démarche inhabituelle ou un changement d’activité sont des observations utiles à partager. L’examen ostéopathique permet d’évaluer la mobilité de votre chien et de rechercher d’éventuelles restrictions.',
      'La séance tient compte de son âge, de son activité, de ses antécédents et de sa sensibilité. Les techniques manuelles et les conseils de suivi sont individualisés, en complément de sa prise en charge vétérinaire.',
      'En cas de douleur aiguë, de fièvre ou de changement brutal, prenez d’abord conseil auprès de votre vétérinaire. Nous pourrons ensuite envisager un accompagnement lorsque son état le permet.',
    ],
  },
  {
    slug: 'chat',
    label: 'Le chat',
    subject: 'le chat',
    specialty: 'Ostéopathie féline',
    image: chat,
    pricingId: 'chien-chat',
    cardDescription: 'Avec toute sa sensibilité',
    lead: 'Discret dans ses habitudes, le chat exprime parfois son inconfort par de petits changements. L’écouter commence par l’observer.',
    paragraphs: [
      'Votre chat saute moins haut, change de posture ou semble moins à l’aise ? Vos observations nous aident à comprendre son quotidien. La consultation associe un échange avec vous, une observation et un examen adapté à sa tolérance.',
      'La manipulation respecte sa sensibilité et son rythme. Si votre chat est particulièrement craintif, parlons-en avant la séance pour préparer au mieux notre rencontre.',
      'L’ostéopathie complète le suivi vétérinaire. Une douleur importante, un abattement ou une modification soudaine de son comportement doivent d’abord être évalués par votre vétérinaire.',
    ],
  },
  {
    slug: 'cheval',
    label: 'Le cheval',
    subject: 'le cheval',
    specialty: 'Ostéopathie équine',
    image: cheval,
    pricingId: 'cheval',
    cardDescription: 'Du loisir à la pratique sportive',
    lead: 'Au pré comme au travail, la qualité du mouvement compte. L’accompagnement du cheval prend en compte son activité, son histoire et son environnement.',
    paragraphs: [
      'Une irrégularité d’allure, une raideur ou une difficulté inhabituelle au travail méritent votre attention. L’observation du cheval en mouvement et les tests de mobilité orientent l’examen ostéopathique.',
      'La séance et les conseils de suivi s’adaptent à son âge et à sa pratique, du loisir au sport. Les techniques manuelles s’inscrivent dans une prise en charge globale, en lien avec les professionnels qui le suivent.',
      'Une boiterie récente, une douleur aiguë ou un signe général inhabituel doivent d’abord être évalués par votre vétérinaire. Contactez-moi pour échanger sur la situation et organiser une intervention.',
    ],
  },
  {
    slug: 'nac',
    label: 'Les NAC',
    subject: 'les NAC',
    specialty: 'Nouveaux animaux de compagnie',
    image: nac,
    pricingId: 'nac',
    cardDescription: 'Petits formats, grande attention',
    lead: 'Lapins, furets et autres petits compagnons ont eux aussi leurs besoins. Leur taille et leur sensibilité demandent une approche particulièrement attentive.',
    paragraphs: [
      'Avant la séance, nous échangeons sur l’espèce de votre animal, ses habitudes et les changements observés. Cela permet de préparer une approche et des conditions de manipulation adaptées.',
      'L’examen et les gestes manuels tiennent compte de son anatomie et de sa tolérance. Son confort reste prioritaire tout au long de la rencontre.',
      'Une baisse d’appétit, un abattement ou une douleur peuvent nécessiter une consultation vétérinaire rapide. L’ostéopathie vient en complément et ne remplace pas les soins vétérinaires.',
    ],
  },
];

export function animalCopy(slug: AnimalSlug) {
  const animal = animalPages.find((page) => page.slug === slug)!;
  return {
    lead: animal.lead,
    paragraphs: animal.paragraphs,
    alt: animal.label,
  };
}
