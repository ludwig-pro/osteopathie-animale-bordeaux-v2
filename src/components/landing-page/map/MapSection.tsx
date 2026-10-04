import { lazy, Suspense, useState } from 'react';
import {
  ArrowUpRightIcon,
  MapPinIcon,
  MapTrifoldIcon,
} from '@phosphor-icons/react';
import { BUSINESS_CONFIG } from '../../../lib/constants/site';
import { CABINET_DIRECTIONS_URL } from '../../../lib/directions';
import SectionHeading from '../../site/SectionHeading';
import { Button } from '../../ui/button';

const MapBox = lazy(() => import('./MapBox'));

export default function MapSection({ id = 'cabinet' }: { id?: string }) {
  const [isMapRequested, setIsMapRequested] = useState(false);
  return (
    <section id={id} className="section-space site-container cabinet-grid">
      <div className="cabinet-copy">
        <SectionHeading
          eyebrow="Deux façons de se rencontrer"
          title="Au cabinet.
Ou chez vous."
        />
        <p className="body-copy">
          Un cadre dédié à Bègles, ou le confort de votre domicile en Gironde.
          Choisissons le lieu qui convient à votre animal.
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
      <div className="map-panel">
        {!isMapRequested ? (
          <div className="map-placeholder">
            <MapTrifoldIcon size={65} weight="thin" aria-hidden="true" />
            <h3>Rendez-vous à Bègles.</h3>
            <p>34 rue du Maréchal Joffre · 33130</p>
            <Button
              data-testid="map-load-trigger"
              className="mt-7"
              onClick={() => setIsMapRequested(true)}
            >
              Afficher la carte interactive
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="map-placeholder" role="status">
                Chargement de la carte...
              </div>
            }
          >
            <MapBox
              lng={BUSINESS_CONFIG.geo.longitude}
              lat={BUSINESS_CONFIG.geo.latitude}
              label="Cabinet de Bègles"
            />
          </Suspense>
        )}
      </div>
    </section>
  );
}
