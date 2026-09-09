import type { PolicyVerify } from "../../lib/api.js";

/**
 * Collapsed proof: contract address, block, transaction hash, raw event.
 * Deliberately technical — this is the one place monospace and a hash may
 * appear on the farmer surface, for the sceptic who wants the receipt
 * (Design.md § Typography, § Layout Principles #3).
 */
export function VerifyPanel({ verify }: { verify: PolicyVerify }) {
  return (
    <details className="disclosure">
      <summary className="disclosure__trigger">
        <span className="disclosure__chevron" aria-hidden="true">
          ▸
        </span>
        Verify this record
      </summary>
      <div className="disclosure__content">
        {verify.contract && (
          <p>
            Record location: <code>{verify.contract.address}</code>
          </p>
        )}
        <p>Every entry below is a permanent, tamper-proof record:</p>
        <ul style={{ paddingLeft: "1.2em" }}>
          {verify.events.map((event) => (
            <li key={`${event.txHash}-${event.name}`} style={{ marginBottom: "8px" }}>
              {event.name} — record <code>{event.txHash}</code> (entry #{event.blockNumber})
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
