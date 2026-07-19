import type { ReactElement } from 'react';
import { Bilan, BreakBone, Articulation, Gate } from '../../common/icons';

type QuandConsulterProps = {
  id?: string;
};

type ReasonProps = {
  title: string;
  description: string;
  icon: () => ReactElement;
};

const reasons = [
  {
    title: 'Mobilité et posture',
    description:
      'Raideur, asymétrie ou changement d’allure, après avis vétérinaire lorsqu’un diagnostic médical est nécessaire.',
    icon: () => <Articulation />,
  },
  {
    title: 'Après un événement',
    description:
      'Après un traumatisme ou une intervention, uniquement avec l’accord vétérinaire et si l’état est compatible avec un accompagnement fonctionnel.',
    icon: () => <BreakBone />,
  },
  {
    title: 'Activité quotidienne',
    description:
      'Évaluation fonctionnelle tenant compte de l’âge et de l’activité, sans fréquence standard ni promesse de prévention ou de performance.',
    icon: () => <Bilan />,
  },
  {
    title: 'Suivi coordonné',
    description:
      'En complément du suivi vétérinaire, dans le champ des manipulations autorisées.',
    icon: () => <Gate />,
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
                Quand contacter un vétérinaire ?
              </h3>
              <div className="mt-2 text-sm text-gold-700">
                <p>
                  Contactez d’abord un vétérinaire en cas de traumatisme,
                  douleur importante ou prolongée, fièvre, abattement,
                  gonflement, difficulté respiratoire, trouble digestif ou
                  urinaire, changement brutal, ou si les symptômes persistent ou
                  s’aggravent. Aucune manipulation ne doit être réalisée si elle
                  risque d’aggraver l’état ou de retarder le diagnostic. En cas
                  d’urgence, n’attendez pas.
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
