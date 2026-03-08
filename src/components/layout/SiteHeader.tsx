import { Popover, Transition } from '@headlessui/react';
import { MenuIcon, XIcon } from '@heroicons/react/outline';
import React, { Fragment } from 'react';
import { primaryNavigation } from '../../lib/constants/navigation';

type SiteHeaderProps = {
  variant?: 'overlay' | 'solid';
};

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export default function SiteHeader({
  variant = 'solid',
}: SiteHeaderProps) {
  const isOverlay = variant === 'overlay';

  return (
    <Popover
      className={classes(
        'top-0 z-40 w-full',
        isOverlay ? 'fixed' : 'sticky border-b border-stone-200 bg-white/95 backdrop-blur'
      )}
    >
      {({ open }) => (
        <>
          <div
            className={classes(
              'mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8',
              isOverlay &&
                'bg-gradient-to-l from-canard-light to-canard text-white md:mt-4 md:rounded-full md:px-8'
            )}
          >
            <a
              href="/"
              className={classes(
                'text-sm font-semibold uppercase tracking-[0.2em]',
                isOverlay ? 'text-white' : 'text-canard'
              )}
            >
              Agathe Lescout
            </a>

            <div className="hidden items-center gap-8 md:flex">
              <nav className="flex items-center gap-6" aria-label="Navigation principale">
                {primaryNavigation.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={classes(
                      'text-sm font-medium transition-colors',
                      isOverlay
                        ? 'text-white hover:text-gold-300'
                        : 'text-stone-700 hover:text-gold-600'
                    )}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <a
                href="tel:+33665550792"
                className={classes(
                  'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  isOverlay
                    ? 'bg-white text-gold-600 hover:bg-gold-50'
                    : 'bg-gold-500 text-white hover:bg-gold-600'
                )}
              >
                06 65 55 07 92
              </a>
            </div>

            <div className="md:hidden">
              <Popover.Button
                className={classes(
                  'inline-flex items-center justify-center rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-gold-500',
                  isOverlay
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                )}
              >
                <span className="sr-only">Ouvrir le menu principal</span>
                <MenuIcon className="h-6 w-6" aria-hidden="true" />
              </Popover.Button>
            </div>
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
              className="absolute inset-x-0 top-full origin-top-right p-2 transition md:hidden"
            >
              <div className="rounded-2xl border border-stone-200 bg-white shadow-lg ring-1 ring-black/5">
                <div className="flex items-center justify-between px-5 pt-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-canard">
                    Menu
                  </p>
                  <Popover.Button className="rounded-md bg-white p-2 text-stone-500 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-gold-500">
                    <span className="sr-only">Fermer le menu</span>
                    <XIcon className="h-6 w-6" aria-hidden="true" />
                  </Popover.Button>
                </div>

                <div className="space-y-1 px-3 pb-4 pt-2">
                  {primaryNavigation.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="block rounded-xl px-4 py-3 text-base font-medium text-stone-700 hover:bg-gold-50 hover:text-gold-700"
                    >
                      {item.label}
                    </a>
                  ))}
                  <a
                    href="tel:+33665550792"
                    className="mt-2 block rounded-xl bg-gold-500 px-4 py-3 text-center text-base font-semibold text-white hover:bg-gold-600"
                  >
                    Appeler
                  </a>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
