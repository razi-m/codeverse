/** Unix seconds -> "14 August 2026", never a raw timestamp on the farmer surface. */
export function DateDisplay({ unixSeconds }: { unixSeconds: number }) {
  const formatted = new Date(unixSeconds * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return <time dateTime={new Date(unixSeconds * 1000).toISOString()}>{formatted}</time>;
}
