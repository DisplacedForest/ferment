import type { TimelineEntryType, TimelineEntryData } from "@/types";
// Note: daily_recap entries are system-generated and skip normal validation

export function validateTimelineData(
  entryType: TimelineEntryType,
  data: Record<string, unknown>
): { valid: true; data: TimelineEntryData } | { valid: false; error: string } {
  switch (entryType) {
    case "reading": {
      if (!data.gravity && !data.temperature && !data.ph) {
        return { valid: false, error: "Reading needs at least gravity, temperature, or pH" };
      }
      if (data.gravity !== undefined && (typeof data.gravity !== "number" || data.gravity <= 0)) {
        return { valid: false, error: "Gravity must be a positive number" };
      }
      if (data.temperature !== undefined && typeof data.temperature !== "number") {
        return { valid: false, error: "Temperature must be a number" };
      }
      if (data.ph !== undefined && (typeof data.ph !== "number" || data.ph < 0 || data.ph > 14)) {
        return { valid: false, error: "pH must be between 0 and 14" };
      }
      return {
        valid: true,
        data: {
          type: "reading",
          gravity: data.gravity as number | undefined,
          temperature: data.temperature as number | undefined,
          temperatureUnit: (data.temperatureUnit as "F" | "C") ?? "F",
          ph: data.ph as number | undefined,
          notes: data.notes as string | undefined,
        },
      };
    }

    case "addition": {
      if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
        return { valid: false, error: "Addition needs a name" };
      }
      return {
        valid: true,
        data: {
          type: "addition",
          name: data.name.trim(),
          amount: data.amount as number | undefined,
          unit: data.unit as string | undefined,
          notes: data.notes as string | undefined,
        },
      };
    }

    case "rack": {
      return {
        valid: true,
        data: {
          type: "rack",
          fromVessel: data.fromVessel as string | undefined,
          toVessel: data.toVessel as string | undefined,
          method: data.method as "siphon" | "pump" | "gravity" | undefined,
          volumeLoss: data.volumeLoss as number | undefined,
          volumeLossUnit: data.volumeLossUnit as "gal" | "L" | undefined,
          notes: data.notes as string | undefined,
        },
      };
    }

    case "taste": {
      const { appearance, aroma, flavor, overall, notes } = data;
      if (!appearance && !aroma && !flavor && !overall && !notes) {
        return { valid: false, error: "Taste note needs at least one field filled in" };
      }
      return {
        valid: true,
        data: {
          type: "taste",
          appearance: appearance as string | undefined,
          aroma: aroma as string | undefined,
          flavor: flavor as string | undefined,
          overall: overall as string | undefined,
          notes: notes as string | undefined,
        },
      };
    }

    case "note": {
      if (!data.content || typeof data.content !== "string" || data.content.trim() === "") {
        return { valid: false, error: "Note needs content" };
      }
      return {
        valid: true,
        data: {
          type: "note",
          content: data.content.trim(),
        },
      };
    }

    case "phase_change": {
      if (!data.toPhase || typeof data.toPhase !== "string") {
        return { valid: false, error: "Phase change needs a target phase" };
      }
      return {
        valid: true,
        data: {
          type: "phase_change",
          fromPhase: data.fromPhase as string | undefined,
          toPhase: data.toPhase as string,
          notes: data.notes as string | undefined,
        },
      };
    }

    case "alert": {
      if (!data.alertType || !data.severity || !data.message) {
        return { valid: false, error: "Alert needs alertType, severity, and message" };
      }
      const validTypes = ["stuck_fermentation", "temperature", "overdue_action", "custom"];
      const validSeverities = ["info", "warning", "critical"];
      if (!validTypes.includes(data.alertType as string)) {
        return { valid: false, error: `alertType must be one of: ${validTypes.join(", ")}` };
      }
      if (!validSeverities.includes(data.severity as string)) {
        return { valid: false, error: `severity must be one of: ${validSeverities.join(", ")}` };
      }
      return {
        valid: true,
        data: {
          type: "alert",
          alertType: data.alertType as "stuck_fermentation" | "temperature" | "overdue_action" | "custom",
          severity: data.severity as "info" | "warning" | "critical",
          message: data.message as string,
          resolved: data.resolved as boolean | undefined,
        },
      };
    }

    case "daily_recap":
    case "hourly_summary": {
      // System-generated — no user validation needed, pass through
      return {
        valid: true,
        data: data as unknown as TimelineEntryData,
      };
    }

    default:
      return { valid: false, error: `Unknown entry type: ${entryType}` };
  }
}
