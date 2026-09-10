import { useState } from "react";
import { esriImageryTileUrl, esriTerrainTileUrl } from "../../lib/slippyTiles.js";
import {
  computeCollateralConfidence,
  type ConfidenceBand,
} from "../../lib/collateralConfidence.js";

/**
 * Real satellite imagery of the insured plot, plus a same-day collateral
 * confidence rating for lenders. Always renders the current satellite view
 * regardless of loss status; when the policy has paid out, adds a second
 * real map layer for comparison.
 *
 * Honesty constraint (matches ParcelPlan's "Indicative Sketch" labelling):
 * this project has no paid access to dated historical satellite imagery, so
 * the "after a loss" panel is a second REAL, currently-served map layer
 * (terrain/vegetation-shaded), clearly labelled as a comparison layer — not
 * a fabricated "before disaster" photograph.
 */

function bandClass(band: ConfidenceBand): string {
  if (band === "strong") return "confidence--strong";
  if (band === "moderate") return "confidence--moderate";
  return "confidence--watch";
}

export function SatelliteView({
  regionLabel,
  latitude,
  longitude,
  status,
  funded,
  thresholdValue,
  currentReading,
  consensusReached,
  coverageAmount,
}: {
  regionLabel: string;
  latitude: number;
  longitude: number;
  status: number;
  funded: boolean;
  thresholdValue: number;
  currentReading: number | null;
  consensusReached: boolean;
  coverageAmount: string;
}) {
  const [imageryFailed, setImageryFailed] = useState(false);
  const [terrainFailed, setTerrainFailed] = useState(false);

  const lossRecorded = status === 1; // PolicyStatus.PaidOut

  const confidence = computeCollateralConfidence({
    status,
    funded,
    thresholdValue,
    currentReading,
    consensusReached,
    coverageAmount,
  });

  const imageryUrl = esriImageryTileUrl(latitude, longitude, 14);
  const terrainUrl = esriTerrainTileUrl(latitude, longitude, 14);

  return (
    <section className="satellite" aria-labelledby="satellite-heading">
      <div className="satellite__head">
        <div>
          <span className="parcel__coords" style={{ display: "block" }}>
            {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
            <span id="satellite-heading">{regionLabel} — satellite record</span>
          </span>
        </div>
        <span className="parcel__badge">Esri World Imagery</span>
      </div>

      <div className={`satellite__grid${lossRecorded ? " satellite__grid--split" : ""}`}>
        <figure className="satellite__frame">
          {!imageryFailed ? (
            <img
              src={imageryUrl}
              alt={`Current satellite view of the insured plot near ${regionLabel}`}
              onError={() => setImageryFailed(true)}
              loading="lazy"
            />
          ) : (
            <div className="satellite__fallback">Satellite tile unavailable</div>
          )}
          <figcaption>Current satellite view</figcaption>
        </figure>

        {lossRecorded && (
          <figure className="satellite__frame">
            {!terrainFailed ? (
              <img
                src={terrainUrl}
                alt={`Vegetation/terrain comparison layer for the insured plot near ${regionLabel}`}
                onError={() => setTerrainFailed(true)}
                loading="lazy"
              />
            ) : (
              <div className="satellite__fallback">Comparison layer unavailable</div>
            )}
            <figcaption>Comparison layer, recorded at payout</figcaption>
          </figure>
        )}
      </div>

      {lossRecorded && (
        <p className="satellite__note">
          A payout was recorded against this plot. Dated historical imagery from before the
          triggering event is not available from this project's free imagery source — the panel
          above shows two real, currently-served map layers for visual comparison, not a
          before/after photograph.
        </p>
      )}

      <div className={`confidence ${bandClass(confidence.band)}`}>
        <div className="confidence__row">
          <span className="confidence__label">Collateral confidence · {confidence.asOfDate}</span>
          <span className="confidence__score">{confidence.score}</span>
        </div>
        <div className="confidence__bar">
          <div className="confidence__bar-fill" style={{ width: `${confidence.score}%` }} />
        </div>
        <p className="confidence__headline">{confidence.label}</p>
        <ul className="confidence__reasons">
          {confidence.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
