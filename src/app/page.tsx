import { LiveFigures } from "@/components/data/LiveFigures";

export default function Home() {
  return (
    <main className="relative">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="mb-6 text-xs uppercase tracking-[0.4em] text-faint">
          A living atlas of global health
        </p>
        <h1
          className="font-display text-mist"
          style={{ fontSize: "var(--text-hero)", lineHeight: 0.95 }}
        >
          Pulse
        </h1>
        <p
          className="font-display mt-8 italic text-sage"
          style={{ fontSize: "var(--text-title)", maxWidth: "var(--measure)" }}
        >
          The world&rsquo;s health, grown as a garden.
        </p>
        <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
          {(
            [
              ["Respiratory", "jade"],
              ["Vaccine-preventable", "amber"],
              ["Vector-borne", "orchid"],
              ["Enteric", "sky"],
              ["Emerging", "ember"],
              ["Chronic", "lilac"],
            ] as const
          ).map(([label, color]) => (
            <span
              key={label}
              className="rounded-full border px-3 py-1 text-xs text-sage"
              style={{ borderColor: `var(--color-${color})` }}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="mt-20 w-full max-w-4xl">
          <LiveFigures />
        </div>
      </section>
    </main>
  );
}
