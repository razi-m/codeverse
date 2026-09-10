import type { LedgerEntry as LedgerEntryData } from "../../lib/api.js";
import { LedgerEntry } from "./LedgerEntry.js";
import { Card } from "../shared/Card.js";

/** Chronological plain-language decision list, newest first (Design.md § Layout Principles #4). */
export function ClaimLedger({ entries }: { entries: LedgerEntryData[] }) {
  const newestFirst = [...entries].reverse();

  return (
    <Card>
      {newestFirst.length === 0 ? (
        <p className="empty-note">Nothing has happened on this policy yet.</p>
      ) : (
        <ol className="claim-ledger" aria-label="Claim history, most recent first">
          {newestFirst.map((entry) => (
            <LedgerEntry key={`${entry.txHash}-${entry.eventName}`} entry={entry} />
          ))}
        </ol>
      )}
    </Card>
  );
}
