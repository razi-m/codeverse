/**
 * A single labelled gauge with the trigger limit marked — not a chart
 * (Design.md § Component Inventory). Carries a full text equivalent in
 * the accessible name, not only conveyed visually (Design.md §
 * Accessibility).
 *
 * The scale is fixed at 1.6x the threshold so the limit marker always
 * sits at a consistent position on the track, which keeps the gauge
 * readable across policies rather than rescaling under the reader.
 */
export function ThresholdMeter({
  reading,
  threshold,
  unit = "mm",
}: {
  reading: number | null;
  threshold: number;
  unit?: string;
}) {
  const belowThreshold = reading !== null && reading < threshold;
  const scaleMax = Math.max(threshold * 1.6, reading ?? 0, 1);
  const readingPct = reading !== null ? Math.min(100, (reading / scaleMax) * 100) : 0;
  const thresholdPct = Math.min(100, (threshold / scaleMax) * 100);

  const label =
    reading === null
      ? `Waiting for a reading. Your trigger limit is ${threshold}${unit}.`
      : `Measured ${reading}${unit}, trigger limit ${threshold}${unit} — ${
          belowThreshold ? "below the limit" : "above the limit"
        }.`;

  return (
    <div
      className={`threshold-meter${belowThreshold ? " threshold-meter--below" : ""}`}
      role="img"
      aria-label={label}
    >
      <div className="threshold-meter__callout" aria-hidden="true">
        {reading !== null && (
          <span
            className="threshold-meter__callout-value"
            /* Clamped so the callout never runs off either edge */
            style={{ left: `${Math.min(88, Math.max(12, readingPct))}%` }}
          >
            {reading}
            <span className="threshold-meter__callout-unit">{unit}</span>
          </span>
        )}
      </div>

      <div className="threshold-meter__track" aria-hidden="true">
        <div className="threshold-meter__beyond" style={{ width: `${100 - thresholdPct}%` }} />
        <div
          className={`threshold-meter__fill${belowThreshold ? " threshold-meter__fill--below" : ""}`}
          style={{ width: `${readingPct}%` }}
        />
        {reading !== null && (
          <div className="threshold-meter__knob" style={{ left: `${readingPct}%` }} />
        )}
        <div className="threshold-meter__marker" style={{ left: `${thresholdPct}%` }}>
          <span className="threshold-meter__marker-label">
            Limit: {threshold}
            {unit}
          </span>
        </div>
      </div>

      <div className="threshold-meter__labels" aria-hidden="true">
        <span>
          0<em>{unit}</em>
        </span>
        <span>
          {scaleMax.toFixed(1)}
          <em>{unit}</em>
        </span>
      </div>
    </div>
  );
}
