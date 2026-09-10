/**
 * Maps an on-chain `regionId` (opaque string, e.g. "MH-VID-04") to the
 * coordinates a real weather API needs. This mapping does not exist
 * on-chain or in Supabase (docs/Schema.md only stores a display name) —
 * it is new, off-chain, presentational-adjacent config, same trust tier
 * as `policy_metadata.region_display_name`. Nothing here is authoritative
 * for a payout; it only tells a WeatherSource adapter where to look.
 */

export type RegionCoordinates = {
  latitude: number;
  longitude: number;
  /** Human label for logs only — never shown to a farmer as-is. */
  label: string;
  /**
   * [west, south, east, north] in degrees — a small box around the point
   * above, for area-based sources (NDVI) that need a field extent rather
   * than a single coordinate. ~0.02deg (~2km at this latitude) is a
   * plausible single-field size for the demo; a real deployment would
   * store each policy's actual plot boundary instead.
   */
  bbox: [number, number, number, number];
};

// Demo dataset (single entry): Yavatmal, Maharashtra — the seeded demo
// policy's region. Add entries here as new policies are seeded; this is
// deliberately a plain object, not a database table, matching the
// project's "smallest clean change" scope for P9.
const REGIONS: Record<string, RegionCoordinates> = {
  "MH-VID-04": {
    latitude: 20.3888,
    longitude: 78.1204,
    label: "Yavatmal, Maharashtra",
    bbox: [78.1004, 20.3688, 78.1404, 20.4088],
  },
};

export function resolveRegion(regionId: string): RegionCoordinates | null {
  return REGIONS[regionId] ?? null;
}
