import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { contractAddress, contractAbi } from "../../lib/contract.js";
import { TxStatus } from "./TxStatus.js";
import type { Policy } from "../../lib/api.js";

/** Escrow deposit, shows shortfall (Design.md § Component Inventory). */
export function FundPolicyAction({ policy }: { policy: Policy }) {
  const [amount, setAmount] = useState(policy.coverageAmount);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (policy.funded) return <span style={{ color: "var(--paid)" }}>Funded</span>;

  const shortfall = Number(policy.coverageAmount) - Number(amount || 0);

  function handleFund() {
    writeContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "fundPolicy",
      args: [BigInt(policy.id)],
      value: parseEther(amount),
    });
  }

  const status = isPending
    ? "pending"
    : isConfirming
      ? "confirming"
      : isSuccess
        ? "confirmed"
        : error
          ? "rejected"
          : "idle";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      <label>
        Amount (ETH)
        <input value={amount} onChange={(e) => setAmount(e.target.value)} style={{ marginLeft: 8 }} />
      </label>
      {shortfall > 0 && (
        <p style={{ color: "var(--danger)", fontSize: "var(--fs-small)" }}>
          Shortfall: {shortfall} ETH short of the {policy.coverageAmount} ETH required.
        </p>
      )}
      <button onClick={handleFund} disabled={isPending || isConfirming}>
        {isPending || isConfirming ? "Working…" : "Fund policy"}
      </button>
      <TxStatus status={status} errorMessage={error?.message} txHash={hash} />
    </div>
  );
}
