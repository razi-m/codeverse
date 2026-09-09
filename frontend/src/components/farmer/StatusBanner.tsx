import { PolicyStatus } from "../../lib/api.js";
import type { BadgeTone } from "../shared/Badge.js";

const ICON: Record<BadgeTone, string> = {
  paid: "✓",
  active: "🛡",
  waiting: "⏱",
  ended: "🗄",
};

function toneFor(status: PolicyStatus): BadgeTone {
  switch (status) {
    case PolicyStatus.PaidOut:
      return "paid";
    case PolicyStatus.Active:
      return "active";
    case PolicyStatus.Expired:
    case PolicyStatus.Cancelled:
      return "ended";
    default:
      return "waiting";
  }
}

/**
 * The one-sentence answer, above the fold (Design.md § Layout Principles
 * #1 — "Answer first"). role="status" + aria-live="polite" so a screen
 * reader announces it without the page having to be re-focused.
 * --danger never appears here — a non-payout is a correct outcome, not
 * an error (Design.md § Color Palette).
 */
export function StatusBanner({ status, summary }: { status: PolicyStatus; summary: string }) {
  const tone = toneFor(status);
  return (
    <div className={`status-banner status-banner--${tone}`} role="status" aria-live="polite">
      <span className="status-banner__icon" aria-hidden="true">
        {ICON[tone]}
      </span>
      <span>{summary}</span>
    </div>
  );
}
