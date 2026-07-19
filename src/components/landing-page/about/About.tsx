import {
  ACTIVE_SPECIES,
  APPOINTMENT_MODES,
} from '../../../lib/constants/services';
import { BUSINESS_CONFIG } from '../../../lib/constants/site';

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
  const activeSpecies = new Intl.ListFormat('fr', {
    style: 'long',
    type: 'conjunction',
  }).format(
    ACTIVE_SPECIES.map((animal) =>
      animal.key === 'nac' ? 'NAC' : `${animal.key}s`
    )
  );

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
                      alt={`Portrait d’${BUSINESS_CONFIG.practitionerName}, praticienne en ostéopathie animale`}
                      width={800}
                      height={1000}
                      loading="lazy"
                      decoding="async"
                      className="shadow-lg rounded-lg w-full h-full object-cover"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="space-y-4">
                      <div className="text-lg leading-6 font-medium space-y-1">
                        <h2 className="text-lg">
                          {BUSINESS_CONFIG.practitionerName}
                        </h2>
                        <p className="text-gold-600">
                          {BUSINESS_CONFIG.practitionerJobTitle}
                        </p>
                      </div>
                      <div className="text-lg">
                        <p className="text-gray-500">
                          Je suis {BUSINESS_CONFIG.practitionerName},{' '}
                          {BUSINESS_CONFIG.registration.wording.toLowerCase()}.
                          Mon numéro d'inscription est{' '}
                          <strong>
                            {BUSINESS_CONFIG.registration.registryNumber}
                          </strong>
                          . L'annuaire actuel de l'Ordre national des
                          vétérinaires recense cette inscription depuis le 22
                          novembre 2018, après délibération du 21 novembre 2018.{' '}
                          <a
                            href={
                              BUSINESS_CONFIG.registration.officialDirectoryUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            Consulter l'annuaire officiel
                          </a>
                          . <br />
                          <br />
                          Je reçois les {activeSpecies}{' '}
                          {APPOINTMENT_MODES.office.label.toLowerCase()} à{' '}
                          {APPOINTMENT_MODES.office.location} et me déplace{' '}
                          {APPOINTMENT_MODES.home.label.toLowerCase()} dans la{' '}
                          {APPOINTMENT_MODES.home.location.toLowerCase()}, sur
                          rendez-vous.
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
