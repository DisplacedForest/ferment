"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepBasics } from "./wizard/StepBasics";
import { StepProtocol } from "./wizard/StepProtocol";
import type { PhaseInput } from "./wizard/StepProtocol";
import { StepConnect } from "./wizard/StepConnect";
import type { TrackingMode, UnlinkedReadingsData } from "./wizard/StepConnect";
import type { TiltCSVRow } from "@/lib/import/parse-tilt-csv";
import { cn } from "@/lib/utils";

const STEPS = ["Basics", "Protocol", "Connect"] as const;

export function BatchWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Basics
  const [basics, setBasics] = useState({
    name: "",
    style: "",
    targetVolume: "",
    targetVolumeUnit: "gal" as "gal" | "L",
    yeastStrain: "",
    notes: "",
  });

  // Step 2 — Protocol
  const [phases, setPhases] = useState<PhaseInput[]>([]);

  // Step 3 — Connect
  const [parentBatchIds, setParentBatchIds] = useState<string[]>([]);
  const [hydrometerId, setHydrometerId] = useState<number | null>(null);
  const [trackingMode, setTrackingMode] = useState<TrackingMode>("manual");
  const [originalGravity, setOriginalGravity] = useState("");
  const [csvData, setCsvData] = useState<{ rows: TiltCSVRow[]; fileName: string; rawText: string } | null>(null);
  const [includeBackfill, setIncludeBackfill] = useState(true);
  const [unlinkedReadings, setUnlinkedReadings] = useState<UnlinkedReadingsData | null>(null);

  function handleBasicsChange(field: string, value: string) {
    setBasics((prev) => ({ ...prev, [field]: value }));
  }

  function canAdvance(): boolean {
    if (step === 0) return basics.name.trim().length > 0;
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const og = originalGravity ? parseFloat(originalGravity) : undefined;

    const body: Record<string, unknown> = {
      name: basics.name.trim(),
      style: basics.style.trim() || undefined,
      targetVolume: basics.targetVolume ? parseFloat(basics.targetVolume) : undefined,
      targetVolumeUnit: basics.targetVolumeUnit,
      yeastStrain: basics.yeastStrain.trim() || undefined,
      notes: basics.notes.trim() || undefined,
      parentBatchIds: parentBatchIds.length > 0 ? parentBatchIds : undefined,
      hydrometerId: hydrometerId ?? undefined,
      originalGravity: og && !isNaN(og) ? og : undefined,
    };

    if (phases.length > 0) {
      body.phases = phases
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          sortOrder: p.sortOrder,
          expectedDurationDays: p.expectedDurationDays ? parseInt(p.expectedDurationDays) : undefined,
          targetTempLow: p.targetTempLow ? parseFloat(p.targetTempLow) : undefined,
          targetTempHigh: p.targetTempHigh ? parseFloat(p.targetTempHigh) : undefined,
          targetTempUnit: p.targetTempUnit,
          completionCriteria: p.completionCriteria ?? undefined,
          actions: p.actions
            .filter((a) => a.name.trim())
            .map((a) => ({
              name: a.name.trim(),
              intervalDays: a.intervalDays ? parseInt(a.intervalDays) : undefined,
              sortOrder: a.sortOrder,
            })),
        }));
    }

    try {
      const res = await fetch("/api/v1/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }

      const batch = await res.json();

      // If hydrometer mode with backfill, claim unlinked readings
      if (
        trackingMode === "hydrometer" &&
        includeBackfill &&
        unlinkedReadings &&
        unlinkedReadings.count > 0 &&
        hydrometerId
      ) {
        try {
          const readingIds = unlinkedReadings.readings.map((r) => r.id);
          await fetch(`/api/v1/hydrometers/${hydrometerId}/unlinked-readings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ batchId: batch.id, readingIds }),
          });
        } catch (claimErr) {
          console.error("Backfill claim error:", claimErr);
        }
      }

      // If import mode with CSV data and a hydrometer linked, import readings
      if (trackingMode === "import" && csvData && csvData.rows.length > 0 && hydrometerId) {
        try {
          const importRes = await fetch("/api/v1/import/tilt-csv", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              csvText: csvData.rawText,
              batchId: batch.id,
              hydrometerId,
            }),
          });

          if (!importRes.ok) {
            // Batch was created, but import failed — navigate anyway
            console.error("CSV import failed after batch creation:", await importRes.text());
          }
        } catch (importErr) {
          console.error("CSV import error:", importErr);
        }
      }

      router.push(`/batches/${batch.uuid}`);
    } catch {
      setError("Failed to create batch. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                i < step && "bg-wine-600 text-parchment-100 cursor-pointer",
                i === step && "bg-wine-500 text-parchment-100",
                i > step && "bg-parchment-300 text-parchment-600 cursor-default"
              )}
            >
              {i + 1}
            </button>
            <span
              className={cn(
                "text-sm hidden sm:inline",
                i === step ? "text-wine-800 font-medium" : "text-parchment-600"
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-8 sm:w-12",
                  i < step ? "bg-wine-400" : "bg-parchment-300"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && <StepBasics data={basics} onChange={handleBasicsChange} />}
      {step === 1 && <StepProtocol phases={phases} onPhasesChange={setPhases} />}
      {step === 2 && (
        <StepConnect
          basics={basics}
          phases={phases}
          parentBatchIds={parentBatchIds}
          onParentBatchIdsChange={setParentBatchIds}
          hydrometerId={hydrometerId}
          onHydrometerIdChange={setHydrometerId}
          trackingMode={trackingMode}
          onTrackingModeChange={setTrackingMode}
          originalGravity={originalGravity}
          onOriginalGravityChange={setOriginalGravity}
          csvData={csvData}
          onCsvDataChange={setCsvData}
          includeBackfill={includeBackfill}
          onIncludeBackfillChange={setIncludeBackfill}
          onUnlinkedReadingsChange={setUnlinkedReadings}
        />
      )}

      {error && <p className="mt-4 text-sm text-[#a04040]">{error}</p>}

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded border border-parchment-300/80 px-5 py-2 text-sm font-medium text-parchment-800/70 transition-colors hover:border-parchment-400 hover:text-wine-600"
          >
            Back
          </button>
        )}

        {step < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance()}
            className="rounded bg-wine-500 px-5 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 active:bg-wine-700 disabled:opacity-50"
          >
            Next
          </button>
        )}

        {step === STEPS.length - 1 && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !basics.name.trim()}
            className="rounded bg-wine-500 px-5 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 active:bg-wine-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Start batch"}
          </button>
        )}

        {step === 0 && (
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded border border-parchment-300/80 px-5 py-2 text-sm font-medium text-parchment-800/70 transition-colors hover:border-parchment-400 hover:text-wine-600"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
