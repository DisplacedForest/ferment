import { notFound } from "next/navigation";
import Link from "next/link";
import { getBatchByUuid, getTimelineEntries, getPhasesByBatchId } from "@/lib/queries";
import { StatusHeader } from "@/components/batch/StatusHeader";
import { BatchDetailClient } from "@/components/batch/BatchDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const batch = await getBatchByUuid(id);

  if (!batch) {
    notFound();
  }

  const [{ entries, total }, phases] = await Promise.all([
    getTimelineEntries(batch.id, { limit: 50 }),
    getPhasesByBatchId(batch.id),
  ]);

  return (
    <div className="pt-8 sm:pt-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-parchment-700 transition-colors hover:text-wine-600"
        >
          &larr; Dashboard
        </Link>
      </div>

      <StatusHeader batch={batch} phases={phases} />
      <BatchDetailClient
        batchUuid={batch.uuid}
        initialEntries={entries}
        totalEntries={total}
        phases={phases}
        currentPhaseId={batch.currentPhaseId}
      />
    </div>
  );
}
