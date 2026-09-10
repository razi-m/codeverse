/**
 * Collateral confidence rating — a same-day score a lender can act on when
 * a farmer offers this policy as loan collateral. DERIVED from the policy's
 * actual on-chain/consensus state, not a random or hardcoded number, so it
 * changes only when the underlying facts change (same rule ParcelPlan
 * follows for its geometry).
 *
 * Inputs used:
 *  - policy status (paid-out claims are the strongest collateral signal —
 *    proven, automatic, undisputed payment history)
 *  - how far the current reading sits from the trigger threshold (margin)
 *  - whether both oracle sources have reported and agree (consensus)
 *  - policy funding state (an unfunded pool cannot actually pay out)
 */

export type ConfidenceBand = "strong" | "moderate" | "watch";

export interface CollateralConfidence {
  score: number; // 0-100
  band: ConfidenceBand;
  label: string;
  reasons: string[];
  asOfDate: string; // today, ISO date — "same day" rating
}

export function computeCollateralConfidence(input: {
  status: number; // PolicyStatus enum value
  funded: boolean;
  thresholdValue: number;
  currentReading: number | null;
  consensusReached: boolean;
  coverageAmount: string;
}): CollateralConfidence {
  const { status, funded, thresholdValue, currentReading, consensusReached, coverageAmount } = input;
  const reasons: string[] = [];
  let score = 50;

  // Funding: a pool that cannot pay is not real collateral strength.
  if (funded) {
    score += 12;
    reasons.push("Payout pool is funded on-chain");
  } else {
    score -= 20;
    reasons.push("Payout pool is not yet funded — verify before lending");
  }

  // PolicyStatus: 0 Active, 1 PaidOut, 2 Expired, 3 Cancelled
  if (status === 1) {
    score += 30;
    reasons.push("This policy has already paid out automatically once — proven trigger history");
  } else if (status === 0) {
    score += 8;
    reasons.push("Policy is active and within its coverage window");
  } else if (status === 2) {
    score -= 30;
    reasons.push("Policy has expired — no further coverage window remains");
  } else if (status === 3) {
    score -= 40;
    reasons.push("Policy was cancelled");
  }

  // Consensus / data quality
  if (consensusReached) {
    score += 8;
    reasons.push("Both independent weather sources agree on the current reading");
  } else {
    score -= 10;
    reasons.push("Awaiting agreement between weather sources — reading not yet confirmed");
  }

  // Margin to trigger: how close the plot is to a payout right now, expressed
  // as a fraction of the threshold. Close-to-trigger is not "bad" for a
  // lender assessing whether this collateral will pay if things worsen —
  // it's read as proximity-to-safety-net, so it nudges score up slightly
  // rather than down.
  if (currentReading !== null && thresholdValue > 0) {
    const marginFraction = (currentReading - thresholdValue) / thresholdValue;
    if (marginFraction < 0) {
      reasons.push("Current reading is already past the trigger — payout is imminent or in progress");
      score += 10;
    } else if (marginFraction < 0.15) {
      reasons.push("Current reading sits close to the trigger threshold — safety net is near");
      score += 4;
    }
  }

  score = Math.max(5, Math.min(97, Math.round(score)));

  const band: ConfidenceBand = score >= 70 ? "strong" : score >= 45 ? "moderate" : "watch";
  const label =
    band === "strong"
      ? "Strong collateral signal"
      : band === "moderate"
        ? "Moderate collateral signal"
        : "Needs manual review";

  reasons.push(`Coverage on record: ${coverageAmount}`);

  return {
    score,
    band,
    label,
    reasons,
    asOfDate: new Date().toISOString().slice(0, 10),
  };
}
