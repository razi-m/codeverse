import { ethers } from "ethers";
import type { PolicyEvent } from "./insurance.js";

/**
 * The single source of every farmer-facing string (D17). This is the whole
 * point of the product: a plain-language claim ledger a farmer can read
 * without a wallet, without jargon, citing real numbers.
 *
 * Banned outright (docs/Design.md § The plain-language rule): wei, gwei,
 * gas, hash, nonce, block, address, wallet, smart contract, blockchain,
 * oracle, consensus, on-chain, transaction, node, ABI, mainnet, testnet.
 * Every one of those words is a bug in this file if it reaches a farmer.
 *
 * Every entry cites the actual numbers behind the decision — never "no
 * payout was due" alone, always "34mm, above your 20mm threshold". A
 * rejection is phrased as an explanation, never as an error.
 */

export type LedgerEntry = {
  eventName: string;
  txHash: string; // kept for the Verify panel; never shown as raw text to a farmer
  blockNumber: number;
  timestamp: number; // unix seconds — the block's timestamp, for a real date in the ledger
  text: string; // the plain-language sentence — this is the product
};

/** Undoes the on-chain x100 scale — never render a scaled integer (D7). */
const mm = (raw: unknown): number => Number(raw) / 100;

// Demo conversion rate: 1 ETH = ₹1,000 (docs/Design.md's own worked example
// converts 25 ETH -> ₹25,000, i.e. this ratio, not 1:1 — this is a demo
// mock, not a real exchange rate, since KisanShield uses a local Hardhat
// chain with no real currency behind it).
const ETH_TO_RUPEES = 1_000;

const rupees = (weiLike: unknown): string => {
  const eth = Number(ethers.formatEther(BigInt(weiLike as string | bigint)));
  const amount = eth * ETH_TO_RUPEES;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

const formatDate = (unixSeconds: unknown): string =>
  new Date(Number(unixSeconds) * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Fixed farmer-facing copy for every PayoutRejected reason code (TRD § Contract Specification). */
function rejectionText(reasonCode: number, args: Record<string, unknown>): string {
  const threshold = mm(args.thresholdValue);
  const consensus = args.consensusValue != null ? mm(args.consensusValue) : null;

  switch (reasonCode) {
    case 1:
      return `Rainfall was ${consensus}mm — above your ${threshold}mm threshold, so no payout was due.`;
    case 2:
      return "Only one of two weather sources has reported so far. We need both before deciding.";
    case 3:
      return "The two weather sources disagreed. No payout was made on disputed data.";
    case 4:
      return "This policy has already paid out.";
    case 5:
      return "This reading is from outside your cover period.";
    case 6:
      return "This policy is not yet funded.";
    default:
      // Should be unreachable — the contract only ever emits codes 1-6 — but
      // a farmer must never see a raw code number if this is ever wrong.
      return "No payout was due for this reading.";
  }
}

/** Converts one raw chain event into one plain-language ledger entry. */
function explainEvent(event: PolicyEvent): LedgerEntry | null {
  const { name, args, txHash, blockNumber, blockTimestamp } = event;

  switch (name) {
    case "PolicyCreated":
      return {
        eventName: name,
        txHash,
        blockNumber,
        timestamp: blockTimestamp,
        text: `Your ${args.cropType} policy for ${args.regionId} was set up, covering ${rupees(args.coverageAmount)} if rainfall drops below ${mm(args.thresholdValue)}mm.`,
      };
    case "PolicyFunded":
      return {
        eventName: name,
        txHash,
        blockNumber,
        timestamp: blockTimestamp,
        text: `Your policy's payout of ${rupees(args.amount)} is now set aside and ready — it will be released automatically if the rainfall condition is met.`,
      };
    case "ReadingSubmitted":
      return {
        eventName: name,
        txHash,
        blockNumber,
        timestamp: blockTimestamp,
        text: `A weather source reported ${mm(args.value)}mm of rainfall for this period.`,
      };
    case "ConsensusReached":
      return {
        eventName: name,
        txHash,
        blockNumber,
        timestamp: blockTimestamp,
        text: `Both weather sources agreed: rainfall for this period was ${mm(args.consensusValue)}mm.`,
      };
    case "ConsensusFailed":
      return {
        eventName: name,
        txHash,
        blockNumber,
        timestamp: blockTimestamp,
        text: "The two weather sources reported very different rainfall amounts for this period, so no decision was made on this reading.",
      };
    case "PayoutTriggered":
      return {
        eventName: name,
        txHash,
        blockNumber,
        timestamp: blockTimestamp,
        text: `Paid — ${rupees(args.amount)} reached you because rainfall was ${mm(args.consensusValue)}mm, below your ${mm(args.thresholdValue)}mm threshold.`,
      };
    case "PayoutRejected":
      return {
        eventName: name,
        txHash,
        blockNumber,
        timestamp: blockTimestamp,
        text: rejectionText(Number(args.reasonCode), args),
      };
    case "PolicyCancelled":
      return {
        eventName: name,
        txHash,
        blockNumber,
        timestamp: blockTimestamp,
        text: "This policy was cancelled and any set-aside funds were returned.",
      };
    default:
      return null;
  }
}

/** Builds the full chronological ledger for one policy from its raw event history. */
export function buildLedger(events: PolicyEvent[]): LedgerEntry[] {
  return events
    .map(explainEvent)
    .filter((entry): entry is LedgerEntry => entry !== null);
}

/**
 * One-line status summary for a policy — the headline above the full
 * ledger. Derived from the same event list so it can never disagree with
 * the detail below it.
 */
export function summarize(events: PolicyEvent[], policyStatus: number): string {
  const lastOutcome = [...events]
    .reverse()
    .find((e) => e.name === "PayoutTriggered" || e.name === "PayoutRejected");

  if (policyStatus === 1 && lastOutcome?.name === "PayoutTriggered") {
    return `Paid — ${rupees(lastOutcome.args.amount)} on ${formatDate(lastOutcome.blockTimestamp)}.`;
  }
  if (policyStatus === 3) return "This policy was cancelled.";
  if (!lastOutcome) return "Waiting for weather sources to report.";
  return explainEvent(lastOutcome)?.text ?? "No decision yet.";
}
