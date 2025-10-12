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
  correctionImg,
}: DeroulementConsultationProps) {
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
            Une consultation en ostéopathie débute toujours par une description
            des symptômes, s'il y'en a, et une anamnèse, c'est à dire un bilan
            sur les antécédents de l'animal, sur son activité et son
            alimentation.
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
                    Examen clinique
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  L'ostéopathe vérifie si l'animal est apte à recevoir une
                  consultation ostéopathique. Pour cela il vérifie l'état
                  général de l'animal (aspect des muqueuses, présences de signes
                  fiévreux ou inflammatoire, abattement ou forte douleur etc.).
                  En cas de la présence de l'un de ces signes votre ostéopathe
                  vous dirigera vers votre vétérinaire afin d'apporter les soins
                  urgents et nécessaires à votre animal. Une fois votre animal
                  hors de danger, et en toutes connaissances de causes, votre
                  ostéopathe pourra accompagner votre animal vers son
                  rétablissement.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gold-500 text-white">
                    <p className="text-2xl">2</p>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gold-600">
                    Examen ostéopathique
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  L'ostéopathe réalise une observation dynamique, il regarde
                  l'animal se déplacer aux différentes allures afin de remarquer
                  d'éventuelles irrégularités. Il procède ensuite à une
                  palpation du corps, des tests articulaires et viscéraux afin
                  de pouvoir déterminer les zones de restrictions, les
                  sensibilités et établir son diagnostic final.
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
                      Traitement
                    </p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Une fois le diagnostic ostéopathique établi, l'ostéopathe
                    réalise l'ensemble des techniques adaptées à la lésion et à
                    votre animale, pour corriger les dysfonctions trouvées et
                    rétablir l'équilibre général du corps.
                  </dd>
                </div>

                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gold-500 text-white">
                      <p className="text-2xl">4</p>
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gold-600">
                      Suivi
                    </p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Après une séance d'ostéopathie, l'animal a besoin de 24 à
                    48h de repos durant lesquelles son corps va s'équilibrer. Le
                    corps de votre animal aura ensuite besoin de 10 à 15 jours
                    pour s'habituer à son nouveau schéma corporel, surtout si
                    les lésions traitées étaient anciennes. Durant cette période
                    votre animal peut présenter des symptômes tels que
                    irrégularité d'allure, fatigue, diarrhée légère etc. Si les
                    symptômes vous semblent trop importants ou s'ils persistent
                    au delà de 15 jours, n'hésitez pas à recontacter votre
                    ostéopathe pour une contre-visite gratuite.
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-10 -mx-4 relative lg:mt-0 lg:col-start-1">
              <svg
                className="absolute left-1/2 transform -translate-x-1/2 translate-y-16 lg:hidden"
                width="784"
                height="404"
                fill="#EEC675"
                viewBox="0 0 784 404"
                aria-hidden="true"
              >
                <defs>
                  <pattern
                    id="e80155a9-dfde-425a-b5ea-1f6fadd20131"
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
                  width="784"
                  height="404"
                  fill="url(#e80155a9-dfde-425a-b5ea-1f6fadd20131)"
                />
              </svg>
              <img
                src={correctionImg.src}
                srcSet={correctionImg.srcSet.attribute}
                alt="Ostéopathe pratiquant une manipulation vertébrale sur un cheval"
                loading="lazy"
                decoding="async"
                className="relative mx-auto rounded-lg w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
