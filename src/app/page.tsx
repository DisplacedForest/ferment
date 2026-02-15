import Link from "next/link";
import { Suspense } from "react";
import { getBatches } from "@/lib/queries";
import { BatchCard } from "@/components/dashboard/BatchCard";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { BatchCardSkeleton } from "@/components/dashboard/BatchCardSkeleton";
import type { BatchStatus, BatchWithComputed } from "@/types";

interface PageProps {
  searchParams: Promise<{ status?: string; sort?: string }>;
}

function EmptyState() {
  return (
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
          <Link
            href="/batches/new"
            className="rounded bg-wine-500 px-5 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 active:bg-wine-700"
          >
            Start a batch
          </Link>
        </div>
      </div>
    </div>
  );
}

async function BatchGrid({ status, sort }: { status?: string; sort?: string }) {
  const validStatuses = ["active", "completed", "planning", "archived"];
  const statusFilter = status && validStatuses.includes(status)
    ? (status as BatchStatus)
    : undefined;

  const allBatches = await getBatches(statusFilter);

  // Sort
  let sorted: BatchWithComputed[];
  if (sort === "name") {
    sorted = [...allBatches].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "createdAt") {
    sorted = [...allBatches].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else {
    sorted = allBatches; // already sorted by updatedAt desc
  }

  if (sorted.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((batch) => (
        <BatchCard key={batch.uuid} batch={batch} />
      ))}
    </div>
  );
}

function BatchGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <BatchCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const { status, sort } = await searchParams;

  return (
    <div className="pt-8 sm:pt-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-wine-800 sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-1 text-parchment-700">
            Your batches at a glance.
          </p>
        </div>
        <Link
          href="/batches/new"
          className="rounded bg-wine-500 px-4 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 active:bg-wine-700"
        >
          Start a batch
        </Link>
      </div>

      <div className="mb-6">
        <DashboardFilters />
      </div>

      <Suspense fallback={<BatchGridSkeleton />}>
        <BatchGrid status={status} sort={sort} />
      </Suspense>
    </div>
  );
}
