/**
 * Slippy-map tile math (OSM/Google XYZ scheme) — no mapping library needed,
 * just enough to turn a lat/lon + zoom into a single static tile image URL.
 * Kept separate from ParcelPlan's SVG sketch: that's an indicative drawing,
 * this is a real, externally-served satellite photograph of the plot.
 */

export function lonLatToTile(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: Math.min(Math.max(x, 0), n - 1), y: Math.min(Math.max(y, 0), n - 1) };
}

/** Esri World Imagery — free, no API key, real satellite/aerial photography. */
export function esriImageryTileUrl(lat: number, lon: number, zoom = 14): string {
  const { x, y } = lonLatToTile(lon, lat, zoom);
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
}

/** Esri World Terrain reference (topo/vegetation-shaded) — used as the honest second real layer, not a fake "before" photo. */
export function esriTerrainTileUrl(lat: number, lon: number, zoom = 14): string {
  const { x, y } = lonLatToTile(lon, lat, zoom);
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/${zoom}/${y}/${x}`;
}
