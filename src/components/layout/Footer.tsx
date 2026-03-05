import React from 'react';
import { SITE_CONFIG } from '../../../site.config.mjs';

export default function Footer() {
  const year = new Date().getFullYear();
  const footerLinks = [
    {
      href: '/osteopathe-animalier-bordeaux',
      label: 'Osteopathe animalier Bordeaux',
    },
    {
      href: '/osteopathie-animale-chien-chat-bordeaux',
      label: 'Osteopathie chien & chat',
    },
    { href: '/mentions-legales', label: 'Mentions legales' },
    {
      href: '/politique-de-confidentialite',
      label: 'Politique de confidentialite',
    },
  ];

  return (
    <footer className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-8 sm:px-6 lg:px-4">
        <div className="flex flex-col gap-8 border-t border-gray-200 pt-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="text-base font-semibold text-canard">
              Agathe Lescout, osteopathe animalier
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Consultations en cabinet a Begles et a domicile autour de
              Bordeaux.
            </p>
            <nav
              className="mt-4 flex flex-wrap gap-x-4 gap-y-2"
              aria-label="Liens de pied de page"
            >
              {footerLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gold-600 hover:text-gold-700"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex space-x-6 lg:justify-end">
            <a
              href={SITE_CONFIG.facebookUrl}
              className="text-gray-400 hover:text-gold-500"
            >
              <span className="sr-only">Facebook</span>
              <svg
                className="h-6 w-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6 text-sm text-gray-400 md:flex-row md:items-center md:justify-between">
          <p>{`${year} Agathe Lescout, Osteopathe Animalier. Tous droits reserves.`}</p>
          <button
            type="button"
            onClick={() => {
              window.openAxeptioCookie?.();
              window.openAxeptioCookies?.();
            }}
            className="text-left text-gray-500 hover:text-gray-700"
          >
            Vos preferences en matiere de cookies
          </button>
        </div>
      </div>
    </footer>
  );
}
