import { ArrowUpRightIcon } from '@phosphor-icons/react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-container">
        <p className="footer-signature" aria-hidden="true" data-reveal="text">
          Leur bien-être.
          <br />
          <em>Notre point de rencontre.</em>
        </p>
        <div className="footer-top">
          <a href="/" className="brand" aria-label="Agathe Lescout — Accueil">
            <span className="brand-mark">
              <span aria-hidden="true">a.</span>
            </span>
            <span>
              Agathe Lescout<small>OSTÉOPATHIE ANIMALE</small>
            </span>
          </a>
          <nav className="footer-links" aria-label="Liens de pied de page">
            <a href="/#animaux">Vos animaux</a>
            <a href="/#tarifs">Tarifs</a>
            <a href="/#questions">Questions fréquentes</a>
            <a href="/#contact">Contact</a>
            <a
              href="https://www.facebook.com/AgatheLescout/"
              className="inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
              <ArrowUpRightIcon size={12} aria-hidden="true" />
            </a>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} Agathe Lescout, Ostéopathe Animalier.
            Tous droits réservés.
          </p>
          <button type="button" data-cc="show-preferencesModal">
            Vos préférences en matière de cookies
          </button>
        </div>
      </div>
    </footer>
  );
}
