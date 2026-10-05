import { useEffect, useRef, useState } from 'react';
import { CABINET_MAP, getStaticMapTiles } from '../../../lib/map';

export default function StaticMap({ lng, lat }: { lng: number; lat: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1024, height: 768 });
  const [failed, setFailed] = useState(false);
  const tiles = getStaticMapTiles(lng, lat, size.width, size.height);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        width: Math.max(1, Math.round(entry.contentRect.width)),
        height: Math.max(1, Math.round(entry.contentRect.height)),
      });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="map-static">
      <div
        className="map-static-layer"
        style={{ width: size.width, height: size.height }}
        role="img"
        aria-label="Carte du quartier du cabinet, à Bègles"
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            width={CABINET_MAP.tileSize}
            height={CABINET_MAP.tileSize}
            style={{
              left: tile.left,
              top: tile.top,
              width: CABINET_MAP.tileSize,
              height: CABINET_MAP.tileSize,
            }}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        ))}
        <span
          className="cabinet-map-marker"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: CABINET_MAP.markerHtml }}
        />
      </div>
      {failed && (
        <div className="map-placeholder map-static-error">
          <h3>Rendez-vous à Bègles.</h3>
          <p>34 rue du Maréchal Joffre · 33130</p>
          <p className="map-unavailable">
            L’aperçu de la carte est indisponible.
          </p>
        </div>
      )}
      <div
        className="map-attribution"
        dangerouslySetInnerHTML={{ __html: CABINET_MAP.attribution }}
      />
    </div>
  );
}
