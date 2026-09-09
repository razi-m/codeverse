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
    <div
      role="alert"
      style={{
        background: "color-mix(in srgb, var(--danger) 12%, var(--surface))",
        color: "var(--danger)",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        fontWeight: 600,
      }}
    >
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

      <h3 style={{ fontSize: "var(--fs-h2)" }}>Registered weather feeds</h3>
      {!addresses ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : addresses.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>None registered.</p>
      ) : (
        <ul>
          {addresses.map((a) => (
            <li key={a} style={{ fontFamily: "var(--font-mono)", fontSize: "0.9em" }}>
              {a}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          placeholder="0x… oracle address"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          style={{ fontFamily: "var(--font-mono)", flex: 1 }}
        />
        <button onClick={handleRegister} disabled={isPending}>
          {isPending ? "Working…" : "Register"}
        </button>
      </div>
      <TxStatus status={isPending ? "pending" : error ? "rejected" : "idle"} errorMessage={error?.message} txHash={registerHash} />
      {registerHash && (
        <button
          type="button"
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
