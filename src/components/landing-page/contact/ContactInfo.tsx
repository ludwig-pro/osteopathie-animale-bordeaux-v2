import { Phone, Email } from '../../common/icons';
import ContactInfoItem from './ContactInfoItem';

export default function ContactInfo() {
  return (
    <div className="bg-gold-50 py-16 px-4 sm:px-6 lg:col-span-2 lg:px-8 lg:py-24 xl:pr-12">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-extrabold tracking-tight text-gold-500 sm:text-3xl">
          Horaires
        </h2>

        <h3 className="mt-6 text-lg font-extrabold tracking-tight text-gold-500 sm:text-xl">
          À domicile
        </h3>
        <p className="mt-2 text-lg leading-6 text-gray-500">
          <span className="font-bold">Sur rendez-vous, </span>je m'adapte à
          votre emploi du temps du lundi au vendredi.
        </p>

        <h3 className="mt-6 text-lg font-extrabold tracking-tight text-gold-500 sm:text-xl">
          En cabinet
        </h3>
        <h4 className="mt-3 text-lg leading-6 text-gray-500 font-bold">
          Bègles :
        </h4>
        <p className="ml-2 mt-3 text-lg leading-6 text-gray-500">
          Lundi et Jeudi : 9h à 19h
        </p>

        <dl className="mt-8 text-base text-gray-500">
          <ContactInfoItem
            icon={<Phone />}
            href="tel:+33665550792"
            label="0665550792"
            srLabel="Téléphone"
          />
          <ContactInfoItem
            icon={<Email />}
            href="mailto:agathe.lescout.osteo@gmail.com"
            label="agathe.lescout.osteo@gmail.com"
            srLabel="Email"
          />
        </dl>
      </div>
    </div>
  );
}
