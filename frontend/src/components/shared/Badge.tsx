export type BadgeTone = "paid" | "active" | "waiting" | "ended";

const ICON: Record<BadgeTone, string> = {
  paid: "✓",
  active: "🛡",
  waiting: "⏱",
  ended: "🗄",
};

/**
 * Colour never carries meaning alone (Design.md § Accessibility) — every
 * badge pairs its colour with an icon and a text label.
 */
export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`badge badge--${tone}`}>
      <span aria-hidden="true">{ICON[tone]}</span>
      {children}
    </span>
  );
}
