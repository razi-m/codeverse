import { useState, type FormEvent } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { contractAddress, contractAbi } from "../../lib/contract.js";
import { TxStatus } from "./TxStatus.js";

type FormState = {
  farmer: string;
  cropType: string;
  regionId: string;
  coverageEth: string;
  thresholdMm: string;
  toleranceMm: string;
  startDate: string;
  endDate: string;
};

const EMPTY: FormState = {
  farmer: "",
  cropType: "",
  regionId: "",
  coverageEth: "",
  thresholdMm: "",
  toleranceMm: "",
  startDate: "",
  endDate: "",
};

/**
 * Full policy terms with validation (Design.md § Component Inventory).
 * Client validation mirrors the contract's own checks (createPolicy,
 * CropInsurance.sol) so a rejected transaction is rare, not the normal
 * path. Rejected transactions preserve form state (Design.md § Interaction
 * Guidelines) — form values only clear on confirmed success.
 */
export function CreatePolicyForm({ onCreated }: { onCreated?: (policyId: bigint) => void }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): string | null {
    if (!/^0x[a-fA-F0-9]{40}$/.test(form.farmer)) return "Farmer address must be a valid address.";
    if (!form.cropType.trim()) return "Crop type is required.";
    if (!form.regionId.trim()) return "Region is required.";
    if (!(Number(form.coverageEth) > 0)) return "Cover amount must be greater than zero.";
    if (!(Number(form.thresholdMm) > 0)) return "Threshold must be greater than zero.";
    if (!(Number(form.toleranceMm) > 0)) return "Tolerance must be greater than zero.";
    if (!form.startDate || !form.endDate) return "Start and end dates are required.";
    if (new Date(form.startDate) >= new Date(form.endDate)) return "Start date must be before end date.";
    return null;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    setValidationError(err);
    if (err) return;

    writeContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "createPolicy",
      args: [
        form.farmer as `0x${string}`,
        form.cropType,
        form.regionId,
        parseEther(form.coverageEth),
        0, // TriggerType.RainfallBelow — VegetationIndexBelow is out of scope (cut list)
        BigInt(Math.round(Number(form.thresholdMm) * 100)),
        BigInt(Math.round(Number(form.toleranceMm) * 100)),
        BigInt(Math.floor(new Date(form.startDate).getTime() / 1000)),
        BigInt(Math.floor(new Date(form.endDate).getTime() / 1000)),
      ],
    });
  }

  // Only clear the form on confirmed success — a rejected/pending tx keeps it.
  if (isSuccess && form !== EMPTY) {
    setForm(EMPTY);
    onCreated?.(0n); // policyId isn't in the write result directly; portfolio table refetches
  }

  const status = isPending
    ? "pending"
    : isConfirming
      ? "confirming"
      : isSuccess
        ? "confirmed"
        : writeError
          ? "rejected"
          : "idle";

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 480 }}>
      <label>
        Farmer address
        <input value={form.farmer} onChange={(e) => update("farmer", e.target.value)} />
      </label>
      <label>
        Crop type
        <input value={form.cropType} onChange={(e) => update("cropType", e.target.value)} />
      </label>
      <label>
        Region ID
        <input value={form.regionId} onChange={(e) => update("regionId", e.target.value)} />
      </label>
      <label>
        Cover amount (ETH)
        <input
          type="number"
          step="0.01"
          value={form.coverageEth}
          onChange={(e) => update("coverageEth", e.target.value)}
        />
      </label>
      <label>
        Rainfall threshold (mm)
        <input
          type="number"
          step="0.01"
          value={form.thresholdMm}
          onChange={(e) => update("thresholdMm", e.target.value)}
        />
      </label>
      <label>
        Tolerance (mm)
        <input
          type="number"
          step="0.01"
          value={form.toleranceMm}
          onChange={(e) => update("toleranceMm", e.target.value)}
        />
      </label>
      <label>
        Start date
        <input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
      </label>
      <label>
        End date
        <input type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
      </label>

      {validationError && (
        <p role="alert" style={{ color: "var(--danger)" }}>
          {validationError}
        </p>
      )}

      <button type="submit" disabled={isPending || isConfirming}>
        {isPending || isConfirming ? "Working…" : "Create policy"}
      </button>

      <TxStatus status={status} errorMessage={writeError?.message} txHash={hash} />
      {isSuccess && (
        <button type="button" onClick={() => reset()}>
          Create another
        </button>
      )}
    </form>
  );
}
