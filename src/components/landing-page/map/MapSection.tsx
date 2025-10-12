import { useEffect } from 'react';
import { useHasMounted } from '../../../lib/hooks/useHasMounted';

import { Map } from '../../common/icons';
import MapBox from './MapBox';

const LNG = -0.548706;
const LAT = 44.807147;

type CarteCabinetProps = {
  id?: string;
};

export default function CarteCabinet({ id }: CarteCabinetProps) {
  const hasMounted = useHasMounted();

  // Lazy load Mapbox CSS only when component mounts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.8.1/mapbox-gl.css';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
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
                  34 rue du Mérachel Joffre
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
                    navigator.geolocation.getCurrentPosition((position) => {
                      const { latitude, longitude } = position.coords;
                      const googleMapsUrl = `https://www.google.fr/maps/dir/?api=1&origin=${latitude},${longitude}&destination=44.805434,-0.550281&travelmode=driving`;
                      window.open(
                        googleMapsUrl,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    });
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
              <div className="h-full sm:rounded-xl sm:shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden">
                {!hasMounted && (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mb-4"></div>
                      <p className="text-gray-500">Chargement de la carte...</p>
                    </div>
                  </div>
                )}
                {hasMounted && (
                  <MapBox lng={LNG} lat={LAT} label="Cabinet de Bègles" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
