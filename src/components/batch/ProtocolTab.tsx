"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { daysBetween, timeAgo } from "@/lib/utils";
import type { BatchPhase, PhaseEvaluation } from "@/types";

interface ProtocolTabProps {
  batchUuid: string;
  phases: BatchPhase[];
  currentPhaseId: number | null;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "bg-wine-100 text-wine-700";
    case "completed":
      return "bg-[#5a8a5e]/10 text-[#5a8a5e]";
    case "skipped":
      return "bg-parchment-300 text-parchment-600";
    default:
      return "bg-parchment-200 text-parchment-600";
  }
}

function criteriaDescription(criteria: Record<string, unknown> | null): string {
  if (!criteria) return "No criteria set";
  switch (criteria.type) {
    case "gravity_stable":
      return `Gravity stable — ${criteria.consecutiveReadings} readings within ${(criteria.toleranceSG as number)?.toFixed(3)} SG`;
    case "duration":
      return `${criteria.minDays} days minimum`;
    case "action_count":
      return `${criteria.minCount}x ${criteria.actionName}`;
    case "manual":
      return "Manual advancement";
    case "compound":
      return (criteria.criteria as Record<string, unknown>[])
        .map((c) => criteriaDescription(c))
        .join(" + ");
    default:
      return "Unknown criteria";
  }
}

export function ProtocolTab({ batchUuid, phases, currentPhaseId }: ProtocolTabProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(currentPhaseId);
  const [evaluation, setEvaluation] = useState<PhaseEvaluation | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const fetchEvaluation = useCallback(async () => {
    if (!currentPhaseId) return;
    try {
      const res = await fetch(`/api/v1/batches/${batchUuid}/phase-status`);
      if (res.ok) {
        setEvaluation(await res.json());
      }
    } catch {
      // Evaluation is non-critical
    }
  }, [batchUuid, currentPhaseId]);

  useEffect(() => {
    fetchEvaluation();
  }, [fetchEvaluation]);

  async function handleAdvance() {
    if (!confirm("Advance to the next phase? This will complete the current one.")) return;
    setAdvancing(true);
    try {
      const res = await fetch(`/api/v1/batches/${batchUuid}/advance-phase`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setAdvancing(false);
    }
  }

  async function handleSkip(phaseId: number) {
    if (!confirm("Skip this phase? It will be marked as skipped.")) return;
    try {
      const res = await fetch(`/api/v1/batches/${batchUuid}/skip-phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // ignore
    }
  }

  if (phases.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-parchment-700">
        No protocol set up for this batch. Edit the batch to add phases.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {phases.map((phase) => {
        const isExpanded = expandedId === phase.id;
        const isActive = phase.id === currentPhaseId;
        const daysInPhase = phase.startedAt ? daysBetween(phase.startedAt) : null;

        return (
          <div
            key={phase.id}
            className={cn(
              "rounded-md border bg-parchment-50",
              isActive
                ? "border-wine-300/60 shadow-[0_1px_3px_rgba(46,14,29,0.08)]"
                : "border-parchment-300/80"
            )}
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : phase.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize",
                    statusBadgeClass(phase.status)
                  )}
                >
                  {phase.status}
                </span>
                <span className="text-sm font-medium text-wine-800">{phase.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-parchment-700">
                {daysInPhase !== null && phase.status !== "pending" && (
                  <span className="font-mono">
                    {daysInPhase}d
                    {phase.expectedDurationDays ? `/${phase.expectedDurationDays}d` : ""}
                  </span>
                )}
                {phase.status === "pending" && phase.expectedDurationDays && (
                  <span className="font-mono">{phase.expectedDurationDays}d expected</span>
                )}
                <span>{isExpanded ? "\u25B4" : "\u25BE"}</span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-parchment-300/60 px-4 py-3 space-y-3">
                {/* Temp range */}
                {(phase.targetTempLow || phase.targetTempHigh) && (
                  <div className="text-sm text-parchment-700">
                    Target temp:{" "}
                    <span className="font-mono text-wine-800">
                      {phase.targetTempLow}–{phase.targetTempHigh}°{phase.targetTempUnit ?? "F"}
                    </span>
                  </div>
                )}

                {/* Completion criteria */}
                <div className="text-sm">
                  <span className="text-parchment-700">Completion: </span>
                  <span className="text-wine-800">
                    {criteriaDescription(phase.completionCriteria as Record<string, unknown> | null)}
                  </span>
                </div>

                {/* Evaluation (active phase only) */}
                {isActive && evaluation && (
                  <div
                    className={cn(
                      "rounded px-3 py-2 text-sm",
                      evaluation.criteriaMet
                        ? "bg-[#5a8a5e]/10 text-[#5a8a5e]"
                        : "bg-parchment-200 text-parchment-700"
                    )}
                  >
                    {evaluation.criteriaMet ? "\u2713 " : "\u2022 "}
                    {evaluation.criteriaDetails}
                  </div>
                )}

                {/* Overdue actions */}
                {isActive && evaluation && evaluation.overdueActions.length > 0 && (
                  <div className="text-sm">
                    <span className="text-[#a04040] font-medium">Overdue:</span>
                    <ul className="mt-1 space-y-0.5">
                      {evaluation.overdueActions.map((a) => (
                        <li key={a.id} className="text-[#a04040]">
                          {a.name}
                          {a.dueAt && ` \u00b7 due ${timeAgo(a.dueAt)}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                {isActive && evaluation && evaluation.nextActions.length > 0 && (
                  <div className="text-sm">
                    <span className="text-parchment-700">Upcoming:</span>
                    <ul className="mt-1 space-y-0.5">
                      {evaluation.nextActions.map((a) => (
                        <li key={a.id} className="text-parchment-700">
                          {a.name}
                          {a.dueAt && ` \u00b7 ${timeAgo(a.dueAt)}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Phase notes */}
                {phase.notes && (
                  <p className="text-sm text-parchment-600 italic">{phase.notes}</p>
                )}

                {/* Actions for active phase */}
                {isActive && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAdvance}
                      disabled={advancing}
                      className="rounded bg-wine-500 px-4 py-1.5 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 disabled:opacity-50"
                    >
                      {advancing ? "Advancing..." : "Advance phase"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSkip(phase.id)}
                      className="rounded border border-parchment-300/80 px-4 py-1.5 text-sm font-medium text-parchment-700 transition-colors hover:border-parchment-400 hover:text-wine-600"
                    >
                      Skip
                    </button>
                  </div>
                )}

                {/* Completed phase timestamps */}
                {phase.status === "completed" && phase.startedAt && phase.completedAt && (
                  <p className="text-xs text-parchment-600">
                    {timeAgo(phase.startedAt)} → {timeAgo(phase.completedAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
