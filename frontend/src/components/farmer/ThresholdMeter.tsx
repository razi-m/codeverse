import { Measurement } from "../shared/Measurement.js";

/**
 * A single labelled bar with the threshold marked — not a chart
 * (Design.md § Component Inventory). Carries a full text equivalent in
 * the accessible name, not only conveyed visually (Design.md §
 * Accessibility).
 */
export function ThresholdMeter({
  reading,
  threshold,
}: {
  reading: number | null;
  threshold: number;
}) {
  const belowThreshold = reading !== null && reading < threshold;
  const scaleMax = Math.max(threshold * 1.5, reading ?? 0, 1);
  const readingPct = reading !== null ? Math.min(100, (reading / scaleMax) * 100) : 0;
  const thresholdPct = Math.min(100, (threshold / scaleMax) * 100);

  const label =
    reading === null
      ? `Waiting for a reading. Your threshold is ${threshold}mm.`
      : `Rainfall ${reading}mm, threshold ${threshold}mm — ${
          belowThreshold ? "below threshold" : "above threshold"
        }.`;

  return (
    <div className="threshold-meter" role="img" aria-label={label}>
      <div className="threshold-meter__track" aria-hidden="true">
        <div
          className={`threshold-meter__fill${belowThreshold ? " threshold-meter__fill--below" : ""}`}
          style={{ width: `${readingPct}%` }}
        />
        <div className="threshold-meter__marker" style={{ left: `${thresholdPct}%` }}>
          <span className="threshold-meter__marker-label">
            <Measurement value={threshold} /> threshold
          </span>
        </div>
      </div>
      <div className="threshold-meter__labels" aria-hidden="true">
        <span>0mm</span>
        <span>{reading !== null ? <Measurement value={reading} /> : "No reading yet"}</span>
      </div>
    </div>
  );
}
