import { useEffect, useState } from "react";
import { useWriteContract } from "wagmi";
import { contractAddress, contractAbi } from "../../lib/contract.js";
import { fetchHealth } from "../../lib/api.js";
import { TxStatus } from "./TxStatus.js";

/**
 * Silent-feed warning — the failure most likely to look like a broken
 * product (Design.md § Component Inventory). Fewer than two registered
 * feeds means evaluatePolicy can never reach consensus, so this is a
 * blocking banner, not a quiet note.
 */
export function OracleLivenessBadge({ registeredCount }: { registeredCount: number | null }) {
  if (registeredCount === null) return null;
  if (registeredCount >= 2) return null;

  return (
    <div role="alert" className="notice" style={{ color: "var(--danger)" }}>
      Only {registeredCount} weather feed{registeredCount === 1 ? "" : "s"} registered. Consensus
      requires at least two — no policy can pay out until a second feed is registered.
    </div>
  );
}

export function OracleRegistry() {
  const [addresses, setAddresses] = useState<string[] | null>(null);
  const [newAddress, setNewAddress] = useState("");

  const { writeContract: registerOracle, data: registerHash, isPending, error, reset } =
    useWriteContract();

  function reload() {
    fetch("/api/oracles")
      .then((r) => r.json())
      .then((data) => setAddresses(data.oracles?.map((o: { address: string }) => o.address) ?? []))
      .catch(() => setAddresses([]));
  }

  useEffect(reload, []);

  function handleRegister() {
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAddress)) return;
    registerOracle({
      address: contractAddress,
      abi: contractAbi,
      functionName: "registerOracle",
      args: [newAddress as `0x${string}`],
    });
  }

  return (
    <div>
      <OracleLivenessBadge registeredCount={addresses?.length ?? null} />

      <div className="section-head" style={{ marginTop: 0 }}>
        <span className="section-head__text">Registered weather feeds</span>
        <span className="section-head__rule" />
      </div>

      {!addresses ? (
        <p className="mono-label">Loading…</p>
      ) : addresses.length === 0 ? (
        <p className="empty-note">None registered.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {addresses.map((a) => (
            <li key={a} className="audit-row">
              <span className="audit-row__hash">{a}</span>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-4)", flexWrap: "wrap" }}>
        <label htmlFor="oracle-address" className="mono-label" style={{ display: "none" }}>
          Oracle address
        </label>
        <input
          id="oracle-address"
          placeholder="0x… oracle address"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          style={{
            fontFamily: "var(--font-mono)",
            flex: "1 1 260px",
            minHeight: 44,
            padding: "var(--sp-3)",
            fontSize: 14,
            color: "var(--text)",
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-strong)",
            borderRadius: 2,
          }}
        />
        <button className="button button--primary" onClick={handleRegister} disabled={isPending}>
          {isPending ? "Working…" : "Register"}
        </button>
      </div>
      <TxStatus status={isPending ? "pending" : error ? "rejected" : "idle"} errorMessage={error?.message} txHash={registerHash} />
      {registerHash && (
        <button
          type="button"
          className="button"
          style={{ marginTop: "var(--sp-3)" }}
          onClick={() => {
            reset();
            reload();
          }}
        >
          Refresh list
        </button>
      )}
    </div>
  );
}
