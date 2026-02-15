import { daysBetween } from "./utils";
import type {
  BatchPhase,
  PhaseAction,
  PhaseEvaluation,
  CompletionCriteria,
  TimelineEntry,
  ReadingData,
} from "@/types";

function evaluateCriteria(
  criteria: CompletionCriteria,
  phase: BatchPhase,
  entries: TimelineEntry[]
): { met: boolean; details: string } {
  switch (criteria.type) {
    case "gravity_stable": {
      const readings = entries
        .filter((e) => e.entryType === "reading" && e.createdAt >= (phase.startedAt ?? ""))
        .map((e) => e.data as unknown as ReadingData)
        .filter((d) => d.gravity != null)
        .slice(0, criteria.consecutiveReadings); // entries are newest-first

      if (readings.length < criteria.consecutiveReadings) {
        return {
          met: false,
          details: `Need ${criteria.consecutiveReadings} gravity readings, have ${readings.length}`,
        };
      }

      const gravities = readings.map((r) => r.gravity!);
      const range = Math.max(...gravities) - Math.min(...gravities);

      if (range <= criteria.toleranceSG) {
        return {
          met: true,
          details: `Gravity stable — last ${criteria.consecutiveReadings} readings within ${criteria.toleranceSG.toFixed(3)} SG`,
        };
      }

      return {
        met: false,
        details: `Gravity still moving — range of ${range.toFixed(3)} SG across last ${criteria.consecutiveReadings} readings`,
      };
    }

    case "duration": {
      if (!phase.startedAt) {
        return { met: false, details: "Phase hasn't started yet" };
      }
      const days = daysBetween(phase.startedAt);
      if (days >= criteria.minDays) {
        return { met: true, details: `${days} days elapsed (minimum ${criteria.minDays})` };
      }
      return {
        met: false,
        details: `${days} of ${criteria.minDays} days elapsed`,
      };
    }

    case "action_count": {
      const matchingEntries = entries.filter((e) => {
        if (e.createdAt < (phase.startedAt ?? "")) return false;
        const data = e.data as unknown as Record<string, unknown>;
        return data.name === criteria.actionName || data.content === criteria.actionName;
      });

      if (matchingEntries.length >= criteria.minCount) {
        return {
          met: true,
          details: `${criteria.actionName}: ${matchingEntries.length}/${criteria.minCount} completed`,
        };
      }
      return {
        met: false,
        details: `${criteria.actionName}: ${matchingEntries.length}/${criteria.minCount} completed`,
      };
    }

    case "manual": {
      return { met: false, details: "Manual advancement required" };
    }

    case "compound": {
      const results = criteria.criteria.map((c) =>
        evaluateCriteria(c, phase, entries)
      );
      const allMet = results.every((r) => r.met);
      const details = results.map((r) => r.details).join("; ");
      return { met: allMet, details };
    }
  }
}

export function evaluatePhase(
  phase: BatchPhase,
  actions: PhaseAction[],
  entries: TimelineEntry[]
): PhaseEvaluation {
  const now = new Date();
  const daysInPhase = phase.startedAt ? daysBetween(phase.startedAt) : 0;

  // Evaluate completion criteria
  let criteriaMet = false;
  let criteriaDetails = "No completion criteria set";

  if (phase.completionCriteria) {
    const result = evaluateCriteria(
      phase.completionCriteria,
      phase,
      entries
    );
    criteriaMet = result.met;
    criteriaDetails = result.details;
  }

  // Compute action statuses
  const nowMs = now.getTime();
  const overdueActions: PhaseAction[] = [];
  const nextActions: PhaseAction[] = [];

  for (const action of actions) {
    let effectiveDueAt: string | null = action.dueAt;

    if (action.intervalDays && action.lastCompletedAt) {
      const last = new Date(action.lastCompletedAt);
      last.setDate(last.getDate() + action.intervalDays);
      effectiveDueAt = last.toISOString();
    }

    if (effectiveDueAt) {
      const dueMs = new Date(effectiveDueAt).getTime();
      if (dueMs < nowMs) {
        overdueActions.push(action);
      } else {
        nextActions.push(action);
      }
    } else {
      nextActions.push(action);
    }
  }

  // Sort next actions by dueAt
  nextActions.sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return a.sortOrder - b.sortOrder;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.localeCompare(b.dueAt);
  });

  return {
    criteriaMet,
    criteriaDetails,
    nextActions,
    overdueActions,
    daysInPhase,
  };
}
