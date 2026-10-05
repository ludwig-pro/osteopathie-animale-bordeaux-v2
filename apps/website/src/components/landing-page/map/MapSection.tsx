import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUpRightIcon, MapPinIcon } from '@phosphor-icons/react';
import { BUSINESS_CONFIG } from '../../../lib/constants/site';
import { CABINET_DIRECTIONS_URL } from '../../../lib/directions';
import SectionHeading from '../../site/SectionHeading';
import { Button } from '../../ui/button';
import StaticMap from './StaticMap';
import { CABINET_MAP } from '../../../lib/map';

const InteractiveMap = lazy(() => import('./InteractiveMap'));

export default function MapSection({ id = 'cabinet' }: { id?: string }) {
  const [isMapRequested, setIsMapRequested] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const focusRequested = useRef(false);
  const requestMap = () => setIsMapRequested(true);
  const revealMap = () => {
    focusRequested.current = Boolean(
      panel.current
        ?.querySelector('[data-testid="map-load-trigger"]')
        ?.contains(document.activeElement)
    );
    setIsMapReady(true);
  };
  useEffect(() => {
    if (isMapReady && focusRequested.current) {
      panel.current
        ?.querySelector<HTMLDivElement>('.cabinet-live-map')
        ?.focus({ preventScroll: true });
      focusRequested.current = false;
    }
  }, [isMapReady]);
  return (
    <section id={id} className="section-space site-container cabinet-grid">
      <div className="cabinet-copy">
        <SectionHeading
          eyebrow="Tout près de chez vous"
          title="Consultations en Cabinet à Bègles"
        />
        <p className="body-copy">
          Nous sommes ravis de vous accueillir dans notre cabinet situé à
          Bègles. Profitez d'un environnement professionnel et adapté pour les
          soins de vos animaux.
        </p>
        <div className="cabinet-address">
          <MapPinIcon size={23} weight="light" aria-hidden="true" />
          <div>
            <strong>Bègles</strong>
            <p>34 rue du Maréchal Joffre</p>
          </div>
        </div>
        <div className="cabinet-access">
          <p>
            Parking gratuit place du bi-centenaire
            <br />
            ou{' '}
            <a
              href="https://maps.app.goo.gl/bZdtom3PSSN1TjZE9"
              target="_blank"
              rel="noopener noreferrer"
            >
              Parking du Stade André Moga
            </a>
          </p>
          <p>Accès rocade sortie 20 Cadaujac / Bègles.</p>
          <p>Accès tram C arrêt Stade Musard.</p>
        </div>
        <Button asChild variant="outline" className="mt-6">
          <a
            href={CABINET_DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Obtenir l'itinéraire
            <ArrowUpRightIcon aria-hidden="true" />
          </a>
        </Button>
      </div>
      <div
        ref={panel}
        className="map-panel"
        data-interactive={isMapReady}
        data-map-provider={CABINET_MAP.provider}
        onClick={(event) => {
          if (!isMapReady && !(event.target as HTMLElement).closest('a'))
            requestMap();
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') requestMap();
        }}
      >
        <StaticMap
          lng={BUSINESS_CONFIG.geo.longitude}
          lat={BUSINESS_CONFIG.geo.latitude}
        />
        <div
          id={`${id}-interactive-map`}
          className="map-interactive"
          aria-hidden={!isMapReady}
          inert={!isMapReady}
        >
          {isMapRequested && (
            <Suspense fallback={null}>
              <InteractiveMap
                lng={BUSINESS_CONFIG.geo.longitude}
                lat={BUSINESS_CONFIG.geo.latitude}
                label="Cabinet de Bègles"
                onReady={revealMap}
                onError={() => setMapFailed(true)}
              />
            </Suspense>
          )}
        </div>
        {CABINET_MAP.provider === 'mapbox' && (
          <a
            className="map-wordmark"
            href="https://www.mapbox.com/"
            aria-label="Mapbox"
            target="_blank"
            rel="noopener noreferrer"
          />
        )}
        {!isMapReady && !mapFailed && (
          <button
            type="button"
            className="map-load-surface"
            data-testid="map-load-trigger"
            aria-label="Activer la carte interactive du cabinet de Bègles"
            aria-controls={`${id}-interactive-map`}
            aria-expanded={isMapRequested}
            onClick={requestMap}
          />
        )}
        {!isMapReady && mapFailed && (
          <div className="map-activation">
            <p role="status">La carte est temporairement indisponible.</p>
          </div>
        )}
      </div>
    </section>
  );
}
