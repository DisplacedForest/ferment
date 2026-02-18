// ---------------------------------------------------------------------------
// Ferment — Contextual Phase Suggestion Engine
// ---------------------------------------------------------------------------
// Pure functions that generate action suggestions for standard wine phases.
// Suggestions let users opt into actions rather than having them pre-baked.
// ---------------------------------------------------------------------------

import type { ActionInput } from "@/components/batch/wizard/StepProtocol";
import { getYeastByName } from "@/lib/reference-data";

export type SuggestionEmphasis = "recommended" | "normal";

export interface PhaseSuggestion {
  id: string;
  action: ActionInput;
  label: string;
  reason: string;
  emphasis: SuggestionEmphasis;
}

interface SuggestionContext {
  wineType: "red" | "white";
  yeastStrain?: string;
}

function yeastHasHighNitrogenDemand(yeastStrain?: string): { highDemand: boolean; yeastName?: string; demandLevel?: string } {
  if (!yeastStrain) return { highDemand: false };
  const yeast = getYeastByName(yeastStrain);
  if (!yeast) return { highDemand: false };
  const highDemand = yeast.nitrogenDemand === "high" || yeast.nitrogenDemand === "medium";
  return { highDemand, yeastName: yeast.name, demandLevel: yeast.nitrogenDemand };
}

function nutrientReason(ctx: SuggestionContext): string {
  const { highDemand, yeastName, demandLevel } = yeastHasHighNitrogenDemand(ctx.yeastStrain);
  if (highDemand && yeastName) {
    return `${yeastName} has ${demandLevel} nitrogen demand`;
  }
  return "Nutrients help ensure a clean fermentation";
}

function nutrientEmphasis(ctx: SuggestionContext): SuggestionEmphasis {
  return yeastHasHighNitrogenDemand(ctx.yeastStrain).highDemand ? "recommended" : "normal";
}

const PRIMARY_SUGGESTIONS = (ctx: SuggestionContext): PhaseSuggestion[] => {
  const emphasis = nutrientEmphasis(ctx);
  const reason = nutrientReason(ctx);

  const suggestions: PhaseSuggestion[] = [
    {
      id: "nutrient-24h",
      action: { name: "Nutrient addition (24h)", intervalDays: "", sortOrder: 0, triggerType: "time", dueAfterHours: 24 },
      label: "Nutrient (24h)",
      reason,
      emphasis,
    },
    {
      id: "nutrient-48h",
      action: { name: "Nutrient addition (48h)", intervalDays: "", sortOrder: 1, triggerType: "time", dueAfterHours: 48 },
      label: "Nutrient (48h)",
      reason,
      emphasis,
    },
    {
      id: "nutrient-third-break",
      action: { name: "Nutrient addition (1/3 break)", intervalDays: "", sortOrder: 2, triggerType: "gravity", triggerAttenuationFraction: 0.333 },
      label: "Nutrient (1/3 break)",
      reason,
      emphasis,
    },
  ];

  if (ctx.wineType === "red") {
    suggestions.push({
      id: "punch-down",
      action: { name: "Punch down cap", intervalDays: "1", sortOrder: 3 },
      label: "Punch down (daily)",
      reason: "Keeps the cap submerged for color and tannin extraction",
      emphasis: "recommended",
    });
  }

  return suggestions;
};

const CLEARING_SUGGESTIONS: PhaseSuggestion[] = [
  {
    id: "bentonite",
    action: { name: "Add Bentonite", intervalDays: "", sortOrder: 0 },
    label: "Bentonite",
    reason: "Clay fining for protein haze removal",
    emphasis: "normal",
  },
  {
    id: "sparkolloid",
    action: { name: "Add Sparkolloid", intervalDays: "", sortOrder: 0 },
    label: "Sparkolloid",
    reason: "Positively charged fining agent",
    emphasis: "normal",
  },
  {
    id: "super-kleer",
    action: { name: "Add Super-Kleer", intervalDays: "", sortOrder: 0 },
    label: "Super-Kleer",
    reason: "Two-part fining kit for fast clearing",
    emphasis: "normal",
  },
];

const AGING_SUGGESTIONS: PhaseSuggestion[] = [
  {
    id: "oak-addition",
    action: { name: "Oak addition", intervalDays: "", sortOrder: 0 },
    label: "Oak",
    reason: "Adds complexity, vanilla, and tannin structure",
    emphasis: "normal",
  },
  {
    id: "racking",
    action: { name: "Racking", intervalDays: "", sortOrder: 1 },
    label: "Racking",
    reason: "Transfer off sediment to improve clarity and flavor",
    emphasis: "normal",
  },
];

const BOTTLING_SUGGESTIONS: PhaseSuggestion[] = [
  {
    id: "k-meta",
    action: { name: "Add K-Meta", intervalDays: "", sortOrder: 0 },
    label: "K-Meta",
    reason: "Protects against oxidation and microbial spoilage",
    emphasis: "recommended",
  },
  {
    id: "sorbate",
    action: { name: "Add sorbate", intervalDays: "", sortOrder: 1 },
    label: "Sorbate",
    reason: "Prevents refermentation if backsweetening",
    emphasis: "normal",
  },
];

export function getSuggestionsForPhase(
  phaseSlug: string,
  context: SuggestionContext
): PhaseSuggestion[] {
  switch (phaseSlug) {
    case "primary":
      return PRIMARY_SUGGESTIONS(context);
    case "clearing":
      return CLEARING_SUGGESTIONS;
    case "aging":
      return AGING_SUGGESTIONS;
    case "bottling":
      return BOTTLING_SUGGESTIONS;
    default:
      return [];
  }
}
