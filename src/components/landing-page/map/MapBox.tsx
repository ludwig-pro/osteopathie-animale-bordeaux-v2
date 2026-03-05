import type mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';
import { API_CONFIG } from '../../../lib/constants/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

type MapBoxProps = {
  lng: number;
  lat: number;
  label: string;
  onError?: () => void;
  onReady?: () => void;
};

const MAPBOX_CSS_LINK_ID = 'mapbox-gl-stylesheet';

const ensureMapboxCss = () => {
  if (document.getElementById(MAPBOX_CSS_LINK_ID)) {
    return;
  }

  const link = document.createElement('link');
  link.id = MAPBOX_CSS_LINK_ID;
  link.rel = 'stylesheet';
  link.href = API_CONFIG.mapbox.cssUrl;
  document.head.appendChild(link);
};

const MapBox = ({ lng, lat, label, onError, onReady }: MapBoxProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: mapboxgl.Map | null = null;
    let cancelled = false;

    const mapboxToken = API_CONFIG.mapbox.token;

    if (!mapboxToken) {
      console.error('Mapbox token is missing from environment variables');
      onError?.();
      return;
    }

    const initializeMap = async () => {
      try {
        ensureMapboxCss();

        const { default: mapboxglModule } = await import('mapbox-gl');

        if (cancelled || !mapContainerRef.current) {
          return;
        }

        mapboxglModule.accessToken = mapboxToken;

        map = new mapboxglModule.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [lng, lat],
          zoom: 10,
          scrollZoom: false,
        });
        map.addControl(new mapboxglModule.NavigationControl(), 'top-left');

        const popup = new mapboxglModule.Popup({
          offset: 25,
          closeOnClick: true,
        }).setText(label);

        new mapboxglModule.Marker()
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        map.once('load', () => {
          if (!cancelled) {
            onReady?.();
          }
        });
      } catch (error) {
        console.error('Unable to load Mapbox map', error);
        if (!cancelled) {
          onError?.();
        }
      }
    };

    initializeMap();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [label, lat, lng, onError, onReady]);

  return <div ref={mapContainerRef} style={mapContainerStyle} />;
};

export default MapBox;
