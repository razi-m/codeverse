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
  type LanguageCode,
} from "../lib/api.js";
import { StatusBanner } from "../components/farmer/StatusBanner.js";
import { PolicyTermsCard } from "../components/farmer/PolicyTermsCard.js";
import { ThresholdMeter } from "../components/farmer/ThresholdMeter.js";
import { ClaimLedger } from "../components/farmer/ClaimLedger.js";
import { VerifyPanel } from "../components/farmer/VerifyPanel.js";
import { HowThisWorks } from "../components/farmer/HowThisWorks.js";
import { FarmerErrorState } from "../components/farmer/FarmerErrorState.js";
import { LanguageSwitcher } from "../components/farmer/LanguageSwitcher.js";
import { ParcelPlan } from "../components/farmer/ParcelPlan.js";
import { WhatsappOptIn } from "../components/farmer/WhatsappOptIn.js";
import { Masthead, RegistryStrip } from "../components/shared/Masthead.js";
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

/** Registry-style document ID, derived from the policy — display only. */
function documentId(policy: Policy): string {
  return `KS-IND-${String(policy.id).padStart(6, "0")}`;
}

export default function PolicyView() {
  const { id } = useParams<{ id: string }>();
  const policyId = Number(id);

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [ledger, setLedger] = useState<PolicyLedger | null>(null);
  const [verify, setVerify] = useState<PolicyVerify | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageCode>("en");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [p, l, v] = await Promise.all([
          fetchPolicy(policyId),
          fetchLedger(policyId, language),
          fetchVerify(policyId),
        ]);
        setPolicy(p);
        setLedger(l);
        setVerify(v);
      } catch (err) {
        // Three distinguishable failure modes (T4.7): unknown policy,
        // backend entirely unreachable (fetch itself throws — no
        // response at all), and the backend reachable but the chain
        // read behind it failing (a specific 500 message).
        if (err instanceof TypeError) {
          setError("We couldn't reach KisanShield right now. Please check your connection and try again.");
        } else if (err instanceof Error && err.message === "Policy not found") {
          setError("We couldn't find a policy with that number. Please check it and try again.");
        } else if (err instanceof Error && /deployment|RPC/i.test(err.message)) {
          setError("The weather record service is temporarily unavailable. Please try again in a moment.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [policyId, language]
  );

  useEffect(() => {
    if (!Number.isInteger(policyId) || policyId < 1) {
      setError("That doesn't look like a valid policy number.");
      setLoading(false);
      return;
    }
    load();
  }, [policyId, language, load]);

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
        <Masthead actions={<LanguageSwitcher value={language} onChange={setLanguage} />} />
        <RegistryStrip index="Cadastral Index // 2026.S2-Kharif" id="—" />
        <FarmerErrorState message={error ?? "Unable to load this policy."} onRetry={() => load()} />
      </div>
    );
  }

  const currentReading = latestConsensusValue(verify);
  const breached = currentReading !== null && currentReading < policy.thresholdValue;
  const isRainfall = policy.triggerType === 0;
  const unit = isRainfall ? "mm" : "idx";
  const isPaid = policy.status === PolicyStatus.PaidOut;
  // How far under the limit the reading fell — only meaningful once a
  // breach has actually happened, so it stays null otherwise.
  const deficit = breached ? policy.thresholdValue - (currentReading as number) : null;

  return (
    <div className="farmer-page">
      <Masthead actions={<LanguageSwitcher value={language} onChange={setLanguage} />} />
      <RegistryStrip
        index="Cadastral Index // 2026.S2-Kharif"
        id={`ID: ${documentId(policy)}`}
      />

      <div className="stagger">
        <div style={{ ["--i" as string]: 0 }}>
          {isPaid ? (
            <section className="payout-hero" role="status" aria-live="polite">
              <div className="payout-hero__row">
                <p className="payout-hero__eyebrow">Disbursement approved</p>
                <span className="chip chip--satisfied">✓ Condition satisfied</span>
              </div>
              <h1 className="payout-hero__headline">{ledger.summary}</h1>
              <p className="payout-hero__sub">
                Recorded for <strong>{policy.regionDisplayName}</strong> ({policy.regionId}).
                Released automatically against your policy — no claim form, no inspection.
              </p>
            </section>
          ) : (
            <StatusBanner status={policy.status} summary={ledger.summary} />
          )}
        </div>

        {policy.coordinates && (
          <div style={{ ["--i" as string]: 1 }}>
            <ParcelPlan
              regionId={policy.regionId}
              regionLabel={policy.regionDisplayName}
              latitude={policy.coordinates.latitude}
              longitude={policy.coordinates.longitude}
              cropType={policy.cropType}
              areaAcres={policy.areaAcres ?? 3.8}
              raining={!breached}
            />
          </div>
        )}

        {/* The measurement that decides everything */}
        <div style={{ ["--i" as string]: 2 }}>
          <div
            className="section-head"
            style={{ marginTop: "var(--sp-8)", alignItems: "flex-start" }}
          >
            <span>
              <span className="section-head__text" style={{ display: "block" }}>
                Meteorological telemetry
              </span>
              <span
                className="card__title"
                style={{ display: "block", marginTop: 4, marginBottom: 0 }}
              >
                {isRainfall ? "Cumulative rain against limit" : "Vegetation index against limit"}
              </span>
            </span>
            <span className="section-head__rule" style={{ marginTop: 10 }} />
            {deficit !== null && (
              <span className="chip chip--deficit" style={{ marginTop: 4 }}>
                −{deficit.toFixed(2)} {unit} deficit
              </span>
            )}
          </div>

          <div className="card">
            <ThresholdMeter
              reading={currentReading}
              threshold={policy.thresholdValue}
              unit={unit}
            />

            <div className="stat-grid">
              <div className="stat-panel">
                <span className="stat-panel__label">
                  {isRainfall ? "Observed rainfall" : "Observed index"}
                </span>
                <span className="stat-panel__value">
                  {currentReading !== null ? currentReading.toFixed(2) : "—"}
                  <em>{unit}</em>
                </span>
                <span className="stat-panel__note">
                  {currentReading !== null
                    ? "Agreed by both weather sources"
                    : "Waiting for both sources to report"}
                </span>
              </div>
              <div className="stat-panel stat-panel--neutral">
                <span className="stat-panel__label">Safety threshold</span>
                <span className="stat-panel__value">
                  {policy.thresholdValue.toFixed(2)}
                  <em>{unit}</em>
                </span>
                <span className="stat-panel__note">Trigger bench limit</span>
              </div>
            </div>

            {isPaid && (
              <p className="guarantee">
                <span className="guarantee__mark" aria-hidden="true">
                  ✦
                </span>
                <span>
                  <strong>Zero paperwork guarantee:</strong> your payout was released
                  automatically the moment both weather sources agreed the limit was breached —
                  with no claim form and no physical inspection.
                </span>
              </p>
            )}
          </div>
        </div>

        <div style={{ ["--i" as string]: 3 }}>
          <div className="section-head">
            <span className="section-head__text">Schedule of cover</span>
            <span className="section-head__rule" />
          </div>
          <PolicyTermsCard policy={policy} />
        </div>

        <div style={{ ["--i" as string]: 4 }}>
          <div className="section-head">
            <span className="section-head__text">Record of decisions</span>
            <span className="section-head__rule" />
          </div>
          <ClaimLedger entries={ledger.ledger} />
        </div>

        <div style={{ ["--i" as string]: 5, marginTop: "var(--sp-8)" }}>
          <div className="section-head">
            <span className="section-head__text">Notification preferences</span>
            <span className="section-head__rule" />
          </div>
          <WhatsappOptIn />
        </div>

        <div style={{ ["--i" as string]: 6, marginTop: "var(--sp-8)" }}>
          <HowThisWorks />
          {verify && <VerifyPanel verify={verify} />}
        </div>
      </div>
    </div>
  );
}
