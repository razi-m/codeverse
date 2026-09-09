import { Skeleton } from "../components/shared/Skeleton.js";
import { Card } from "../components/shared/Card.js";

/** Sized to the final layout so nothing shifts on load (Design.md § Interaction Guidelines). */
export function PolicySkeleton() {
  return (
    <div className="farmer-page">
      <div className="status-banner" style={{ background: "var(--surface-sunken)" }}>
        <Skeleton width="80%" height="1.6em" />
      </div>
      <Card>
        <Skeleton width="40%" height="1.2em" />
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="2.2em" />
          ))}
        </div>
      </Card>
      <Card>
        <Skeleton width="30%" height="1.2em" />
        <Skeleton height="3em" />
        <Skeleton height="3em" />
        <Skeleton height="3em" />
      </Card>
    </div>
  );
}
