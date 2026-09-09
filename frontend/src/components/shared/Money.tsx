/**
 * Renders a rupee amount. The backend (explain.ts) has already converted
 * from wei via the documented ETH->rupee demo rate — this component never
 * sees or handles wei itself, it only formats the already-real number it's
 * given. This is the enforcement point: no other component formats money
 * inline (Design.md § Shared).
 */
export function Money({ rupees, className }: { rupees: number; className?: string }) {
  const formatted = rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return <span className={`money${className ? ` ${className}` : ""}`}>₹{formatted}</span>;
}
