import { HandHeartIcon } from '@phosphor-icons/react';
import type { ResponsiveImageData } from '../../../lib/responsiveImage';
import { osteopathyCopy } from '../../../lib/content/copy';
import SectionHeading from '../../site/SectionHeading';

export default function Osteopathy({
  id,
  bulldogImg,
}: {
  id?: string;
  bulldogImg: ResponsiveImageData;
}) {
  const splitAt = osteopathyCopy.indexOf("Mais l'ostéopathie est avant tout");
  return (
    <section id={id} className="osteopathy-section section-space">
      <div className="site-container split-section">
        <div>
          <img
            {...bulldogImg}
            alt="Bulldog anglais recevant un soin ostéopathique"
            loading="lazy"
            decoding="async"
            data-testid="responsive-content-image"
            className="editorial-photo"
          />
          <p className="photo-caption">
            <HandHeartIcon size={16} aria-hidden="true" />
            Une approche douce, pour l’équilibre du corps.
          </p>
        </div>
        <div>
          <SectionHeading
            eyebrow="Comprendre l’ostéopathie"
            title="Qu'est ce que l'ostéopathie pour les animaux ?"
          />
          <p className="body-copy">{osteopathyCopy.slice(0, splitAt)}</p>
          <details className="osteopathy-detail">
            <summary>En savoir plus sur l’ostéopathie</summary>
            <p className="body-copy">{osteopathyCopy.slice(splitAt)}</p>
          </details>
          <a href="#quand-consulter" className="text-link mt-5">
            Quand consulter un ostéopathe ?
          </a>
        </div>
      </div>
    </section>
  );
}
