import { useState } from 'react';
import {
  APPOINTMENT_MODES,
  PRICING_CONFIG,
  type AppointmentModeKey,
  type PricingService,
} from '../../../lib/constants/services';

type ImageData = {
  src: string;
  srcSet: {
    attribute: string;
  };
  attributes?: Record<string, unknown>;
};

type PrixProps = {
  id?: string;
  chienetchatImg: ImageData;
  furetImg: ImageData;
  forfaitImg: ImageData;
};

type CardProps = {
  service: PricingService;
  mode: AppointmentModeKey;
  image: ImageData;
};

function classNames(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function Prix({ id, chienetchatImg, furetImg, forfaitImg }: PrixProps) {
  const [mode, setMode] = useState<AppointmentModeKey>('office');
  const images: Record<PricingService['imageKey'], ImageData> = {
    chienetchat: chienetchatImg,
    furet: furetImg,
    forfait: forfaitImg,
  };

  return (
    <div id={id} className="bg-white">
      <div className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h2 className="text-5xl font-extrabold text-gold-500 sm:text-center">
            Tarifs
          </h2>

          <div className="relative self-center mt-6 bg-gold-200 rounded-lg p-0.5 flex sm:mt-8">
            {Object.values(APPOINTMENT_MODES).map((appointmentMode) => (
              <button
                key={appointmentMode.key}
                type="button"
                data-appointment-mode={appointmentMode.key}
                aria-pressed={mode === appointmentMode.key}
                className={classNames(
                  'relative w-1/2 rounded-md py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-gold-500 focus:z-10 sm:w-auto sm:px-8 shadow-sm border',
                  mode === appointmentMode.key
                    ? 'bg-white border-gold-300 text-gray-900'
                    : 'border-transparent text-gray-700'
                )}
                onClick={() => setMode(appointmentMode.key)}
              >
                {appointmentMode.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-24 justify-center">
          <p
            className="mt-4 max-w-xl text-gray-600 text-md sm:text-center"
            data-testid="travel-fee"
          >
            Pour une consultation {APPOINTMENT_MODES.home.label.toLowerCase()}{' '}
            dans la {APPOINTMENT_MODES.home.location.toLowerCase()}, un forfait
            déplacement de{' '}
            <span className="font-bold text-lg text-gray-900">
              {PRICING_CONFIG.travelFeeEur} €
            </span>{' '}
            s'ajoute au tarif de la consultation.
          </p>
        </div>
        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {PRICING_CONFIG.services.map((service) => (
            <Card
              service={service}
              key={service.id}
              mode={mode}
              image={images[service.imageKey]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ service, mode, image }: CardProps) {
  const isHome = mode === 'home';

  return (
    <article
      className="flex flex-col rounded-lg shadow-lg overflow-hidden"
      data-pricing-service={service.id}
      data-active-species={service.activeSpecies.join(',')}
    >
      <div className="flex-shrink-0">
        <img
          src={image.src}
          srcSet={image.srcSet.attribute}
          alt={service.imageAlt}
          width={800}
          height={400}
          loading="lazy"
          decoding="async"
          className="h-48 w-full object-cover"
        />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex-none">
          <h3 className="text-xl leading-6 font-bold text-gold-500">
            {service.title}
          </h3>
        </div>
        <div className="flex flex-1 flex-col content-end justify-end">
          {service.conditions && (
            <ul className="mt-4 text-lg leading-6 font-bold text-gray-700">
              {service.conditions.map((condition) => (
                <li className="mt-2" key={condition}>
                  {condition}
                </li>
              ))}
            </ul>
          )}
          {service.variants ? (
            service.variants.map(({ description, amountEur }, index) => (
              <p
                key={`${service.id}-${description}`}
                className={classNames(
                  'text-right',
                  index === 0 ? 'mt-4' : 'mt-2'
                )}
              >
                <span className="text-lg font-bold text-gray-700">
                  {description}{' '}
                </span>
                <span className="text-4xl font-extrabold text-gold-500">
                  {amountEur}
                </span>
                <span className="text-base font-medium text-gold-600">
                  €{isHome && '*'}
                </span>
              </p>
            ))
          ) : (
            <p className="mt-4 text-right">
              <span className="text-4xl font-extrabold text-gold-500">
                {service.amountEur}
              </span>
              <span className="text-base font-medium text-gold-600">
                €{isHome && '*'}
              </span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default Prix;
