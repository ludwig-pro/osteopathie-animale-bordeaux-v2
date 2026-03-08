import * as Sentry from '@sentry/astro';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PopupButton, useCalendlyEventListener } from 'react-calendly';
import {
  pushDataLayerEvent,
  type AnalyticsPayload,
} from '../../../lib/analytics';
import SiteHeader from '../../layout/SiteHeader';

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
      <div className="relative pb-16 sm:pb-24">
        <SiteHeader variant="overlay" />
        <main className="relative mx-auto mt-16 max-w-7xl px-4 pt-24 sm:mt-24 sm:pt-28">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span
                className="block text-white"
                style={{ textShadow: '#143545  1px 0 10px' }}
              >
                Ostéopathe animalier à Bordeaux et Bègles
              </span>
              <span
                className="block text-gold-500"
                style={{ textShadow: '#143545 1px 0 10px' }}
              >
                Agathe Lescout
              </span>
              <span
                className="block text-white text-2xl mt-2 font-medium"
                style={{ textShadow: '#143545 1px 0 10px' }}
              >
                Consultations pour chiens, chats, N.A.C., chevaux et bovins, en
                cabinet ou à domicile.
              </span>
            </h1>
            <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
              <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
                {canUsePopupButton ? (
                  <div
                    className="w-full"
                    onClick={handleCalendlyOpenClick}
                    data-testid="cta-booking-online"
                  >
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
                    data-testid="cta-booking-online"
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
                  data-testid="cta-booking-phone"
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
      </div>
    </div>
  );
}
