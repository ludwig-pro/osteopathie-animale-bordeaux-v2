import L from 'leaflet';
import leafletStylesheetUrl from 'leaflet/dist/leaflet.css?url';
import { useEffect, useRef } from 'react';
import { CABINET_MAP } from '../../../lib/map';

let stylesheetPromise: Promise<void> | undefined;

const loadStylesheet = (): Promise<void> => {
  if (stylesheetPromise) return stylesheetPromise;
  stylesheetPromise = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = leafletStylesheetUrl;
    link.dataset['mapStyles'] = 'true';
    link.onload = () => resolve();
    link.onerror = () => {
      link.remove();
      stylesheetPromise = undefined;
      reject(new Error('Unable to load the interactive map stylesheet'));
    };
    document.head.appendChild(link);
  });
  return stylesheetPromise;
};

type InteractiveMapProps = {
  lng: number;
  lat: number;
  label: string;
  onReady: () => void;
  onError: () => void;
};

export default function InteractiveMap({
  lng,
  lat,
  label,
  onReady,
  onError,
}: InteractiveMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };

  useEffect(() => {
    let cancelled = false;
    let map: L.Map | undefined;
    let observer: ResizeObserver | undefined;
    let failed = false;
    const fail = () => {
      failed = true;
      if (!cancelled) callbacks.current.onError();
    };
    const initialize = async () => {
      try {
        await loadStylesheet();
        if (cancelled || !container.current) return;
        map = L.map(container.current, {
          center: [lat, lng],
          zoom: CABINET_MAP.zoom,
          scrollWheelZoom: false,
          fadeAnimation: false,
          zoomAnimation: !window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches,
          attributionControl: false,
          zoomControl: false,
        });
        L.control.attribution({ prefix: false }).addTo(map);
        L.control
          .zoom({
            position: 'bottomright',
            zoomInTitle: 'Agrandir la carte',
            zoomOutTitle: 'Réduire la carte',
          })
          .addTo(map);
        const tiles = L.tileLayer(CABINET_MAP.tileUrl, {
          attribution: CABINET_MAP.attribution,
          tileSize: CABINET_MAP.tileSize,
          zoomOffset: CABINET_MAP.zoomOffset,
          maxZoom: 19,
        });
        tiles.on('tileerror', fail);
        tiles.once('load', () => {
          if (!cancelled && !failed) callbacks.current.onReady();
        });
        tiles.addTo(map);
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'cabinet-map-marker',
            iconSize: [CABINET_MAP.markerSize, CABINET_MAP.markerSize],
            iconAnchor: [
              CABINET_MAP.markerSize / 2,
              CABINET_MAP.markerSize / 2,
            ],
            html: CABINET_MAP.markerHtml,
          }),
          title: label,
          alt: label,
        });
        const popup = document.createElement('span');
        popup.textContent = label;
        marker.bindPopup(popup).addTo(map);
        observer = new ResizeObserver(() =>
          map?.invalidateSize({ pan: false })
        );
        observer.observe(container.current);
      } catch {
        fail();
      }
    };
    void initialize();
    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [lat, lng, label]);

  return (
    <div
      ref={container}
      className="cabinet-live-map"
      role="region"
      aria-label="Carte interactive du cabinet de Bègles"
    />
  );
}
