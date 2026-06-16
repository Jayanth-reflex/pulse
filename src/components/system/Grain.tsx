"use client";

/**
 * Filmic atmosphere: a fixed grain layer plus a soft vignette.
 * Pure CSS/SVG, no animation — costs nothing at runtime and reads as
 * "shot on film" rather than "rendered in a browser".
 */
const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
        <feColorMatrix type='saturate' values='0'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#n)' opacity='0.5'/>
    </svg>`,
  );

export function Grain() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-soft-light"
        style={{ backgroundImage: `url("${GRAIN}")`, backgroundSize: "160px" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 12%, transparent 55%, rgba(5,9,7,0.55) 100%)",
        }}
      />
    </div>
  );
}
