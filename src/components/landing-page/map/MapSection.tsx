import { useCallback, useState } from 'react';

import { Map } from '../../common/icons';
import MapBox from './MapBox';

const LNG = -0.550281;
const LAT = 44.805434;

type CarteCabinetProps = {
  id?: string;
};

export default function CarteCabinet({ id }: CarteCabinetProps) {
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );

  const openDirections = useCallback((origin?: string) => {
    const destination = `${LAT},${LNG}`;
    const googleMapsUrl = origin
      ? `https://www.google.fr/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
      : `https://www.google.fr/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div
      id={id}
      className="relative bg-white pb-32 overflow-hidden min-h-[600px] sm:min-h-[650px]"
    >
      <div className="relative">
        <h2 className="pt-16 text-center text-3xl leading-8 font-extrabold tracking-tight text-gold-600 sm:text-4xl">
          Consultations en Cabinet à Bègles
        </h2>
        <p className="mt-4 max-w-3xl mx-auto text-center text-xl text-gray-500">
          Nous sommes ravis de vous accueillir dans notre cabinet situé à
          Bègles. Profitez d'un environnement professionnel et adapté pour les
          soins de vos animaux.
        </p>
        <div className="lg:mx-auto lg:max-w-7xl lg:px-8 lg:grid lg:grid-cols-2 lg:grid-flow-col-dense lg:gap-24">
          <div className="px-4 max-w-xl mx-auto sm:px-6 lg:py-16 lg:max-w-none lg:mx-0 lg:px-0">
            <div>
              <div>
                <span className="h-12 w-12 rounded-md flex items-center justify-center bg-gold-500">
                  <Map />
                </span>
              </div>
              <div className="mt-6">
                <h2 className="text-3xl font-extrabold tracking-tight text-gold-500">
                  Bègles
                </h2>
                <p className="mt-4 text-lg text-gray-500">
                  34 rue du Marechal Joffre
                </p>
                <p className="mt-2 text-lg text-gray-500">
                  Parking gratuit place du bi-centenaire <br />
                  ou{' '}
                  <a
                    href="https://maps.app.goo.gl/bZdtom3PSSN1TjZE9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-500 hover:text-gold-600 underline"
                  >
                    Parking du Stade André Moga
                  </a>
                </p>
                <p className="mt-2 text-lg text-gray-500">
                  Accès rocade sortie 20 Cadaujac / Bègles.
                </p>
                <p className="mt-2 text-lg text-gray-500">
                  Accès tram C arrêt Stade Musard.
                </p>
                <button
                  onClick={() => {
                    if (!navigator.geolocation) {
                      openDirections();
                      return;
                    }

                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        openDirections(
                          `${position.coords.latitude},${position.coords.longitude}`
                        );
                      },
                      () => {
                        openDirections();
                      },
                      { timeout: 8000 }
                    );
                  }}
                  className="inline-flex mt-4 justify-center py-2 px-4 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-gold-500 hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500"
                >
                  Obtenir l'itinéraire
                </button>
              </div>
            </div>
          </div>
          <div className="mt-12 sm:mt-16 lg:mt-0" style={{ height: '400px' }}>
            <div className="lg:relative h-full sm:p-4">
              <div
                className="relative h-full overflow-hidden sm:rounded-xl sm:shadow-xl ring-1 ring-black ring-opacity-5"
                aria-busy={mapState !== 'ready'}
              >
                {mapState !== 'ready' && (
                  <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-gray-100/95 p-6">
                    <div className="text-center">
                      <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gold-500"></div>
                      <p className="text-gray-700">
                        {mapState === 'error'
                          ? "La carte interactive n'a pas pu etre chargee."
                          : 'Chargement de la carte interactive...'}
                      </p>
                      {mapState === 'error' && (
                        <a
                          href="https://www.google.fr/maps/dir/?api=1&destination=44.805434,-0.550281&travelmode=driving"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-600"
                        >
                          Ouvrir l'itineraire
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <MapBox
                  lng={LNG}
                  lat={LAT}
                  label="Cabinet de Begles"
                  onReady={() => setMapState('ready')}
                  onError={() => setMapState('error')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
