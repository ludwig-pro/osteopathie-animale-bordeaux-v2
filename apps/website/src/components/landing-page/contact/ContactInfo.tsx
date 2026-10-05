import { EnvelopeSimpleIcon, PhoneIcon } from '@phosphor-icons/react';

export default function ContactInfo() {
  return (
    <div className="contact-info">
      <p className="eyebrow">Restons en contact</p>
      <h2>Horaires</h2>
      <h3>À domicile</h3>
      <p>
        <strong>Sur rendez-vous, </strong>je m'adapte à votre emploi du temps du
        lundi au vendredi.
      </p>
      <h3>En cabinet</h3>
      <p>
        <strong>Bègles :</strong>
        <br />
        Lundi et Vendredi : 9h à 19h
      </p>
      <div className="contact-links">
        <a href="tel:+33665550792">
          <PhoneIcon size={19} aria-hidden="true" />
          <span>0665550792</span>
        </a>
        <a href="mailto:agathe.lescout.osteo@gmail.com">
          <EnvelopeSimpleIcon size={19} aria-hidden="true" />
          <span>agathe.lescout.osteo@gmail.com</span>
        </a>
      </div>
    </div>
  );
}
