import {
  CalendarCheckIcon,
  FirstAidKitIcon,
  BoneIcon,
  PlantIcon,
  HeartIcon,
  HorseIcon,
  HeartbeatIcon,
  InfoIcon,
} from '@phosphor-icons/react';
import SectionHeading from '../../site/SectionHeading';

const reasons = [
  {
    title: 'Bilan annuel',
    description:
      "Une à deux consultations par an permet de prévenir des pathologies liées à la croissance, à l'activité et à l'âge",
    icon: () => <CalendarCheckIcon weight="light" aria-hidden="true" />,
  },
  {
    title: 'Réeducation',
    description:
      'Post-chirurgicale ou post-traumatique (fracture, tendinite, entorse etc.)',
    icon: () => <FirstAidKitIcon weight="light" aria-hidden="true" />,
  },
  {
    title: 'Troubles ostéo-articulaire',
    description:
      "Boiterie, arthrose, contracture, irrégularité d'allure, dorsalgie etc.",
    icon: () => <BoneIcon weight="light" aria-hidden="true" />,
  },
  {
    title: 'Croissance',
    description: "Défaut d'aplombs, malformation, dysplasie etc.",
    icon: () => <PlantIcon weight="light" aria-hidden="true" />,
  },
  {
    title: 'Troubles du comportement',
    description: 'Craintes excessives, agressivité, tics etc.',
    icon: () => <HeartIcon weight="light" aria-hidden="true" />,
  },
  {
    title: 'Sport',
    description:
      'Baisse des performances, préparation à la compétition et récupération',
    icon: () => <HorseIcon weight="light" aria-hidden="true" />,
  },
  {
    title: 'Troubles fonctionnels',
    description:
      'Systèmes respiratoire, nerveux, digestif, vasculaire, reproducteur, urinaire et hormonal',
    icon: () => <HeartbeatIcon weight="light" aria-hidden="true" />,
  },
];

export default function WhenToConsult({
  id = 'quand-consulter',
}: {
  id?: string;
}) {
  return (
    <section id={id} className="section-space site-container">
      <SectionHeading
        eyebrow="Être attentif à son bien-être"
        title="Quand consulter un ostéopathe ?"
      />
      <div className="reasons-grid">
        {reasons.map(({ title, description, icon }, index) => (
          <div className="reason-item" key={title} data-reveal="text">
            <div className="reason-topline">
              <span aria-hidden="true">0{index + 1}</span>
              {icon()}
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        ))}
      </div>
      <div className="contraindications">
        <InfoIcon size={22} aria-hidden="true" />
        <div>
          <h3>Contre-indications</h3>
          <p>
            Attention, l'ostéopathie n'intervient jamais en 1ère intention, si
            votre animal présente des signes fiévreux ou inflammatoires
            (abattement, chaleur, douleur, gonflement) ou un changement brusque
            de comportement, veuillez vous référer à votre vétérinaire.
          </p>
        </div>
      </div>
    </section>
  );
}
