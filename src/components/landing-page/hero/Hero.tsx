import {
  ArrowDownIcon,
  CertificateIcon,
  HandHeartIcon,
  MapPinIcon,
  PawPrintIcon,
  PhoneIcon,
} from '@phosphor-icons/react';
import { pushDataLayerEvent } from '../../../lib/analytics';
import BookingLink from '../../site/BookingLink';

type HeroProps = {
  backgroundSources?: {
    webp?: { src: string; srcset: string };
    fallback?: string;
  };
  backgroundAlt?: string;
};

export default function Hero({
  backgroundSources,
  backgroundAlt = '',
}: HeroProps) {
  const { webp, fallback } = backgroundSources ?? {};
  return (
    <section className="hero site-container" aria-labelledby="hero-title">
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">
            <MapPinIcon size={14} aria-hidden="true" /> Bordeaux · Bègles ·
            Gironde
          </p>
          <h1 id="hero-title">
            <span>Agathe Lescout,</span>
            <span>ostéopathe</span>
            <em>animalier.</em>
          </h1>
          <p className="hero-description">
            Votre experte pour le bien-être de vos chiens, chats et N.A.C.
          </p>
          <div className="hero-actions">
            <BookingLink
              source="hero"
              label="Prendre rendez-vous en ligne"
              testId="cta-booking-online"
            />
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
              <PhoneIcon size={15} aria-hidden="true" />
              Prendre rendez-vous par téléphone
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <picture>
            {webp?.srcset && (
              <source
                srcSet={webp.srcset}
                sizes="(min-width: 1352px) 594px, (min-width: 641px) 46vw, calc(100vw - 58px)"
                type="image/webp"
              />
            )}
            <img
              src={fallback ?? webp?.src}
              alt={backgroundAlt}
              width={1200}
              height={804}
              className="hero-photo"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
          <div className="hero-note">
            <HandHeartIcon size={32} weight="light" aria-hidden="true" />
            <div>
              <strong>Le bien-être animal</strong>
              <span>au cœur de ma pratique</span>
            </div>
          </div>
          <p className="hero-caption">Des soins adaptés à chaque animal.</p>
        </div>
      </div>
      <div className="hero-baseline">
        <div>
          <CertificateIcon weight="light" aria-hidden="true" />
          <span>Inscrite au Registre National d’Aptitude</span>
        </div>
        <div>
          <HandHeartIcon weight="light" aria-hidden="true" />
          <span>En cabinet & à domicile</span>
        </div>
        <div>
          <PawPrintIcon weight="light" aria-hidden="true" />
          <span>Chiens, chats, chevaux & NAC</span>
        </div>
        <a
          href="#animaux"
          className="hidden lg:inline-flex"
          aria-label="Découvrir les animaux"
        >
          <ArrowDownIcon size={19} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
