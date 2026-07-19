import EditorialReview from '../../common/EditorialReview';

type ImageData = {
  src: string;
  srcSet: {
    attribute: string;
  };
  attributes?: Record<string, unknown>;
};

type OsteopathieAnimaleProps = {
  id?: string;
  bulldogImg: ImageData;
};

export default function OsteopathieAnimale({
  id,
  bulldogImg,
}: OsteopathieAnimaleProps) {
  return (
    <div id={id} className="relative bg-white pt-16 pb-32 overflow-hidden">
      <div className="relative">
        <div className="lg:mx-auto lg:max-w-7xl lg:px-8 lg:grid lg:grid-cols-2 lg:grid-flow-col-dense lg:gap-24">
          <div className="px-4 max-w-xl mx-auto sm:px-6 lg:py-16 lg:max-w-none lg:mx-0 lg:px-0">
            <div>
              <div className="mt-6">
                <h2 className="text-3xl font-extrabold tracking-tight text-gold-500">
                  Qu’est-ce que l’ostéopathie animale ?
                </h2>
                <p className="mt-4 text-lg text-gray-500">
                  Les actes d’ostéopathie animale sont des manipulations et
                  mobilisations musculo-squelettiques ou myo-fasciales,
                  exclusivement manuelles, externes, non instrumentales et non
                  forcées. Leur champ est limité aux troubles fonctionnels. Les
                  pathologies organiques qui nécessitent un diagnostic ou un
                  traitement vétérinaire sont exclues de ce champ.
                </p>
                <p className="mt-4 text-lg text-gray-500">
                  Avant toute manipulation, la praticienne vérifie que la
                  situation relève de ce champ. Elle oriente vers un vétérinaire
                  lorsqu’un diagnostic ou un traitement est nécessaire, lorsque
                  les symptômes persistent ou s’aggravent, ou lorsque la
                  situation est hors champ. L’ostéopathie animale ne remplace
                  pas le suivi vétérinaire.
                </p>
                <EditorialReview />
              </div>
            </div>
          </div>
          <div className="mt-12 sm:mt-16 lg:mt-0">
            <div className="pl-4 -mr-48 sm:pl-6 md:-mr-16 lg:px-0 lg:m-0 lg:relative lg:h-full">
              <img
                src={bulldogImg.src}
                srcSet={bulldogImg.srcSet.attribute}
                alt="Bulldog anglais recevant un soin ostéopathique"
                width={1200}
                height={800}
                loading="lazy"
                decoding="async"
                className="w-full rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 lg:absolute lg:left-0 lg:h-full lg:w-auto lg:max-w-none object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
