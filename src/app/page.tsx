export default function Home() {
  return (
    <div className="pt-8 sm:pt-16">
      {/* Page heading — left-aligned, not centered. Journals don't center things. */}
      <div className="mb-10">
        <h1 className="font-display text-3xl tracking-tight text-wine-800 sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-1 text-parchment-700">
          Your batches at a glance.
        </p>
      </div>

      {/* Empty state — warm, inviting, not a sad gray box */}
      <div className="relative overflow-hidden rounded-md border border-parchment-300/80 bg-parchment-50 px-6 py-16 sm:px-12 sm:py-20">
        {/* Faint wine ring behind the empty state */}
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full opacity-100"
          aria-hidden="true"
          style={{
            background: `radial-gradient(
              ellipse at 50% 50%,
              transparent 38%,
              rgba(139, 63, 88, 0.04) 40%,
              rgba(139, 63, 88, 0.02) 48%,
              transparent 52%
            )`,
            transform: "rotate(-8deg) scale(1.2, 1)",
          }}
        />

        <div className="relative">
          {/* Decorative flourish — a simple SVG grape/vine motif */}
          <svg
            className="mx-auto mb-6 text-wine-300/60"
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="24" cy="20" r="4" fill="currentColor" />
            <circle cx="18" cy="26" r="4" fill="currentColor" />
            <circle cx="30" cy="26" r="4" fill="currentColor" />
            <circle cx="21" cy="33" r="4" fill="currentColor" />
            <circle cx="27" cy="33" r="4" fill="currentColor" />
            <circle cx="24" cy="39" r="3.5" fill="currentColor" />
            <path
              d="M24 6 C24 6, 20 10, 24 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M24 10 C28 8, 32 10, 30 14"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          <h2 className="text-center font-display text-xl text-wine-700">
            No batches yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-parchment-800/70">
            When you start your first batch, it&apos;ll show up here.
            Gravity readings, tasting notes, the whole timeline.
          </p>

          <div className="mt-8 flex justify-center">
            <button className="rounded bg-wine-500 px-5 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 active:bg-wine-700">
              Start a batch
            </button>
          </div>
        </div>
      </div>

      {/* A hint of what this page will become — faint placeholder cards */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-md border border-dashed border-parchment-300/50 bg-parchment-50/40 px-5 py-8"
            style={{ opacity: 1 - i * 0.25 }}
          >
            <div className="h-3 w-2/3 rounded-sm bg-parchment-300/30" />
            <div className="mt-3 h-2 w-1/3 rounded-sm bg-parchment-300/20" />
            <div className="mt-6 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((seg) => (
                <div
                  key={seg}
                  className="h-1.5 flex-1 rounded-sm bg-parchment-300/25"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
