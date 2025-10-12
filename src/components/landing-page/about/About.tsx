type ImageData = {
  src: string;
  srcSet: {
    attribute: string;
  };
  attributes?: Record<string, unknown>;
};

type QuiSuisJeProps = {
  agatheImg: ImageData;
};

export default function QuiSuisJe({ agatheImg }: QuiSuisJeProps) {
  return (
    <div className="bg-gray-50">
      <div className="mx-auto py-12 px-4 max-w-7xl sm:px-6 lg:px-8 lg:py-24">
        <div className="space-y-12 ">
          <div className="">
            <ul className="space-y-12 sm:divide-y sm:divide-gray-200 sm:space-y-0 sm:-mt-8 lg:gap-x-8 lg:space-y-0">
              <li className="sm:py-8">
                <div className="space-y-4 sm:grid sm:grid-cols-3 sm:items-start sm:gap-6 sm:space-y-0">
                  <div className="aspect-w-3 aspect-h-2 sm:aspect-w-3 sm:aspect-h-4">
                    <img
                      src={agatheImg.src}
                      srcSet={agatheImg.srcSet.attribute}
                      alt="Portrait d'Agathe Lescout, ostéopathe spécialisée dans les animaux"
                      loading="lazy"
                      decoding="async"
                      className="shadow-lg rounded-lg w-full h-full object-cover"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="space-y-4">
                      <div className="text-lg leading-6 font-medium space-y-1">
                        <h3>Agathe Lescout</h3>
                        <p className="text-gold-600">
                          Ostéopathe / Professeur à l'EAO - École d'Aquitaine
                          d'Ostéopathie
                        </p>
                      </div>
                      <div className="text-lg">
                        <p className="text-gray-500">
                          Passionnée par le bien-être animal, je suis Agathe
                          Lescout, ostéopathe dédiée aux animaux en région
                          Aquitaine. Forte d'un master en physiologie et
                          comportement animal, j'ai approfondi ma vocation en me
                          spécialisant en ostéopathie animale au CNESOA pendant
                          4 ans. <br />
                          Ma pratique englobe une gamme étendue de techniques -
                          du structurel aux étirements musculaires, en passant
                          par le viscéral, le tissulaire, les approches
                          crânio-sacrées, les techniques réflexes et
                          l'acupressure. <br />
                          <br />
                          Mon objectif ? <br />
                          Offrir des soins personnalisés et adaptés à chaque
                          animal, qu'il s'agisse de chiens, chats, NAC, chevaux
                          ou vaches, en cabinet ou à domicile. Mon engagement
                          pour l'excellence dans le bien-être animal est
                          certifié par mon inscription au Registre National
                          d'Aptitude en ostéopathie animale, validé par l'Ordre
                          National des Vétérinaires (CNOV){' '}
                          <a
                            href="https://extranet.veterinaire.fr/annuaires/osteopathes-rna"
                            target="_blank"
                            rel="noreferrer"
                          >
                            le site internet du CNOV.
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
