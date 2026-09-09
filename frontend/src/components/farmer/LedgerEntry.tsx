import type { LedgerEntry as LedgerEntryData } from "../../lib/api.js";
import { DateDisplay } from "../shared/DateDisplay.js";

/** One event: date, plain sentence — the numbers are already inline in the sentence. */
export function LedgerEntry({ entry }: { entry: LedgerEntryData }) {
  return (
    <li className="ledger-entry">
      <span className="ledger-entry__date">
        <DateDisplay unixSeconds={entry.timestamp} />
      </span>
      <span className="ledger-entry__text">{entry.text}</span>
    </li>
  );
}
