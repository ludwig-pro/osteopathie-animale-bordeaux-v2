import React from 'react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-50">
      <div className="max-w-7xl mx-auto pt-4 pb-4 px-4 sm:px-6 lg:pt-4 lg:px-4">
        <div className="mt-12 border-t border-gray-200 pt-8 md:flex md:items-center md:justify-between lg:mt-16">
          <div className="flex space-x-6 md:order-2">
            <a
              href="https://www.facebook.com/AgatheLescout/"
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
          <p className="mt-8 text-base text-gray-400 md:mt-0 md:order-1">
            &copy;{' '}
            {`${year} Agathe Lescout, Ostéopathe Animalier. Tous droits
            réservés.`}
            <span>
              <button
                onClick={() => {
                  window.openAxeptioCookie?.();
                  window.openAxeptioCookies?.();
                }}
                className="text-gray-400 hover:text-gray-400"
              >
                {' '}
                Vos préférences en matière de cookies
              </button>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
