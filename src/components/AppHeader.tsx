import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-parchment-300/60">
      <div className="mx-auto flex max-w-5xl items-baseline justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight text-wine-700 transition-colors hover:text-wine-500"
        >
          Ferment
        </Link>
        <nav className="flex items-baseline gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-wine-800/80 transition-colors hover:text-wine-600"
          >
            Dashboard
          </Link>
          <Link
            href="/batches/new"
            className="text-sm text-parchment-700 transition-colors hover:text-wine-600"
          >
            + New batch
          </Link>
          <Link
            href="/settings"
            className="text-sm text-parchment-700 transition-colors hover:text-wine-600"
          >
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
