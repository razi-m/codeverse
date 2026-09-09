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

  if (error) return <p style={{ color: "var(--danger)" }}>{error}</p>;
  if (!policies) return <p style={{ color: "var(--text-muted)" }}>Loading portfolio…</p>;
  if (policies.length === 0) return <p style={{ color: "var(--text-muted)" }}>No policies yet.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-body)" }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "2px solid var(--border)" }}>
          <th style={cellStyle}>ID</th>
          <th style={cellStyle}>Farmer</th>
          <th style={cellStyle}>Crop</th>
          <th style={cellStyle}>Region</th>
          <th style={cellStyle}>Cover</th>
          <th style={cellStyle}>Threshold</th>
          <th style={cellStyle}>Status</th>
          <th style={cellStyle}>Funded</th>
          <th style={cellStyle}></th>
        </tr>
      </thead>
      <tbody>
        {policies.map((p) => (
          <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={cellStyle}>{p.id}</td>
            <td style={{ ...cellStyle, fontFamily: "var(--font-mono)", fontSize: "0.85em" }}>
              {p.farmer.slice(0, 6)}…{p.farmer.slice(-4)}
            </td>
            <td style={cellStyle}>{p.cropType}</td>
            <td style={cellStyle}>{p.regionDisplayName}</td>
            <td style={cellStyle}>₹{(Number(p.coverageAmount) * 1000).toLocaleString("en-IN")}</td>
            <td style={cellStyle}>{p.thresholdValue}mm</td>
            <td style={cellStyle}>{STATUS_LABEL[p.status]}</td>
            <td style={cellStyle}>
              {p.funded ? (
                "Yes"
              ) : (
                <span style={{ color: "var(--danger)", fontWeight: 600 }}>Unfunded</span>
              )}
            </td>
            <td style={cellStyle}>
              <Link to={`/policy/${p.id}`} target="_blank" rel="noreferrer">
                View
              </Link>
              {!p.funded && (
                <div style={{ marginTop: 4 }}>
                  <FundPolicyAction policy={p} />
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const cellStyle: React.CSSProperties = { padding: "8px 12px" };
