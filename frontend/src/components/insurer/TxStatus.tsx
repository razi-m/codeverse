/**
 * Pending / confirmed / rejected. Technical language is permitted on the
 * insurer surface (Design.md § Desktop Experience) — this is the one place
 * a transaction hash and gas-adjacent vocabulary belong.
 */
export function TxStatus({
  status,
  errorMessage,
  txHash,
}: {
  status: "idle" | "pending" | "confirming" | "confirmed" | "rejected";
  errorMessage?: string;
  txHash?: string;
}) {
  if (status === "idle") return null;

  const label = {
    pending: "Waiting for wallet signature…",
    confirming: "Transaction submitted, waiting for confirmation…",
    confirmed: "Confirmed.",
    rejected: `Failed${errorMessage ? `: ${errorMessage}` : ""}`,
  }[status];

  const color =
    status === "confirmed" ? "var(--paid)" : status === "rejected" ? "var(--danger)" : "var(--waiting)";

  return (
    <p style={{ color, fontSize: "var(--fs-small)", marginTop: 8 }}>
      {label}
      {txHash && (
        <>
          {" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>
            ({txHash.slice(0, 10)}…)
          </span>
        </>
      )}
    </p>
  );
}
