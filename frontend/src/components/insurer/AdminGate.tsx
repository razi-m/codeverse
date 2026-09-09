import { useAccount, useReadContract } from "wagmi";
import type { ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { contractAddress, contractAbi } from "../../lib/contract.js";

/**
 * Wallet connect + owner check, read-only fallback (Design.md § Component
 * Inventory). UserFlows.md § Insurer — /admin: not connected -> prompt;
 * connected but not owner -> explicit "not the administrator" message,
 * never a silent block.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { data: owner, isLoading } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "owner",
    query: { enabled: isConnected },
  });

  if (!isConnected) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ marginBottom: 16, color: "var(--text-muted)" }}>
          Connect the administrator wallet to manage policies.
        </p>
        <ConnectButton />
      </div>
    );
  }

  if (isLoading) {
    return <p style={{ padding: 24, color: "var(--text-muted)" }}>Checking access…</p>;
  }

  const isOwner =
    typeof owner === "string" && address && owner.toLowerCase() === address.toLowerCase();

  if (!isOwner) {
    return (
      <div style={{ padding: 24, background: "var(--surface-sunken)", borderRadius: 8 }}>
        <p>
          Connected wallet is not the administrator for this contract.
          <br />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9em" }}>{address}</span>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
