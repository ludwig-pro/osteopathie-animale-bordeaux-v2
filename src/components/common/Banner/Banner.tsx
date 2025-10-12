import { XIcon } from '@heroicons/react/outline';

import React from 'react';

export default function Banner() {
  const [show, setShow] = React.useState(true);

  // if(!show) return null

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 sm:top-14  sm:flex sm:justify-center sm:px-6 sm:pb-5 lg:px-8 z-50  transform ${
          show ? 'translate-y-0' : '-translate-y-40'
        } transition-transform duration-300 ease-in-out  ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionProperty: 'transform, opacity' }}
      >
        <div className="pointer-events-auto flex items-center justify-between gap-x-6 bg-gray-900 px-6 py-2.5 sm:rounded-xl sm:py-3 sm:pl-4 sm:pr-3.5">
          <p className="text-sm leading-6 text-white">
            Prise de rendez-vous ouverte pour le cabinet d'Ostéopathie Animale
            de <strong className="font-semibold">Bègles</strong> !
          </p>
          <button
            type="button"
            className={`-m-1.5 flex-none p-1.5 ${
              show ? '' : 'pointer-events-none'
            }`}
            onClick={() => setShow((prev) => !prev)}
          >
            <span className="sr-only">Fermer</span>
            <XIcon className="h-5 w-5 text-white" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
