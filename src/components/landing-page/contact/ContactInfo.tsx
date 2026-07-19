import { Phone, Email } from '../../common/icons';
import { APPOINTMENT_MODES } from '../../../lib/constants/services';
import { BUSINESS_CONFIG } from '../../../lib/constants/site';
import ContactInfoItem from './ContactInfoItem';

export default function ContactInfo() {
  return (
    <div className="bg-gold-50 py-16 px-4 sm:px-6 lg:col-span-2 lg:px-8 lg:py-24 xl:pr-12">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-extrabold tracking-tight text-gold-500 sm:text-3xl">
          Horaires
        </h2>

        <h3 className="mt-6 text-lg font-extrabold tracking-tight text-gold-500 sm:text-xl">
          {APPOINTMENT_MODES.home.label}
        </h3>
        <p className="mt-2 text-lg leading-6 text-gray-500">
          {BUSINESS_CONFIG.hours.home.display}.
        </p>

        <h3 className="mt-6 text-lg font-extrabold tracking-tight text-gold-500 sm:text-xl">
          {APPOINTMENT_MODES.office.label}
        </h3>
        <h4 className="mt-3 text-lg leading-6 text-gray-500 font-bold">
          {APPOINTMENT_MODES.office.location} :
        </h4>
        <p className="ml-2 mt-3 text-lg leading-6 text-gray-500">
          {BUSINESS_CONFIG.hours.office.display}.
        </p>

        <dl className="mt-8 text-base text-gray-500">
          <ContactInfoItem
            icon={<Phone />}
            href={`tel:${BUSINESS_CONFIG.telephone.e164}`}
            label={BUSINESS_CONFIG.telephone.display}
            srLabel="Téléphone"
          />
          <ContactInfoItem
            icon={<Email />}
            href={`mailto:${BUSINESS_CONFIG.email}`}
            label={BUSINESS_CONFIG.email}
            srLabel="Email"
          />
        </dl>
      </div>
    </div>
  );
}
