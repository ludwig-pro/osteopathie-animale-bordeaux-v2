import {
  ArrowRightIcon,
  HeartIcon,
  MapPinIcon,
  PhoneIcon,
} from '@phosphor-icons/react';
import { pushDataLayerEvent } from '../../../lib/analytics';
import type { ResponsiveImageData } from '../../../lib/responsiveImage';
import BookingLink from '../../site/BookingLink';

type HeroProps = { careImage: ResponsiveImageData; portrait: string };

export default function Hero({ careImage, portrait }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-grid site-container">
        <div className="hero-copy" data-reveal="intro">
          <p className="eyebrow">
            <span className="status-dot" /> Ostéopathie animale · Bordeaux &
            Gironde
          </p>
          <h1 id="hero-title">
            Bien bouger.
            <br />
            <span>Bien vivre.</span>
          </h1>
          <p className="hero-description">
            Parce que leur bien-être se joue aussi dans les petits mouvements du
            quotidien.
          </p>
          <p className="hero-detail">
            Un accompagnement manuel, attentif et adapté à votre animal. Au
            cabinet à Bègles ou à domicile en Gironde.
          </p>
          <div className="hero-actions">
            <BookingLink source="hero" testId="cta-booking-online" />
            <a
              href="#contact"
              data-testid="cta-booking-phone"
              className="hero-phone"
              onClick={() =>
                pushDataLayerEvent('contact_section_cta_clicked', {
                  source: 'hero',
                })
              }
            >
              <PhoneIcon size={18} aria-hidden="true" /> Une question ?
              Parlons-en
            </a>
          </div>
          <a href="#a-propos" className="hero-practitioner">
            <img src={portrait} alt="" width={56} height={56} />
            <span>
              <strong>Agathe Lescout</strong>
              <span>Ostéopathe animalier & enseignante</span>
            </span>
            <ArrowRightIcon size={20} aria-hidden="true" />
          </a>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit" aria-hidden="true" />
          <img
            {...careImage}
            alt="Une main accompagne doucement le mouvement de la patte d’un chat"
            className="hero-photo"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className="hero-care-note">
            <span className="care-note-icon">
              <HeartIcon size={28} weight="light" aria-hidden="true" />
            </span>
            <span>
              Du lien. De l’écoute.<strong>Du soin, à leur rythme.</strong>
            </span>
          </div>
          <p className="hero-caption">
            <MapPinIcon size={15} aria-hidden="true" /> Bègles, Bordeaux et
            leurs alentours
          </p>
        </div>
      </div>
      <div className="trust-strip site-container">
        <span>Une approche adaptée à chaque animal</span>
        <span>Inscrite au Registre National d’Aptitude</span>
        <span>En complément du suivi vétérinaire</span>
      </div>
    </section>
  );
}
