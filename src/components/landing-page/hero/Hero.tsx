import { Popover, Transition } from '@headlessui/react';
import { MenuIcon, XIcon } from '@heroicons/react/outline';
import * as Sentry from '@sentry/astro';
import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { PopupButton, useCalendlyEventListener } from 'react-calendly';
import {
  pushDataLayerEvent,
  type AnalyticsPayload,
} from '../../../lib/analytics';
import * as Icons from '../../common/icons';

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

type HeroProps = {
  children?: React.ReactNode;
  backgroundSources?: {
    webp?: {
      src: string;
      srcset: string;
    };
    fallback?: string;
  };
  backgroundAlt?: string;
};

export default function Hero({
  children,
  backgroundSources,
  backgroundAlt = '',
}: HeroProps) {
  const [isCalendlyPopupReady, setIsCalendlyPopupReady] = useState(false);
  const calendlyLoadTimeoutRef = useRef<number | null>(null);
  const hasCalendlyLoadedEventRef = useRef(false);

  useEffect(() => {
    setIsCalendlyPopupReady(true);
  }, []);

  const clearCalendlyLoadTimeout = useCallback(() => {
    if (calendlyLoadTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(calendlyLoadTimeoutRef.current);
    calendlyLoadTimeoutRef.current = null;
  }, []);

  const trackCalendlyStep = useCallback(
    (event: string, payload: AnalyticsPayload = {}) => {
      pushDataLayerEvent(event, payload);
      Sentry.addBreadcrumb({
        category: 'calendly',
        message: event,
        level: 'info',
        data: payload,
      });
    },
    []
  );

  const handleCalendlyOpenClick = useCallback(() => {
    hasCalendlyLoadedEventRef.current = false;
    clearCalendlyLoadTimeout();
    trackCalendlyStep('calendly_popup_open_clicked');

    calendlyLoadTimeoutRef.current = window.setTimeout(() => {
      if (hasCalendlyLoadedEventRef.current) {
        return;
      }

      Sentry.withScope((scope) => {
        scope.setLevel('warning');
        scope.setTag('feature', 'calendly');
        scope.setTag('stage', 'popup_open');
        scope.setContext('calendly_debug', {
          calendlyUrl: url_calendly,
          path: window.location.pathname,
        });
        Sentry.captureMessage(
          'Calendly popup opened but no Calendly load event was received within 8s.'
        );
      });

      trackCalendlyStep('calendly_popup_open_timeout');
    }, 8000);
  }, [clearCalendlyLoadTimeout, trackCalendlyStep]);

  const markCalendlyLoaded = useCallback(() => {
    hasCalendlyLoadedEventRef.current = true;
    clearCalendlyLoadTimeout();
  }, [clearCalendlyLoadTimeout]);

  useCalendlyEventListener({
    onProfilePageViewed: () => {
      markCalendlyLoaded();
      trackCalendlyStep('calendly_profile_page_viewed');
    },
    onEventTypeViewed: () => {
      markCalendlyLoaded();
      trackCalendlyStep('calendly_event_type_viewed');
    },
    onDateAndTimeSelected: () => {
      markCalendlyLoaded();
      trackCalendlyStep('calendly_date_and_time_selected');
    },
    onEventScheduled: (event) => {
      markCalendlyLoaded();
      trackCalendlyStep('calendly_event_scheduled', {
        calendlyEventUri: event.data.payload.event.uri,
        calendlyInviteeUri: event.data.payload.invitee.uri,
      });
    },
  });

  useEffect(() => {
    return () => {
      clearCalendlyLoadTimeout();
    };
  }, [clearCalendlyLoadTimeout]);

  const { webp, fallback } = backgroundSources ?? {};
  const fallbackSrc = fallback ?? webp?.src;
  const rootElement =
    typeof document !== 'undefined'
      ? document.getElementById('root') || document.body
      : null;
  const calendlyCtaClassName =
    'flex w-full items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-gold-500 bg-white hover:bg-opacity-70 sm:px-8';
  const canUsePopupButton =
    isCalendlyPopupReady && rootElement instanceof HTMLElement;

  return (
    <div className="relative h-screen w-full bg-no-repeat bg-cover bg-center">
      {fallbackSrc && (
        <picture className="absolute inset-0">
          {webp?.srcset && <source srcSet={webp.srcset} type="image/webp" />}
          <img
            src={fallbackSrc}
            alt={backgroundAlt}
            width={1920}
            height={1080}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </picture>
      )}
      <div
        className="absolute inset-0 bg-black bg-opacity-30"
        aria-hidden="true"
      />
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
                    {canUsePopupButton ? (
                      <div className="w-full" onClick={handleCalendlyOpenClick}>
                        <PopupButton
                          url={url_calendly}
                          rootElement={rootElement}
                          text="Prendre rendez-vous en ligne"
                          className={calendlyCtaClassName}
                        />
                      </div>
                    ) : (
                      <a
                        href={url_calendly}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackCalendlyStep('calendly_fallback_link_clicked')
                        }
                        className={calendlyCtaClassName}
                      >
                        Prendre rendez-vous en ligne
                      </a>
                    )}
                    <a
                      href="#contact"
                      onClick={() =>
                        pushDataLayerEvent('contact_section_cta_clicked', {
                          source: 'hero',
                        })
                      }
                      className="flex items-center text-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gold-500 hover:bg-gold-1000 sm:px-8"
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
