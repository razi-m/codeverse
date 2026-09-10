import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPolicies, PolicyStatus, type Policy } from "../../lib/api.js";
import { FundPolicyAction } from "./FundPolicyAction.js";

const STATUS_LABEL: Record<PolicyStatus, string> = {
  [PolicyStatus.Active]: "Active",
  [PolicyStatus.PaidOut]: "Paid",
  [PolicyStatus.Expired]: "Expired",
  [PolicyStatus.Cancelled]: "Cancelled",
};

const STATUS_TONE: Record<PolicyStatus, string> = {
  [PolicyStatus.Active]: "active",
  [PolicyStatus.PaidOut]: "paid",
  [PolicyStatus.Expired]: "ended",
  [PolicyStatus.Cancelled]: "ended",
};

/**
 * Dense portfolio: ID, farmer, crop, cover, status, funded, last reading
 * (Design.md § Component Inventory). Reads via the backend API — cheaper
 * than N wagmi reads for a table that can grow, and the backend already
 * exists for exactly this (P6). Unfunded policies flagged per T4.2/UserFlows
 * (a policy that exists but is unfunded is a promise with nothing behind
 * it — the table makes that visible, never assumed).
 */
export function PolicyTable() {
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicies(0, 100)
      .then((r) => setPolicies(r.policies))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load policies"));
  }, []);

  if (error) return <p className="notice">{error}</p>;
  if (!policies) return <p className="mono-label">Loading portfolio…</p>;
  if (policies.length === 0) return <p className="empty-note">No policies yet.</p>;

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Farmer</th>
            <th>Crop</th>
            <th>Region</th>
            <th>Cover</th>
            <th>Trigger</th>
            <th>Status</th>
            <th>Funded</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p.id}>
              <td style={{ fontFamily: "var(--font-mono)" }}>{p.id}</td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.9em" }}>
                {p.farmer.slice(0, 6)}…{p.farmer.slice(-4)}
              </td>
              <td>{p.cropType}</td>
              <td>{p.regionDisplayName}</td>
              <td style={{ fontFamily: "var(--font-mono)" }}>
                ₹{(Number(p.coverageAmount) * 1000).toLocaleString("en-IN")}
              </td>
              <td style={{ fontFamily: "var(--font-mono)" }}>&lt;{p.thresholdValue}mm</td>
              <td>
                <span className={`badge badge--${STATUS_TONE[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </td>
              <td>
                {p.funded ? (
                  <span className="mono-label">Yes</span>
                ) : (
                  <span className="badge" style={{ color: "var(--danger)" }}>
                    Unfunded
                  </span>
                )}
              </td>
              <td>
                <Link to={`/policy/${p.id}`} target="_blank" rel="noreferrer" className="mono-label">
                  View →
                </Link>
                {!p.funded && (
                  <div style={{ marginTop: "var(--sp-2)" }}>
                    <FundPolicyAction policy={p} />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
