import { ArrowUpRightIcon } from '@phosphor-icons/react';
import type { ResponsiveImageData } from '../../../lib/responsiveImage';
export default function About({
  agatheImg,
}: {
  agatheImg: ResponsiveImageData;
}) {
  return (
    <section id="a-propos" className="about-section section-space">
      <div className="site-container split-section">
        <div className="about-portrait" data-reveal="image">
          <img
            {...agatheImg}
            alt="Portrait d'Agathe Lescout, ostéopathe spécialisée dans les animaux"
            loading="lazy"
            decoding="async"
            data-testid="responsive-content-image"
            className="about-photo"
          />
          <p>Agathe Lescout · Ostéopathe animalier</p>
        </div>
        <div className="about-copy">
          <p className="eyebrow">Derrière les mains, une rencontre</p>
          <h2>
            Prendre le temps.
            <br />
            <span>Prendre soin.</span>
          </h2>
          <h3>Agathe Lescout</h3>
          <p className="about-role">
            Ostéopathe animalier & enseignante à l’EAO
          </p>
          <div className="body-copy">
            <p>
              Mon métier commence par l’écoute : celle de votre animal, et la
              vôtre. Je prends en compte son histoire, ses habitudes et sa
              sensibilité pour lui proposer un accompagnement personnalisé.
            </p>
            <p>
              Titulaire d’un master en physiologie et comportement animal, je me
              suis ensuite formée pendant quatre ans à l’ostéopathie animale au
              CNESOA. J’exerce en Gironde et j’enseigne à l’École d’Aquitaine
              d’Ostéopathie.
            </p>
          </div>
          <a
            className="credential-link"
            href="https://extranet.veterinaire.fr/annuaires/osteopathes-rna"
            target="_blank"
            rel="noreferrer"
          >
            <span>
              Inscrite au Registre National d’Aptitude
              <small>Consulter l’annuaire de l’Ordre des vétérinaires</small>
            </span>
            <ArrowUpRightIcon size={23} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
