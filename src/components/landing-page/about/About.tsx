import type { ResponsiveImageData } from '../../../lib/responsiveImage';
import { aboutCopy } from '../../../lib/content/copy';

export default function About({
  agatheImg,
}: {
  agatheImg: ResponsiveImageData;
}) {
  const introEnd = aboutCopy.indexOf('Ma pratique');
  const objectiveStart = aboutCopy.indexOf('Mon objectif ?');
  const linkStart = aboutCopy.indexOf('le site internet du CNOV.');
  return (
    <section id="a-propos" className="about-section section-space">
      <div className="site-container split-section">
        <img
          {...agatheImg}
          alt="Portrait d'Agathe Lescout, ostéopathe spécialisée dans les animaux"
          loading="lazy"
          decoding="async"
          data-testid="responsive-content-image"
          className="about-photo"
        />
        <div className="about-copy">
          <p className="eyebrow">Faisons connaissance</p>
          <h2 className="sr-only">À propos de votre ostéopathe</h2>
          <h3>Agathe Lescout</h3>
          <p className="about-role">
            Ostéopathe / Professeur à l'EAO - École d'Aquitaine d'Ostéopathie
          </p>
          <div className="body-copy">
            <p>{aboutCopy.slice(0, introEnd)}</p>
            <p>{aboutCopy.slice(introEnd, objectiveStart)}</p>
            <p>
              {aboutCopy.slice(objectiveStart, linkStart)}
              <a
                href="https://extranet.veterinaire.fr/annuaires/osteopathes-rna"
                target="_blank"
                rel="noreferrer"
              >
                le site internet du CNOV.
              </a>
            </p>
          </div>
          <a href="#contact" className="text-link mt-5">
            Me contacter
          </a>
        </div>
      </div>
    </section>
  );
}
