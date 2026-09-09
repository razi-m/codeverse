/** Sized to match the final content so the layout never shifts on load (Design.md § Mobile Experience). */
export function Skeleton({ width = "100%", height = "1em" }: { width?: string; height?: string }) {
  return (
    <span
      className="skeleton"
      style={{ display: "inline-block", width, height, verticalAlign: "middle" }}
      aria-hidden="true"
    />
  );
}
