import { CheckIcon } from '@phosphor-icons/react';
import type { ResponsiveImageData } from '../../../lib/responsiveImage';
import SectionHeading from '../../site/SectionHeading';

export default function Osteopathy({
  id,
  bulldogImg,
}: {
  id?: string;
  bulldogImg: ResponsiveImageData;
}) {
  return (
    <section id={id} className="osteopathy-section section-space">
      <div className="site-container split-section">
        <div className="editorial-figure" data-reveal="image">
          <img
            {...bulldogImg}
            alt="Bulldog anglais recevant un soin ostéopathique"
            loading="lazy"
            decoding="async"
            data-testid="responsive-content-image"
            className="editorial-photo"
          />
          <p className="photo-caption">Observer. Comprendre. Accompagner.</p>
        </div>
        <div>
          <SectionHeading
            eyebrow="Le corps forme un tout"
            title="De l’attention, jusque dans le mouvement."
          />
          <p className="body-copy">
            Une raideur, un changement d’allure, une récupération moins facile…
            Le corps de votre animal exprime parfois un inconfort que l’on ne
            sait pas toujours lire.
          </p>
          <p className="body-copy">
            L’ostéopathie s’appuie sur l’observation et des techniques manuelles
            adaptées pour travailler les restrictions de mobilité, en tenant
            compte de l’animal dans son ensemble.
          </p>
          <ul className="approach-points">
            <li>
              <CheckIcon aria-hidden="true" /> Des gestes adaptés à sa
              sensibilité
            </li>
            <li>
              <CheckIcon aria-hidden="true" /> Une attention à son âge et à son
              activité
            </li>
            <li>
              <CheckIcon aria-hidden="true" /> Un accompagnement complémentaire
              au vétérinaire
            </li>
          </ul>
          <a href="#consultation" className="text-link">
            Comment se passe une séance ?
          </a>
        </div>
      </div>
    </section>
  );
}
