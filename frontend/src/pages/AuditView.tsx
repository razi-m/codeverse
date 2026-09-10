import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  fetchVerify,
  fetchHealth,
  type PolicyVerify,
  type HealthStatus,
  type LanguageCode,
} from "../lib/api.js";
import { Masthead, RegistryStrip } from "../components/shared/Masthead.js";
import { LanguageSwitcher } from "../components/farmer/LanguageSwitcher.js";
import { FarmerErrorState } from "../components/farmer/FarmerErrorState.js";
import { PolicySkeleton } from "./PolicySkeleton.js";

/**
 * The receipt drawer. Every raw record behind this policy — untranslated,
 * unsoftened — for the sceptic who wants to check the arithmetic
 * themselves. This is the one farmer surface where technical vocabulary
 * is allowed (Design.md § Layout Principles #3): the whole point is that
 * the underlying record is inspectable, not that it reads nicely.
 *
 * Still wallet-free: everything here is a backend read.
 */

const EXPLORERS: Record<number, string> = {
  11155111: "https://sepolia.etherscan.io",
};

export default function AuditView() {
  const { id } = useParams<{ id: string }>();
  const policyId = Number(id);

  const [verify, setVerify] = useState<PolicyVerify | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageCode>("en");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, h] = await Promise.all([
        fetchVerify(policyId),
        fetchHealth().catch(() => null), // health is supplementary, never fatal here
      ]);
      setVerify(v);
      setHealth(h);
    } catch (err) {
      if (err instanceof TypeError) {
        setError("We couldn't reach KisanShield right now. Please check your connection.");
      } else if (err instanceof Error && err.message === "Policy not found") {
        setError("We couldn't find a policy with that number.");
      } else {
        setError("Unable to load the record right now.");
      }
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    if (!Number.isInteger(policyId) || policyId < 1) {
      setError("That doesn't look like a valid policy number.");
      setLoading(false);
      return;
    }
    load();
  }, [policyId, load]);

  if (loading) return <PolicySkeleton />;

  const header = (
    <>
      <Masthead actions={<LanguageSwitcher value={language} onChange={setLanguage} />} />
      <RegistryStrip
        index="Immutable Record // Public Audit"
        id={`ID: KS-IND-${String(policyId).padStart(6, "0")}`}
      />
    </>
  );

  if (error || !verify) {
    return (
      <div className="farmer-page">
        {header}
        <FarmerErrorState message={error ?? "Unable to load the record."} onRetry={load} />
      </div>
    );
  }

  const chainId = verify.contract?.chainId;
  const explorer = chainId ? EXPLORERS[chainId] : undefined;
  const isPublicChain = Boolean(explorer);

  return (
    <div className="farmer-page">
      {header}

      <div className="stagger">
        <section className="hero" style={{ ["--i" as string]: 0, paddingBottom: "var(--sp-6)" }}>
          <p className="hero__eyebrow">Permanent record</p>
          <h1 className="hero__title" style={{ fontSize: "var(--fs-h1)", maxWidth: "24ch" }}>
            Every decision, exactly as it was written
          </h1>
          <p className="hero__lede" style={{ fontSize: "var(--fs-small)" }}>
            These entries cannot be edited or removed by anyone — including us. Each one is the
            raw record behind a line on your policy page.
          </p>
        </section>

        <div className="card card--ticked" style={{ ["--i" as string]: 1 }}>
          <h2 className="card__title">Where this record lives</h2>
          <dl className="terms-grid">
            <div>
              <dt>Network</dt>
              <dd style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {verify.contract?.network ?? "—"}
              </dd>
            </div>
            <div>
              <dt>Chain ID</dt>
              <dd style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{chainId ?? "—"}</dd>
            </div>
            {health?.chain && (
              <div>
                <dt>Latest block</dt>
                <dd style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {health.chain.blockNumber.toLocaleString("en-IN")}
                </dd>
              </div>
            )}
            <div>
              <dt>Sources agreed</dt>
              <dd style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {health?.oracles.registeredCount ?? "—"} registered
              </dd>
            </div>
          </dl>

          {verify.contract && (
            <p style={{ marginTop: "var(--sp-4)", marginBottom: 0 }}>
              <span className="mono-label" style={{ display: "block", marginBottom: 4 }}>
                Record location
              </span>
              {isPublicChain ? (
                <a
                  href={`${explorer}/address/${verify.contract.address}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12, wordBreak: "break-all" }}
                >
                  {verify.contract.address} →
                </a>
              ) : (
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, wordBreak: "break-all" }}>
                  {verify.contract.address}
                </code>
              )}
            </p>
          )}

          {!isPublicChain && (
            <p className="notice" style={{ marginTop: "var(--sp-4)", marginBottom: 0 }}>
              This record is on a local test network, so it has no public explorer link. On a
              public network each entry below is independently verifiable by anyone.
            </p>
          )}
        </div>

        <div style={{ ["--i" as string]: 2 }}>
          <div className="section-head">
            <span className="section-head__text">
              {verify.events.length} {verify.events.length === 1 ? "entry" : "entries"}
            </span>
            <span className="section-head__rule" />
          </div>

          <div className="card">
            {verify.events.length === 0 ? (
              <p className="empty-note">No entries recorded for this policy yet.</p>
            ) : (
              verify.events.map((event) => (
                <div className="audit-row" key={`${event.txHash}-${event.name}`}>
                  <div className="audit-row__head">
                    <span className="audit-row__name">{event.name}</span>
                    <span className="audit-row__block">Block {event.blockNumber}</span>
                  </div>
                  {isPublicChain ? (
                    <a
                      className="audit-row__hash"
                      href={`${explorer}/tx/${event.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {event.txHash} →
                    </a>
                  ) : (
                    <span className="audit-row__hash">{event.txHash}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
