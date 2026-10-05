import { API_CONFIG } from './constants/api';

const mapboxToken = API_CONFIG.mapbox.token;
const mapboxEnabled = Boolean(mapboxToken);
const tileUrl = mapboxEnabled
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(mapboxToken ?? '')}`
  : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Both views share the camera, raster style and pixel origin.
export const CABINET_MAP = {
  zoom: 15,
  tileSize: mapboxEnabled ? 512 : 256,
  zoomOffset: mapboxEnabled ? -1 : 0,
  provider: mapboxEnabled ? 'mapbox' : 'openstreetmap',
  tileUrl,
  attribution: `${mapboxEnabled ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> · ' : ''}&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>${mapboxEnabled ? ' · <a href="https://apps.mapbox.com/feedback/">Améliorer cette carte</a>' : ''}`,
  markerSize: 48,
  markerHtml:
    '<span class="cabinet-marker-monogram">OA</span><span class="cabinet-marker-label">Le cabinet</span>',
} as const;

export function getStaticMapTiles(
  lng: number,
  lat: number,
  width: number,
  height: number
) {
  const zoom = CABINET_MAP.zoom + CABINET_MAP.zoomOffset;
  const scale = 2 ** zoom;
  const radians = (lat * Math.PI) / 180;
  const centerX = ((lng + 180) / 360) * scale * CABINET_MAP.tileSize;
  const centerY =
    ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) *
    scale *
    CABINET_MAP.tileSize;
  // Leaflet rounds its pixel origin so both views align on the same pixel.
  const left = Math.round(centerX - width / 2);
  const top = Math.round(centerY - height / 2);
  const tiles = [];
  for (
    let y = Math.floor(top / CABINET_MAP.tileSize);
    y <= Math.floor((top + height - 1) / CABINET_MAP.tileSize);
    y += 1
  ) {
    for (
      let x = Math.floor(left / CABINET_MAP.tileSize);
      x <= Math.floor((left + width - 1) / CABINET_MAP.tileSize);
      x += 1
    ) {
      tiles.push({
        key: `${x}-${y}`,
        src: CABINET_MAP.tileUrl
          .replace('{z}', String(zoom))
          .replace('{x}', String(x))
          .replace('{y}', String(y)),
        left: x * CABINET_MAP.tileSize - left,
        top: y * CABINET_MAP.tileSize - top,
      });
    }
  }
  return tiles;
}
