import { ArrowDownIcon, MapPinIcon, PhoneIcon } from '@phosphor-icons/react';
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
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-grid">
        <div className="site-container hero-content">
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
              <br />
              Consultations en cabinet et à domicile.
            </p>
            <div className="hero-actions">
              <BookingLink
                source="hero"
                variant="accent"
                className="rounded-sm"
                label="Prendre rendez-vous en cabinet"
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
        </div>
        <div className="hero-visual">
          <picture>
            {webp?.srcset && (
              <source
                srcSet={webp.srcset}
                sizes="(min-width: 801px) 62vw, 100vw"
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
        </div>
      </div>
      <div className="hero-baseline">
        <div className="site-container hero-baseline-inner">
          <p>Inscrite au Registre National d’Aptitude</p>
          <p>En cabinet & à domicile</p>
          <a href="#animaux" className="hero-discover">
            Chiens, chats, chevaux & NAC
            <ArrowDownIcon size={20} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
