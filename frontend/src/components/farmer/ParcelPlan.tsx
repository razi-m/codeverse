import { useMemo } from "react";

/**
 * The cadastral drawing: a plot boundary sketched over a survey grid.
 *
 * The geometry is DERIVED, not decorative-random — a hash of the policy's
 * regionId seeds the plot's shape and the neighbouring parcels, so the
 * same policy always renders the same plan. It is explicitly labelled as
 * an indicative sketch, never presented as a surveyed boundary, because
 * this project has no real plot geometry (docs/Schema.md stores only an
 * opaque regionId — see regionRegistry.ts for the coordinate mapping).
 */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic [0,1) generator seeded from the hash. */
function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function ParcelPlan({
  regionId,
  regionLabel,
  latitude,
  longitude,
  cropType,
  areaAcres,
  live,
  raining,
}: {
  regionId: string;
  regionLabel: string;
  latitude: number;
  longitude: number;
  cropType: string;
  areaAcres: number;
  live?: boolean;
  raining?: boolean;
}) {
  const { plot, neighbours, pins } = useMemo(() => {
    const rand = seeded(hash(regionId));

    // Main parcel: an irregular quadrilateral around the centre, rotated
    // slightly so it never reads as a generic rectangle.
    const cx = 268;
    const cy = 150;
    const w = 96 + rand() * 26;
    const h = 78 + rand() * 22;
    const jitter = () => (rand() - 0.5) * 22;
    const corners = [
      [cx - w / 2 + jitter(), cy - h / 2 + jitter()],
      [cx + w / 2 + jitter(), cy - h / 2 + jitter()],
      [cx + w / 2 + jitter(), cy + h / 2 + jitter()],
      [cx - w / 2 + jitter(), cy + h / 2 + jitter()],
    ];
    const plotPath =
      corners.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") +
      " Z";

    // Neighbouring parcels — context, faint, never labelled.
    const nb: string[] = [];
    for (let i = 0; i < 7; i++) {
      const nx = 60 + rand() * 420;
      const ny = 40 + rand() * 220;
      const nw = 48 + rand() * 74;
      const nh = 40 + rand() * 56;
      nb.push(`M${nx.toFixed(0)} ${ny.toFixed(0)} h${nw.toFixed(0)} v${nh.toFixed(0)} h${-nw.toFixed(0)} Z`);
    }

    // Sample points inside the plot — soil/moisture stations.
    const pts = [
      [cx - w / 4, cy + h / 5],
      [cx + w / 3.4, cy + h / 3.2],
    ];

    return { plot: plotPath, neighbours: nb, pins: pts };
  }, [regionId]);

  return (
    <section className="parcel" aria-labelledby="parcel-heading">
      <div className="parcel__head">
        <div className="parcel__coords">
          {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
          <span id="parcel-heading">{regionLabel}</span>
        </div>
        <span className={`parcel__badge${live ? " parcel__badge--live" : ""}`}>
          {live ? "Sentinel-2 Live" : "Indicative Sketch"}
        </span>
      </div>

      <svg
        className="parcel__canvas"
        viewBox="0 0 536 300"
        role="img"
        aria-label={`Indicative plan of the insured plot in ${regionLabel}, ${areaAcres} acres of ${cropType}.`}
      >
        <defs>
          <pattern id="survey-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M26 0H0V26" fill="none" stroke="var(--rule)" strokeWidth="1" />
          </pattern>
          <pattern
            id="plot-hatch"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(38)"
          >
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--ink)" strokeWidth="0.8" opacity="0.16" />
          </pattern>
        </defs>

        <rect width="536" height="300" fill="url(#survey-grid)" />

        {/* Neighbouring parcels — context only */}
        <g stroke="var(--border-strong)" strokeWidth="1" fill="none" opacity="0.35">
          {neighbours.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* Section lines through the insured plot */}
        <g stroke="var(--border-strong)" strokeWidth="0.8" opacity="0.5" strokeDasharray="3 5">
          <path d="M268 26 V274" />
          <path d="M120 150 H430" />
        </g>

        {/* Rainfall ticks falling over the plot */}
        {raining && (
          <g stroke="var(--ink-soft)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
            {[228, 252, 276, 300].map((x, i) => (
              <line
                key={x}
                className="rain-tick"
                x1={x}
                y1="66"
                x2={x - 3}
                y2="80"
                style={{ animationDelay: `${i * 0.35}s` }}
              />
            ))}
          </g>
        )}

        {/* The insured parcel */}
        <path d={plot} fill="url(#plot-hatch)" />
        <path
          className="plot-boundary"
          d={plot}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Centroid marker */}
        <g className="plot-pin">
          <circle cx="268" cy="150" r="4.5" fill="var(--ink)" />
          <circle cx="268" cy="150" r="10" fill="none" stroke="var(--ink)" strokeWidth="1" opacity="0.4" />
        </g>

        {/* Sample stations */}
        <g className="plot-pin">
          {pins.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.6" fill="var(--copper)" opacity="0.85" />
          ))}
        </g>

        {/* Parcel label */}
        <text
          x="268"
          y="196"
          textAnchor="middle"
          fill="var(--text-muted)"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          PARCEL {regionId}
        </text>
      </svg>

      <div className="parcel__foot">
        <span className="parcel__foot-dot" aria-hidden="true" />
        {cropType} · {areaAcres} Acres
      </div>
    </section>
  );
}
