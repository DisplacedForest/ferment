// ---------------------------------------------------------------------------
// Ferment — Standard Wine Phase Definitions
// ---------------------------------------------------------------------------
// Opinionated defaults for the "Standard" protocol mode in the batch wizard.
// Phases start clean (no pre-baked actions). Contextual suggestions let users
// opt into actions via the suggestion engine in phase-suggestions.ts.
// ---------------------------------------------------------------------------

import type { ProtocolPhaseTemplate, CompletionCriteriaType } from "@/types";

export interface StandardPhaseDefinition extends ProtocolPhaseTemplate {
  slug: string;
  optional: boolean;
  description: string;
  /** Which criteria types the user can choose for this phase. Omit = fixed criteria. */
  allowedCriteriaTypes?: CompletionCriteriaType[];
}

// ── Red Wine Phases ──────────────────────────────────────────────────────

export const STANDARD_WINE_PHASES_RED: StandardPhaseDefinition[] = [
  {
    slug: "primary",
    name: "Primary Fermentation",
    sortOrder: 0,
    expectedDurationDays: 14,
    targetTempLow: 65,
    targetTempHigh: 78,
    targetTempUnit: "F",
    completionCriteria: {
      type: "gravity_stable",
      consecutiveReadings: 3,
      toleranceSG: 0.002,
      stableDurationHours: 24,
    },
    actions: [],
    optional: false,
    description: "Active yeast fermentation. Ends when gravity stabilizes.",
  },
  {
    slug: "secondary",
    name: "Secondary / MLF",
    sortOrder: 1,
    completionCriteria: { type: "manual" },
    actions: [],
    optional: true,
    description: "Malolactic fermentation or extended maceration.",
  },
  {
    slug: "clearing",
    name: "Clearing / Fining",
    sortOrder: 2,
    expectedDurationDays: 14,
    targetTempLow: 60,
    targetTempHigh: 68,
    targetTempUnit: "F",
    completionCriteria: { type: "duration", minDays: 14 },
    actions: [],
    optional: false,
    description: "Wine clarifies with or without fining agents.",
  },
  {
    slug: "aging",
    name: "Bulk Aging",
    sortOrder: 3,
    completionCriteria: { type: "manual" },
    actions: [],
    optional: true,
    description: "Extended aging on oak or in carboy.",
    allowedCriteriaTypes: ["manual", "duration"],
  },
  {
    slug: "bottling",
    name: "Bottling",
    sortOrder: 4,
    completionCriteria: { type: "manual" },
    actions: [],
    optional: false,
    description: "Final additions and bottling.",
  },
  {
    slug: "bottle-aging",
    name: "Bottle Aging",
    sortOrder: 5,
    completionCriteria: { type: "manual" },
    actions: [],
    optional: true,
    description: "Rest in bottle before drinking.",
  },
];

// ── White Wine Phases ────────────────────────────────────────────────────

export const STANDARD_WINE_PHASES_WHITE: StandardPhaseDefinition[] = [
  {
    slug: "primary",
    name: "Primary Fermentation",
    sortOrder: 0,
    expectedDurationDays: 14,
    targetTempLow: 55,
    targetTempHigh: 68,
    targetTempUnit: "F",
    completionCriteria: {
      type: "gravity_stable",
      consecutiveReadings: 3,
      toleranceSG: 0.002,
      stableDurationHours: 24,
    },
    actions: [],
    optional: false,
    description: "Active yeast fermentation. Ends when gravity stabilizes.",
  },
  {
    slug: "secondary",
    name: "Secondary / MLF",
    sortOrder: 1,
    completionCriteria: { type: "manual" },
    actions: [],
    optional: true,
    description: "Malolactic fermentation (less common for whites).",
  },
  {
    slug: "clearing",
    name: "Clearing / Fining",
    sortOrder: 2,
    expectedDurationDays: 14,
    targetTempLow: 55,
    targetTempHigh: 62,
    targetTempUnit: "F",
    completionCriteria: { type: "duration", minDays: 14 },
    actions: [],
    optional: false,
    description: "Wine clarifies with or without fining agents.",
  },
  {
    slug: "aging",
    name: "Bulk Aging",
    sortOrder: 3,
    completionCriteria: { type: "manual" },
    actions: [],
    optional: true,
    description: "Extended aging on oak or in carboy.",
    allowedCriteriaTypes: ["manual", "duration"],
  },
  {
    slug: "bottling",
    name: "Bottling",
    sortOrder: 4,
    completionCriteria: { type: "manual" },
    actions: [],
    optional: false,
    description: "Final additions and bottling.",
  },
  {
    slug: "bottle-aging",
    name: "Bottle Aging",
    sortOrder: 5,
    completionCriteria: { type: "manual" },
    actions: [],
    optional: true,
    description: "Rest in bottle before drinking.",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────

export function getStandardPhases(wineType: "red" | "white"): StandardPhaseDefinition[] {
  return wineType === "red" ? STANDARD_WINE_PHASES_RED : STANDARD_WINE_PHASES_WHITE;
}

export function filterOptionalPhases(
  phases: StandardPhaseDefinition[],
  enabledSlugs: Set<string>
): StandardPhaseDefinition[] {
  return phases.filter((p) => !p.optional || enabledSlugs.has(p.slug));
}

/** Convert standard phase definitions to the template format used by the wizard. */
export function standardPhasesToTemplate(
  phases: StandardPhaseDefinition[]
): ProtocolPhaseTemplate[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return phases.map(({ slug, optional, description, allowedCriteriaTypes, ...template }) => template);
}
