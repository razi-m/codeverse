import type { LedgerEntry as LedgerEntryData } from "../../lib/api.js";
import { DateDisplay } from "../shared/DateDisplay.js";

/**
 * One event: a node on the timeline, a date, and the plain sentence.
 * The numbers are already inline in the sentence — explain.ts is the only
 * source of this text (D17), so nothing is reformatted here.
 */
export function LedgerEntry({ entry }: { entry: LedgerEntryData }) {
  const outcome =
    entry.eventName === "PayoutTriggered"
      ? " ledger-entry--paid"
      : entry.eventName === "PayoutRejected"
        ? " ledger-entry--rejected"
        : "";

  return (
    <li className={`ledger-entry${outcome}`}>
      <span className="ledger-entry__node" aria-hidden="true">
        <span className="ledger-entry__dot" />
      </span>
      <span>
        <span className="ledger-entry__date">
          <DateDisplay unixSeconds={entry.timestamp} />
        </span>
        <span className="ledger-entry__text">{entry.text}</span>
      </span>
    </li>
  );
}
