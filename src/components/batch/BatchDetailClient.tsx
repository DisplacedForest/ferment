"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline } from "./Timeline";
import { ProtocolTab } from "./ProtocolTab";
import { FermentationChart } from "./FermentationChart";
import { QuickLogModal } from "@/components/quick-log/QuickLogModal";
import { ReadingCleanup } from "./ReadingCleanup";
import { BatchSettings } from "./BatchSettings";
import type { TimelineEntry, BatchPhase } from "@/types";

interface BatchDetailClientProps {
  batchUuid: string;
  initialEntries: TimelineEntry[];
  totalEntries: number;
  phases: BatchPhase[];
  currentPhaseId: number | null;
  accentColor?: string;
}

export function BatchDetailClient({
  batchUuid,
  initialEntries,
  totalEntries,
  phases,
  currentPhaseId,
  accentColor,
}: BatchDetailClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
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
          <FermentationChart batchUuid={batchUuid} phases={phases} accentColor={accentColor} />
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setCleanupOpen(true)}
              className="text-xs text-parchment-600 hover:text-wine-600 transition-colors"
            >
              Clean up readings
            </button>
          </div>
        </TabsContent>

        <TabsContent value="protocol">
          <ProtocolTab batchUuid={batchUuid} phases={phases} currentPhaseId={currentPhaseId} />
        </TabsContent>

        <TabsContent value="settings">
          <BatchSettings batchUuid={batchUuid} />
        </TabsContent>
      </Tabs>

      {/* Quick Log Modal */}
      <QuickLogModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        batchUuid={batchUuid}
        onEntryCreated={handleEntryCreated}
      />

      {/* Reading Cleanup Dialog */}
      <ReadingCleanup
        open={cleanupOpen}
        onOpenChange={setCleanupOpen}
        batchUuid={batchUuid}
        onCleanupApplied={handleEntryCreated}
      />
    </div>
  );
}
