/** Four-sentence parametric explainer, no jargon (Design.md § Component Inventory). */
export function HowThisWorks() {
  return (
    <details className="disclosure">
      <summary className="disclosure__trigger">
        <span className="disclosure__chevron" aria-hidden="true">
          ▸
        </span>
        How this works
      </summary>
      <div className="disclosure__content">
        <p>
          Your policy pays out automatically when rainfall drops below the level agreed when you
          signed up — no paperwork, no visit, no waiting for someone to approve it.
        </p>
        <p>
          Two independent weather sources report the rainfall for your area. They have to agree
          before any decision is made, so no single report can trigger a wrong payout.
        </p>
        <p>
          If the rainfall is below your threshold, the payout is released to you right away. If
          it isn't, nothing is owed — and you can see exactly why on this page.
        </p>
        <p>Every decision, paid or not, is recorded permanently and can never be changed later.</p>
      </div>
    </details>
  );
}
