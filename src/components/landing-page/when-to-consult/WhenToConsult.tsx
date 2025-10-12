import React from 'react';
import {
  Bilan,
  BreakBone,
  Articulation,
  Grow,
  Thunder,
  Gate,
  Lungs,
} from '../../common/icons';

type QuandConsulterProps = {
  id?: string;
};

type ReasonProps = {
  title: string;
  description: string;
  icon: () => React.ReactElement;
};

const reasons = [
  {
    title: 'Bilan annuel',
    description:
      "Une à deux consultations par an permet de prévenir des pathologies liées à la croissance, à l'activité et à l'âge",
    icon: () => <Bilan />,
  },
  {
    title: 'Réeducation',
    description:
      'Post-chirurgicale ou post-traumatique (fracture, tendinite, entorse etc.)',
    icon: () => <BreakBone />,
  },
  {
    title: 'Troubles ostéo-articulaire',
    description:
      "Boiterie, arthrose, contracture, irrégularité d'allure, dorsalgie etc.",
    icon: () => <Articulation />,
  },
  {
    title: 'Croissance',
    description: "Défaut d'aplombs, malformation, dysplasie etc.",
    icon: () => <Grow />,
  },
  {
    title: 'Troubles du comportement',
    description: 'Craintes excessives, agressivité, tics etc.',
    icon: () => <Thunder />,
  },
  {
    title: 'Sport',
    description:
      'Baisse des performances, préparation à la compétition et récupération',
    icon: () => <Gate />,
  },
  {
    title: 'Troubles fonctionnels',
    description:
      'Systèmes respiratoire, nerveux, digestif, vasculaire, reproducteur, urinaire et hormonal',
    icon: () => <Lungs />,
  },
];

export default function QuandConsulter({ id }: QuandConsulterProps) {
  return (
    <div id={id} className="bg-gradient-to-l from-canard to-canard-light">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 sm:pt-20 sm:pb-24 lg:max-w-7xl lg:pt-24 lg:px-8">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Quand consulter un ostéopathe ?
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
          {reasons.map(({ title, description, icon }) => (
            <Reason
              key={title}
              title={title}
              description={description}
              icon={icon}
            />
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-md px-4 sm:max-w-3xl sm:px-6 lg:max-w-7xl lg:px-8 pb-16 sm:pb-24">
        <div className="rounded-md bg-gold-100 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              {
                <svg
                  className="h-5 w-5 text-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gold-800">
                Contre-indications
              </h3>
              <div className="mt-2 text-sm text-gold-700">
                <p>
                  Attention, l'ostéopathie n'intervient jamais en 1ère
                  intention, si votre animal présente des signes fiévreux ou
                  inflammatoires (abattement, chaleur, douleur, gonflement) ou
                  un changement brusque de comportement, veuillez vous référer à
                  votre vétérinaire.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Reason({ title, description, icon }: ReasonProps) {
  return (
    <div>
      <div>
        <span className="flex items-center justify-center h-12 w-12 rounded-md bg-white bg-opacity-10">
          {icon()}
        </span>
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gold-500">{title}</h3>
        <p className="mt-2 text-base text-white">{description}</p>
      </div>
    </div>
  );
}
