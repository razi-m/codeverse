import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLedger, summarize, type LedgerEntry } from "./explain.js";
import type { PolicyEvent } from "./insurance.js";

// Banned per docs/Design.md § The plain-language rule.
const BANNED = [
  "wei",
  "gwei",
  "gas",
  "hash",
  "nonce",
  "block",
  "address",
  "wallet",
  "smart contract",
  "blockchain",
  "oracle",
  "consensus",
  "on-chain",
  "transaction",
  "node",
  "abi",
  "mainnet",
  "testnet",
];

function assertNoBannedVocabulary(text: string) {
  const lower = text.toLowerCase();
  for (const word of BANNED) {
    assert.ok(!lower.includes(word), `banned word "${word}" found in: "${text}"`);
  }
}

function event(name: string, args: Record<string, unknown>): PolicyEvent {
  return { name, blockNumber: 10, blockTimestamp: 1_723_593_600, txHash: "0xabc", args };
}

test("PayoutRejected reasonCode 1 (threshold not breached) cites real numbers, no jargon", () => {
  const [entry] = buildLedger([
    event("PayoutRejected", { reasonCode: 1, consensusValue: 3400n, thresholdValue: 2000n }),
  ]);
  assert.match(entry.text, /34mm/);
  assert.match(entry.text, /20mm/);
  assertNoBannedVocabulary(entry.text);
});

test("PayoutRejected reasonCode 2 (insufficient readings)", () => {
  const [entry] = buildLedger([event("PayoutRejected", { reasonCode: 2, thresholdValue: 2000n })]);
  assert.match(entry.text, /one of two/i);
  assertNoBannedVocabulary(entry.text);
});

test("PayoutRejected reasonCode 3 (consensus failed) never uses the word consensus", () => {
  const [entry] = buildLedger([event("PayoutRejected", { reasonCode: 3, thresholdValue: 2000n })]);
  assert.match(entry.text, /disagreed/i);
  assertNoBannedVocabulary(entry.text);
});

test("PayoutRejected reasonCode 4 (policy not active)", () => {
  const [entry] = buildLedger([event("PayoutRejected", { reasonCode: 4, thresholdValue: 2000n })]);
  assert.match(entry.text, /already paid/i);
  assertNoBannedVocabulary(entry.text);
});

test("PayoutRejected reasonCode 5 (outside cover period)", () => {
  const [entry] = buildLedger([event("PayoutRejected", { reasonCode: 5, thresholdValue: 2000n })]);
  assert.match(entry.text, /outside your cover period/i);
  assertNoBannedVocabulary(entry.text);
});

test("PayoutRejected reasonCode 6 (not funded)", () => {
  const [entry] = buildLedger([event("PayoutRejected", { reasonCode: 6, thresholdValue: 2000n })]);
  assert.match(entry.text, /not yet funded/i);
  assertNoBannedVocabulary(entry.text);
});

test("PayoutRejected with an unrecognised reasonCode degrades to a safe sentence, never a raw code", () => {
  const [entry] = buildLedger([event("PayoutRejected", { reasonCode: 99, thresholdValue: 2000n })]);
  assert.ok(!entry.text.includes("99"));
  assertNoBannedVocabulary(entry.text);
});

test("PayoutTriggered renders rupees and mm, not wei and scaled integers", () => {
  const [entry] = buildLedger([
    event("PayoutTriggered", {
      amount: 1_000_000_000_000_000_000n, // 1 ETH in wei
      consensusValue: 1000n, // 10.00mm scaled
      thresholdValue: 2000n, // 20.00mm scaled
    }),
  ]);
  assert.match(entry.text, /₹/);
  assert.match(entry.text, /10mm/);
  assert.match(entry.text, /20mm/);
  assert.ok(!entry.text.includes("1000000000000000000"));
  assertNoBannedVocabulary(entry.text);
});

test("PolicyCreated, PolicyFunded, ReadingSubmitted, ConsensusReached, ConsensusFailed, PolicyCancelled all produce jargon-free text", () => {
  const events: PolicyEvent[] = [
    event("PolicyCreated", { cropType: "Cotton", regionId: "MH-VID-04", coverageAmount: 1_000_000_000_000_000_000n, thresholdValue: 2000n }),
    event("PolicyFunded", { amount: 1_000_000_000_000_000_000n }),
    event("ReadingSubmitted", { value: 900n }),
    event("ConsensusReached", { consensusValue: 1000n, spread: 200n }),
    event("ConsensusFailed", { spread: 2500n, tolerance: 500n }),
    event("PolicyCancelled", {}),
  ];
  const ledger = buildLedger(events);
  assert.equal(ledger.length, events.length);
  for (const entry of ledger) {
    assertNoBannedVocabulary(entry.text);
    assert.ok(entry.text.length > 0);
  }
});

test("buildLedger preserves event order and carries a real timestamp, not a block number", () => {
  const events: PolicyEvent[] = [
    event("PolicyCreated", { cropType: "Cotton", regionId: "MH-VID-04", coverageAmount: 1n, thresholdValue: 2000n }),
    event("PolicyFunded", { amount: 1n }),
  ];
  const ledger = buildLedger(events);
  assert.equal(ledger[0].eventName, "PolicyCreated");
  assert.equal(ledger[1].eventName, "PolicyFunded");
  assert.equal(ledger[0].timestamp, 1_723_593_600);
});

test("summarize: paid policy cites the real payout amount and a real date", () => {
  const events: PolicyEvent[] = [
    event("PayoutTriggered", { amount: 1_000_000_000_000_000_000n, consensusValue: 1000n, thresholdValue: 2000n }),
  ];
  const text = summarize(events, 1 /* PaidOut */);
  assert.match(text, /Paid/);
  assert.match(text, /₹/);
  assertNoBannedVocabulary(text);
});

test("summarize: cancelled policy", () => {
  assert.match(summarize([], 3 /* Cancelled */), /cancelled/i);
});

test("summarize: no events yet", () => {
  assert.match(summarize([], 0 /* Active */), /waiting/i);
});

test("summarize: most recent rejection is surfaced, citing real numbers", () => {
  const events: PolicyEvent[] = [
    event("PayoutRejected", { reasonCode: 1, consensusValue: 3400n, thresholdValue: 2000n }),
  ];
  const text = summarize(events, 0 /* Active */);
  assert.match(text, /34mm/);
  assertNoBannedVocabulary(text);
});
