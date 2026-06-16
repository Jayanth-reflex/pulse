/** Calm shimmer placeholder while a figure loads. */
export function Skeleton({
  width = "4rem",
  height = "0.8em",
  className = "",
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`shimmer inline-block align-middle ${className}`}
      style={{ width, height }}
    />
  );
}
