import { Skeleton } from "../components/shared/Skeleton.js";
import { Card } from "../components/shared/Card.js";
import { Masthead, RegistryStrip } from "../components/shared/Masthead.js";

/** Sized to the final layout so nothing shifts on load (Design.md § Interaction Guidelines). */
export function PolicySkeleton() {
  return (
    <div className="farmer-page">
      <Masthead />
      <RegistryStrip index="Cadastral Index // 2026.S2-Kharif" id="Loading…" />

      <div className="status-banner">
        <Skeleton width="70%" height="1.9em" />
      </div>

      {/* Parcel plan placeholder — matches ParcelPlan's aspect ratio */}
      <div className="parcel">
        <div className="parcel__head">
          <Skeleton width="180px" height="2.4em" />
        </div>
        <Skeleton height="0" width="100%" />
        <div style={{ paddingTop: "56%", position: "relative", background: "var(--surface-sunken)" }} />
      </div>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-8)" }}>
          <Skeleton height="3.4em" />
          <Skeleton height="3.4em" />
        </div>
        <div style={{ marginTop: "var(--sp-6)" }}>
          <Skeleton height="1.2em" />
        </div>
      </Card>

      <Card>
        <div style={{ display: "grid", gap: "var(--sp-3)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="2em" />
          ))}
        </div>
      </Card>
    </div>
  );
}
