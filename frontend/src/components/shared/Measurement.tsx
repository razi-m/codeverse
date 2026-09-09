/**
 * Renders a measurement in the unit a farmer thinks in. The backend
 * (insurance.ts) has already divided the on-chain x100-scaled integer
 * (D7) back to real units before this ever reaches the browser — this
 * component formats, it never scales. Enforcement point (Design.md §
 * Shared): no other component formats a measurement inline.
 */
export function Measurement({
  value,
  unit = "mm",
  className,
}: {
  value: number;
  unit?: string;
  className?: string;
}) {
  return (
    <span className={`measurement${className ? ` ${className}` : ""}`}>
      {value}
      {unit}
    </span>
  );
}
