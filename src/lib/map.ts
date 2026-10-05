// Shared projection, tiles and camera keep the static and interactive views aligned.
export const CABINET_MAP = {
  zoom: 15,
  tileSize: 256,
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
} as const;

export function getStaticMapTiles(
  lng: number,
  lat: number,
  width: number,
  height: number
) {
  const scale = 2 ** CABINET_MAP.zoom;
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
        src: `https://tile.openstreetmap.org/${CABINET_MAP.zoom}/${x}/${y}.png`,
        left: x * CABINET_MAP.tileSize - left,
        top: y * CABINET_MAP.tileSize - top,
      });
    }
  }
  return tiles;
}
