import {
  ACTIVE_SPECIES,
  APPOINTMENT_MODES,
} from '../../../lib/constants/services';

type ImageData = {
  src: string;
  srcSet: {
    attribute: string;
  };
  attributes?: Record<string, unknown>;
};

type DeroulementConsultationProps = {
  youngcatImg: ImageData;
  correctionImg: ImageData;
};

export default function DeroulementConsultation({
  youngcatImg,
  correctionImg: _correctionImg,
}: DeroulementConsultationProps) {
  const activeSpecies = new Intl.ListFormat('fr', {
    style: 'long',
    type: 'conjunction',
  }).format(
    ACTIVE_SPECIES.map((animal) =>
      animal.key === 'nac' ? 'NAC' : `${animal.key}s`
    )
  );

  return (
    <div className="py-16 bg-gold-50 overflow-hidden lg:py-24">
      <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-7xl">
        <svg
          className="hidden lg:block absolute left-full transform -translate-x-1/2 -translate-y-1/4"
          width="404"
          height="784"
          fill="#EEC675"
          viewBox="0 0 404 784"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="b1e6e422-73f8-40a6-b5d9-c8586e37e0e7"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <rect
                x="0"
                y="0"
                width="4"
                height="4"
                className="text-gold-200"
                fill="currentColor"
              />
            </pattern>
          </defs>
          <rect
            width="404"
            height="784"
            fill="url(#b1e6e422-73f8-40a6-b5d9-c8586e37e0e7)"
          />
        </svg>

        <div className="relative">
          <h2 className="text-center text-3xl leading-8 font-extrabold tracking-tight text-gold-600 sm:text-4xl">
            Déroulement d'une consultation
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-center text-xl text-gray-500">
            La consultation débute par le recueil du motif, des antécédents, de
            l’activité et des informations vétérinaires utiles afin de vérifier
            que la situation relève du champ de l’ostéopathie animale.
          </p>
        </div>

        <div className="relative mt-12 lg:mt-24 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
          <div className="relative">
            <dl className="mt-10 space-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gold-500 text-white">
                    <p className="text-2xl">1</p>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gold-600">
                    Évaluation préalable
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  La praticienne observe l’état général de l’animal. Si un
                  diagnostic ou un traitement médical est nécessaire, si la
                  situation est hors champ, ou si une manipulation risque
                  d’aggraver l’état ou de gêner le diagnostic, elle ne poursuit
                  pas et oriente vers un vétérinaire.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gold-500 text-white">
                    <p className="text-2xl">2</p>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gold-600">
                    Observation fonctionnelle
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Avec votre accord, la praticienne observe les déplacements,
                  puis procède à la palpation et à l’évaluation de la mobilité.
                  Cette observation peut conduire à un diagnostic ostéopathique,
                  distinct du diagnostic vétérinaire.
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-10 -mx-4 relative lg:mt-0" aria-hidden="true">
            <svg
              className="absolute left-1/2 transform -translate-x-1/2 translate-y-16 lg:hidden"
              width="784"
              height="404"
              fill="none"
              viewBox="0 0 784 404"
            >
              <defs>
                <pattern
                  id="ca9667ae-9f92-4be7-abcb-9e3d727f2941"
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    x="0"
                    y="0"
                    width="4"
                    height="4"
                    className="text-gray-200"
                    fill="currentColor"
                  />
                </pattern>
              </defs>
              <rect
                width="784"
                height="404"
                fill="url(#ca9667ae-9f92-4be7-abcb-9e3d727f2941)"
              />
            </svg>
            <img
              src={youngcatImg.src}
              srcSet={youngcatImg.srcSet.attribute}
              alt="Chaton tigré donnant la patte lors d'un examen ostéopathique"
              width={1200}
              height={800}
              loading="lazy"
              decoding="async"
              className="relative mx-auto rounded-lg w-full object-cover"
            />
          </div>
        </div>

        <svg
          className="hidden lg:block absolute right-full transform translate-x-1/2 translate-y-12"
          width="404"
          height="784"
          fill="none"
          viewBox="0 0 404 784"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="64e643ad-2176-4f86-b3d7-f2c5da3b6a6d"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <rect
                x="0"
                y="0"
                width="4"
                height="4"
                className="text-gray-200"
                fill="currentColor"
              />
            </pattern>
          </defs>
          <rect
            width="404"
            height="784"
            fill="url(#64e643ad-2176-4f86-b3d7-f2c5da3b6a6d)"
          />
        </svg>

        <div className="relative mt-12 sm:mt-16 lg:mt-24">
          <div className="lg:grid lg:grid-flow-row-dense lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div className="lg:col-start-2">
              <dl className="mt-10 space-y-10">
                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gold-500 text-white">
                      <p className="text-2xl">3</p>
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gold-600">
                      Manipulations
                    </p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Les manipulations sont exclusivement manuelles, externes,
                    non instrumentales et non forcées. Elles sont adaptées aux
                    réactions de l’animal et interrompues en cas de douleur
                    prolongée.
                  </dd>
                </div>

                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gold-500 text-white">
                      <p className="text-2xl">4</p>
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gold-600">
                      Consignes et vigilance
                    </p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Les consignes de suivi sont individualisées : il n’existe
                    pas de délai universel de repos ou d’effet. En cas de
                    douleur, d’apparition, de persistance ou d’aggravation de
                    symptômes, contactez un vétérinaire et informez la
                    praticienne. En cas d’urgence, n’attendez pas.
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-10 -mx-4 relative lg:mt-0 lg:col-start-1">
              <div className="relative mx-auto rounded-lg bg-white p-8 shadow-lg ring-1 ring-black ring-opacity-5 sm:p-12">
                <h3 className="text-2xl font-extrabold text-gold-600">
                  Consultations sur rendez-vous
                </h3>
                <p className="mt-4 text-lg text-gray-600">
                  Pour {activeSpecies},{' '}
                  {APPOINTMENT_MODES.office.label.toLowerCase()} à{' '}
                  {APPOINTMENT_MODES.office.location} ou{' '}
                  {APPOINTMENT_MODES.home.label.toLowerCase()} dans la{' '}
                  {APPOINTMENT_MODES.home.location.toLowerCase()}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
