import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  fetchPolicy,
  fetchLedger,
  fetchVerify,
  PolicyStatus,
  type Policy,
  type PolicyLedger,
  type PolicyVerify,
} from "../lib/api.js";
import { StatusBanner } from "../components/farmer/StatusBanner.js";
import { PolicyTermsCard } from "../components/farmer/PolicyTermsCard.js";
import { ThresholdMeter } from "../components/farmer/ThresholdMeter.js";
import { ClaimLedger } from "../components/farmer/ClaimLedger.js";
import { VerifyPanel } from "../components/farmer/VerifyPanel.js";
import { HowThisWorks } from "../components/farmer/HowThisWorks.js";
import { FarmerErrorState } from "../components/farmer/FarmerErrorState.js";
import { Card } from "../components/shared/Card.js";
import { PolicySkeleton } from "./PolicySkeleton.js";

const AUTO_REFRESH_MS = 15_000;

/** Undoes the on-chain x100 scale for a raw verify-event arg (D7) — client-side, same rule as the backend. */
function unscale(raw: unknown): number {
  return Number(raw) / 100;
}

/** Most recent consensus value from the raw event stream, for the meter — reuses the verify payload rather than a new endpoint. */
function latestConsensusValue(verify: PolicyVerify | null): number | null {
  if (!verify) return null;
  const reached = [...verify.events].reverse().find((e) => e.name === "ConsensusReached");
  if (!reached) return null;
  return unscale(reached.args.consensusValue);
}

export default function PolicyView() {
  const { id } = useParams<{ id: string }>();
  const policyId = Number(id);

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [ledger, setLedger] = useState<PolicyLedger | null>(null);
  const [verify, setVerify] = useState<PolicyVerify | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [p, l, v] = await Promise.all([
          fetchPolicy(policyId),
          fetchLedger(policyId),
          fetchVerify(policyId),
        ]);
        setPolicy(p);
        setLedger(l);
        setVerify(v);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message === "Policy not found"
              ? "We couldn't find a policy with that ID. Please check the number and try again."
              : "We couldn't reach the service right now. Please try again in a moment."
            : "Something went wrong. Please try again."
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [policyId]
  );

  useEffect(() => {
    if (!Number.isInteger(policyId) || policyId < 1) {
      setError("That doesn't look like a valid policy ID.");
      setLoading(false);
      return;
    }
    load();
  }, [policyId, load]);

  // Silent auto-refresh while the policy is still Active and awaiting a
  // decision (Design.md § Interaction Guidelines) — no flicker, no scroll jump.
  useEffect(() => {
    if (!policy || policy.status !== PolicyStatus.Active) return;
    const interval = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [policy, load]);

  if (loading) return <PolicySkeleton />;

  if (error || !policy || !ledger) {
    return (
      <div className="farmer-page">
        <FarmerErrorState message={error ?? "Unable to load this policy."} onRetry={() => load()} />
      </div>
    );
  }

  const currentReading = latestConsensusValue(verify);

  return (
    <div className="farmer-page">
      <StatusBanner status={policy.status} summary={ledger.summary} />

      <PolicyTermsCard policy={policy} />

      <Card>
        <h2 style={{ fontSize: "var(--fs-h2)", marginTop: 0 }}>Rainfall vs. your threshold</h2>
        <ThresholdMeter reading={currentReading} threshold={policy.thresholdValue} />
      </Card>

      <ClaimLedger entries={ledger.ledger} />

      <HowThisWorks />
      {verify && <VerifyPanel verify={verify} />}
    </div>
  );
}
