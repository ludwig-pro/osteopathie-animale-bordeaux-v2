import type { ImageMetadata } from 'astro';
import { configuration } from './animals';
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
};

export const animalPages: AnimalPageData[] = [
  {
    slug: 'chien',
    label: 'Le chien',
    subject: 'le chien',
    specialty: 'Ostéopathie canine',
    image: chien,
    pricingId: 'chien-chat',
  },
  {
    slug: 'chat',
    label: 'Le chat',
    subject: 'le chat',
    specialty: 'Ostéopathie féline',
    image: chat,
    pricingId: 'chien-chat',
  },
  {
    slug: 'cheval',
    label: 'Le cheval',
    subject: 'le cheval',
    specialty: 'Ostéopathie équine',
    image: cheval,
    pricingId: 'cheval',
  },
  {
    slug: 'nac',
    label: 'Les NAC',
    subject: 'les NAC',
    specialty: 'Nouveaux animaux de compagnie',
    image: nac,
    pricingId: 'nac',
  },
];

export function animalCopy(slug: AnimalSlug) {
  const text = configuration[slug].text.replace(/\s+/g, ' ').trim();
  const leadEnd =
    slug === 'cheval'
      ? text.indexOf('Peter Gray.') + 'Peter Gray.'.length
      : text.indexOf('. ') + 1;
  const lead = text.slice(0, leadEnd);
  const sentences = text
    .slice(leadEnd)
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ü])/);
  const paragraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) {
    paragraphs.push(sentences.slice(index, index + 2).join(' '));
  }
  return { lead, paragraphs, alt: configuration[slug].alt };
}
