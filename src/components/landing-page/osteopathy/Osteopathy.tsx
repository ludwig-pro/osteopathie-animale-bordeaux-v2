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
                  Qu'est ce que l'ostéopathie pour les animaux ?
                </h2>
                <p className="mt-4 text-lg text-gray-500">
                  L'ostéopathie animale est une thérapie faisant appel à des
                  manipulations douces afin de soulager l'animal et rétablir
                  l'équilibre du corps. Souvent associée au "cracking", on pense
                  souvent qu'elle ne concerne que les individus vieillissants
                  sujets à l'arthrose ou aux sportifs de compétitions. Pourtant
                  les applications et les techniques sont nombreuses.
                  Structurel, crânien, tissulaire, étirement musculaire,
                  viscéral etc... toutes ces techniques font parties de
                  l'ostéopathie et s'appliquent sur l'ensemble du corps de
                  l'animal que ce soit au niveau articulaire, musculaire ou
                  viscéral. Et ce quel que soit son âge ou son activité ! Mais
                  l'ostéopathie est avant tout une thérapie préventive ! Une
                  consultation régulière garantie à votre animal une bonne santé
                  tout au long de l'année et prévient des pathologies liées à
                  l'âge (arthrose, insuffisance rénale etc...) ou à l'activité
                  (entorse, rupture des ligaments croisés etc...) Depuis avril
                  2017 l'ostéopathie animale est réglementée par l'Ordre
                  National des Vétérinaires, vous assurant ainsi d'avoir un
                  thérapeute compétent et des consultations de qualités pour le
                  bien être de votre animal.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-12 sm:mt-16 lg:mt-0">
            <div className="pl-4 -mr-48 sm:pl-6 md:-mr-16 lg:px-0 lg:m-0 lg:relative lg:h-full">
              <img
                src={bulldogImg.src}
                srcSet={bulldogImg.srcSet.attribute}
                alt="Bulldog anglais recevant un soin ostéopathique"
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
