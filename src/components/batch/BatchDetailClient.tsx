"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline } from "./Timeline";
import { QuickLogModal } from "@/components/quick-log/QuickLogModal";
import type { TimelineEntry } from "@/types";

interface BatchDetailClientProps {
  batchUuid: string;
  initialEntries: TimelineEntry[];
  totalEntries: number;
}

export function BatchDetailClient({
  batchUuid,
  initialEntries,
  totalEntries,
}: BatchDetailClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(totalEntries);

  const handleEntryCreated = useCallback(async () => {
    // Refresh timeline data
    const res = await fetch(`/api/v1/batches/${batchUuid}/timeline?limit=50`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
    }
    // Refresh server-rendered header (gravity, ABV, etc.)
    router.refresh();
  }, [batchUuid, router]);

  return (
    <div>
      {/* Action bar */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => setModalOpen(true)}
          className="rounded bg-wine-500 px-4 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 active:bg-wine-700"
        >
          Log reading
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="protocol">Protocol</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Timeline entries={entries} batchUuid={batchUuid} total={total} />
        </TabsContent>

        <TabsContent value="chart">
          <div className="py-12 text-center text-sm text-parchment-700">
            Fermentation curve coming soon.
          </div>
        </TabsContent>

        <TabsContent value="protocol">
          <div className="py-12 text-center text-sm text-parchment-700">
            Protocol management coming in Phase 2.
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="py-12 text-center text-sm text-parchment-700">
            Batch settings coming soon.
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Log Modal */}
      <QuickLogModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        batchUuid={batchUuid}
        onEntryCreated={handleEntryCreated}
      />
    </div>
  );
}
