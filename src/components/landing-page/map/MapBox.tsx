import mapboxgl from 'mapbox-gl';
import mapboxStylesheetUrl from 'mapbox-gl/dist/mapbox-gl.css?url';
import { useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '../../../lib/constants/api';
import { CABINET_DIRECTIONS_URL } from '../../../lib/directions';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

let mapboxStylesheetPromise: Promise<void> | undefined;

const loadMapboxStylesheet = (): Promise<void> => {
  if (mapboxStylesheetPromise) {
    return mapboxStylesheetPromise;
  }

  const existingLink = document.querySelector<HTMLLinkElement>(
    'link[data-mapbox-styles="true"]'
  );

  if (existingLink?.sheet) {
    mapboxStylesheetPromise = Promise.resolve();
    return mapboxStylesheetPromise;
  }

  mapboxStylesheetPromise = new Promise<void>((resolve, reject) => {
    const link = existingLink ?? document.createElement('link');

    const removeListeners = () => {
      link.removeEventListener('load', handleLoad);
      link.removeEventListener('error', handleError);
    };
    const handleLoad = () => {
      removeListeners();
      resolve();
    };
    const handleError = () => {
      removeListeners();
      link.remove();
      mapboxStylesheetPromise = undefined;
      reject(new Error('Unable to load the Mapbox stylesheet'));
    };

    link.addEventListener('load', handleLoad);
    link.addEventListener('error', handleError);

    if (!existingLink) {
      link.rel = 'stylesheet';
      link.href = mapboxStylesheetUrl;
      link.setAttribute('data-mapbox-styles', 'true');
      document.head.appendChild(link);
    }
  });

  return mapboxStylesheetPromise;
};

type MapBoxProps = {
  lng: number;
  lat: number;
  label: string;
};

const MapBox = ({ lng, lat, label }: MapBoxProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let map: mapboxgl.Map | undefined;
    let mapErrorHandler: (() => void) | undefined;

    const initializeMap = async () => {
      try {
        await loadMapboxStylesheet();

        if (isCancelled || !mapContainerRef.current) {
          return;
        }

        const mapboxToken = API_CONFIG.mapbox.token;

        if (!mapboxToken) {
          if (!isCancelled) {
            setMapError(true);
          }
          return;
        }

        // Set the access token globally (recommended by Mapbox)
        mapboxgl.accessToken = mapboxToken;

        if (!mapboxgl.supported()) {
          if (!isCancelled) {
            setMapError(true);
          }
          return;
        }

        map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/standard',
          center: [lng, lat],
          zoom: 10,
          scrollZoom: false,
        });
        map.addControl(new mapboxgl.NavigationControl(), 'top-left');
        mapErrorHandler = () => {
          if (!isCancelled) {
            setMapError(true);
          }
        };
        map.on('error', mapErrorHandler);

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeOnClick: true,
        }).setText(label);

        new mapboxgl.Marker().setLngLat([lng, lat]).setPopup(popup).addTo(map);
      } catch {
        if (!isCancelled) {
          setMapError(true);
        }
      }
    };

    void initializeMap();

    return () => {
      isCancelled = true;
      if (map && mapErrorHandler) {
        map.off('error', mapErrorHandler);
      }
      map?.remove();
    };
  }, [lat, lng, label]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} style={mapContainerStyle} />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gold-50 px-6 text-center">
          <div>
            <p className="text-base font-medium text-gray-700">
              La carte est temporairement indisponible.
            </p>
            <a
              href={CABINET_DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex justify-center rounded-md border border-transparent bg-gold-500 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
            >
              Ouvrir l'itinéraire
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapBox;
