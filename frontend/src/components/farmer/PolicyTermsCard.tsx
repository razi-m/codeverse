import type { Policy } from "../../lib/api.js";
import { Card } from "../shared/Card.js";
import { Money } from "../shared/Money.js";
import { Measurement } from "../shared/Measurement.js";
import { DateDisplay } from "../shared/DateDisplay.js";

/** Crop, area, cover amount, trigger, period — in plain units (Design.md § Component Inventory). */
export function PolicyTermsCard({ policy }: { policy: Policy }) {
  const coverageRupees = Number(policy.coverageAmount) * 1000; // same demo rate as explain.ts (D22)

  return (
    <Card>
      <h2 style={{ fontSize: "var(--fs-h2)", marginTop: 0 }}>Your policy</h2>
      <dl className="terms-grid">
        <div>
          <dt>Crop</dt>
          <dd>{policy.cropType}</dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>{policy.regionDisplayName}</dd>
        </div>
        <div>
          <dt>Cover amount</dt>
          <dd>
            <Money rupees={coverageRupees} />
          </dd>
        </div>
        <div>
          <dt>Rainfall threshold</dt>
          <dd>
            below <Measurement value={policy.thresholdValue} />
          </dd>
        </div>
        <div>
          <dt>Cover starts</dt>
          <dd>
            <DateDisplay unixSeconds={policy.startDate} />
          </dd>
        </div>
        <div>
          <dt>Cover ends</dt>
          <dd>
            <DateDisplay unixSeconds={policy.endDate} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}
