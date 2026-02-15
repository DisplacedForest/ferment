import type {
  TimelineEntry,
  ReadingData,
  AlertData,
  BatchPhase,
  CompletionCriteria,
} from "@/types";

function hasGravityCriteria(criteria: CompletionCriteria | null): boolean {
  if (!criteria) return false;
  if (criteria.type === "gravity_stable") return true;
  if (criteria.type === "compound") return criteria.criteria.some(hasGravityCriteria);
  return false;
}

export function detectStuckFermentation(
  entries: TimelineEntry[],
  phase?: BatchPhase | null
): AlertData | null {
  // Only fire during phases with gravity_stable criteria
  if (phase && !hasGravityCriteria(phase.completionCriteria)) return null;

  const readings = entries
    .filter((e) => e.entryType === "reading")
    .map((e) => ({
      gravity: (e.data as unknown as ReadingData).gravity,
      createdAt: e.createdAt,
    }))
    .filter((r) => r.gravity != null)
    .slice(0, 4); // newest-first

  if (readings.length < 4) return null;

  // Check span is at least 48 hours
  const newest = new Date(readings[0].createdAt).getTime();
  const oldest = new Date(readings[readings.length - 1].createdAt).getTime();
  const spanHours = (newest - oldest) / 3600000;
  if (spanHours < 48) return null;

  const gravities = readings.map((r) => r.gravity!);
  const range = Math.max(...gravities) - Math.min(...gravities);

  if (range < 0.001) {
    return {
      type: "alert",
      alertType: "stuck_fermentation",
      severity: "warning",
      message: `Gravity hasn't moved in ${Math.round(spanHours / 24)} days. Might be stuck.`,
    };
  }

  return null;
}

export function detectTemperatureDrift(
  entries: TimelineEntry[],
  phase: BatchPhase | null
): AlertData | null {
  if (!phase || phase.targetTempLow == null || phase.targetTempHigh == null) return null;

  const readings = entries
    .filter((e) => e.entryType === "reading")
    .map((e) => (e.data as unknown as ReadingData).temperature)
    .filter((t): t is number => t != null)
    .slice(0, 2);

  if (readings.length < 2) return null;

  const allOutside = readings.every(
    (t) => t < phase.targetTempLow! || t > phase.targetTempHigh!
  );

  if (allOutside) {
    const latest = readings[0];
    const direction = latest < phase.targetTempLow! ? "low" : "high";
    return {
      type: "alert",
      alertType: "temperature",
      severity: "warning",
      message: `Temp is running ${direction} — last 2 readings outside ${phase.targetTempLow}–${phase.targetTempHigh}°${phase.targetTempUnit ?? "F"} range.`,
    };
  }

  return null;
}

export function detectGravityAnomaly(
  entries: TimelineEntry[]
): AlertData | null {
  const readings = entries
    .filter((e) => e.entryType === "reading")
    .map((e) => (e.data as unknown as ReadingData).gravity)
    .filter((g): g is number => g != null)
    .slice(0, 2);

  if (readings.length < 2) return null;

  const [latest, previous] = readings;
  // Gravity went UP by more than 0.003 — possible contamination or measurement error
  if (latest > previous + 0.003) {
    return {
      type: "alert",
      alertType: "custom",
      severity: "info",
      message: `Gravity jumped up from ${previous.toFixed(3)} to ${latest.toFixed(3)} SG — worth double-checking that reading.`,
    };
  }

  return null;
}

export function runAlertDetection(
  entries: TimelineEntry[],
  currentPhase: BatchPhase | null
): AlertData[] {
  const alerts: AlertData[] = [];

  const stuck = detectStuckFermentation(entries, currentPhase);
  if (stuck) alerts.push(stuck);

  const tempDrift = detectTemperatureDrift(entries, currentPhase);
  if (tempDrift) alerts.push(tempDrift);

  const anomaly = detectGravityAnomaly(entries);
  if (anomaly) alerts.push(anomaly);

  return alerts;
}
