import {
  FirstAidKitIcon,
  HeartbeatIcon,
  LeafIcon,
  ArrowUpRightIcon,
} from '@phosphor-icons/react';
import SectionHeading from '../../site/SectionHeading';
const reasons = [
  {
    title: 'Quelque chose a changé',
    description:
      'Il se déplace différemment, hésite à sauter ou semble moins à l’aise dans ses mouvements.',
    icon: HeartbeatIcon,
    detail: 'Mobilité & confort',
  },
  {
    title: 'Une nouvelle étape de vie',
    description:
      'Croissance, avancée en âge ou reprise d’activité : ses besoins évoluent, son accompagnement aussi.',
    icon: LeafIcon,
    detail: 'À chaque âge',
  },
  {
    title: 'Un suivi à construire',
    description:
      'Bilan régulier, activité sportive ou récupération après un traumatisme, en lien avec le suivi vétérinaire.',
    icon: FirstAidKitIcon,
    detail: 'Prévention & suivi',
  },
];
export default function WhenToConsult({
  id = 'quand-consulter',
}: {
  id?: string;
}) {
  return (
    <section id={id} className="section-space site-container reasons-section">
      <SectionHeading
        eyebrow="Vous le connaissez mieux que personne"
        title="Les petits signes comptent."
        description="Vous avez remarqué un changement ? Commençons par en parler."
      />
      <div className="reasons-grid">
        {reasons.map(({ title, description, icon: Icon, detail }) => (
          <article className="reason-item" data-reveal="text" key={title}>
            <div className="reason-topline">
              <Icon size={30} weight="light" aria-hidden="true" />
              <span>{detail}</span>
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <div className="contraindications">
        <FirstAidKitIcon size={24} aria-hidden="true" />
        <p>
          <strong>
            En cas de douleur importante, de fièvre ou de changement brutal, le
            vétérinaire est votre premier interlocuteur.
          </strong>{' '}
          L’ostéopathie intervient en complément, lorsque l’état de votre animal
          le permet.
        </p>
      </div>
      <a href="/#contact" className="text-link">
        Parlons de votre animal{' '}
        <ArrowUpRightIcon size={18} aria-hidden="true" />
      </a>
    </section>
  );
}
