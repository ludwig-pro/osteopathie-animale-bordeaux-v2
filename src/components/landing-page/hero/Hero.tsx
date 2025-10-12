import { Popover, Transition } from '@headlessui/react';
import { MenuIcon, XIcon } from '@heroicons/react/outline';
import React, { Fragment } from 'react';
import { PopupButton } from 'react-calendly';
import * as Icons from '../../common/icons';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isDomAvailable } from '../../../lib/utils';

const navigation = [
  { name: 'Animaux', href: '#animaux' },
  { name: 'Quand consulter ?', href: '#quand-consulter' },
  { name: 'Tarifs', href: '#tarifs' },
  { name: 'Ostéopathie', href: '#osteopathie' },
];

const navigationSvg = {
  '#animaux': <Icons.Animal />,
  '#quand-consulter': <Icons.QuandConsulter />,
  '#tarifs': <Icons.Tarifs />,
  '#osteopathie': <Icons.Osteopathie />,
};

const url_calendly =
  'https://calendly.com/osteopathe-animalier/consultation-osteopathique'; // 'https://calendly.com/osteopathe-animalier/';

type ImageData = {
  src: string;
  srcSet: {
    attribute: string;
  };
  attributes?: Record<string, unknown>;
};

type HeroProps = {
  children?: React.ReactNode;
  backgroundImage?: ImageData;
};

export default function Hero({ children, backgroundImage }: HeroProps) {
  const bgStyle = backgroundImage
    ? {
        backgroundImage: `url(${backgroundImage.src})`,
      }
    : {};

  return (
    <div
      className="h-screen bg-no-repeat bg-cover bg-center w-full"
      style={bgStyle}
    >
      <Popover className="relative pt-6 pb-16 sm:pb-24 ">
        {({ open }) => (
          <>
            <div className="fixed top-0 z-40 flex md:justify-center justify-end py-4 md:py-0 w-full px-4 sm:px-6  md:bg-gradient-to-l to-canard from-canard-light">
              <nav
                className="relative flex items-center justify-between sm:h-10 md:justify-center py-6"
                aria-label="Global"
              >
                <div className="flex items-center flex-1 md:absolute md:inset-y-0 md:left-0">
                  <div className="flex items-center justify-between w-full md:w-auto">
                    <div></div>
                    <div className="-mr-2 flex items-center md:hidden">
                      <Popover.Button className="bg-gray-50 rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-500">
                        <span className="sr-only">Open main menu</span>
                        <MenuIcon className="h-6 w-6" aria-hidden="true" />
                      </Popover.Button>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex md:space-x-10">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="font-medium text-white hover:text-gold-500"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <div className="hidden md:absolute md:flex md:items-center md:justify-end md:inset-y-0 md:right-0"></div>
              </nav>
            </div>
            <Transition
              show={open}
              as={Fragment}
              enter="duration-150 ease-out"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="duration-100 ease-in"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Popover.Panel
                focus
                static
                className="absolute z-50 top-0 inset-x-0 p-2 transition transform origin-top-right md:hidden"
              >
                <div className="rounded-lg shadow-md bg-white ring-1 ring-black ring-opacity-5 overflow-hidden">
                  <div className="px-5 pt-4 flex items-center justify-between">
                    <div></div>
                    <div className="-mr-2">
                      <Popover.Button className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-500">
                        <span className="sr-only">Close menu</span>
                        <XIcon className="h-6 w-6" aria-hidden="true" />
                      </Popover.Button>
                    </div>
                  </div>
                  <div className="px-2 pt-2 pb-3">
                    {navigation.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className={`-m-3 p-3 flex flex-row items-center rounded-lg hover:bg-gold-300 text-gold-600 hover:text-white`}
                      >
                        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-gradient-to-r from-gold-400 to-gold-500 text-white">
                          {
                            navigationSvg[
                              item.href as keyof typeof navigationSvg
                            ]
                          }
                        </div>
                        <div className="ml-4 text-base font-medium ">
                          {item.name}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
            <main className=" relative mt-16 mx-auto max-w-7xl px-4 sm:mt-24">
              <div className="text-center">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span
                    className="block text-white"
                    style={{ textShadow: '#143545  1px 0 10px' }}
                  >
                    Agathe Lescout
                  </span>
                  <span
                    className="block text-gold-500"
                    style={{ textShadow: '#143545 1px 0 10px' }}
                  >
                    ostéopathe animalier
                  </span>
                  <span
                    className="block text-white text-2xl mt-2 font-medium"
                    style={{ textShadow: '#143545 1px 0 10px' }}
                  >
                    Votre experte pour le bien-être de vos chiens, chats et
                    N.A.C.
                  </span>
                </h1>
                <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
                  <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
                    <PopupButton
                      url={url_calendly}
                      rootElement={
                        document.getElementById('root') as HTMLElement
                      }
                      text="Prendre rendez-vous en ligne"
                      className="flex w-full items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-gold-600 bg-white hover:bg-opacity-70 sm:px-8"
                    />
                    <a
                      href="#contact"
                      className="flex items-center text-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gold-500 hover:bg-opacity-70 sm:px-8"
                    >
                      Prendre rendez-vous par téléphone
                    </a>
                  </div>
                </div>
              </div>
              {children}
            </main>
          </>
        )}
      </Popover>
    </div>
  );
}
