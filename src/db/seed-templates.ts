import type { ProtocolTemplateData } from "@/types";

export interface TemplateSeedData {
  name: string;
  description: string;
  category: "wine" | "beer" | "mead" | "cider" | "other";
  templateData: ProtocolTemplateData;
}

export const builtinTemplates: TemplateSeedData[] = [
  {
    name: "Kit Wine (Red)",
    description:
      "Standard 5-phase red wine kit protocol. Primary through bottling with typical temps and gravity targets.",
    category: "wine",
    templateData: {
      phases: [
        {
          name: "Primary",
          sortOrder: 0,
          expectedDurationDays: 7,
          targetTempLow: 68,
          targetTempHigh: 75,
          targetTempUnit: "F",
          completionCriteria: {
            type: "gravity_stable",
            consecutiveReadings: 3,
            toleranceSG: 0.002,
          },
          actions: [
            { name: "Punch down cap", intervalDays: 1, sortOrder: 0 },
          ],
        },
        {
          name: "Secondary",
          sortOrder: 1,
          expectedDurationDays: 14,
          targetTempLow: 65,
          targetTempHigh: 72,
          targetTempUnit: "F",
          completionCriteria: {
            type: "compound",
            criteria: [
              { type: "gravity_stable", consecutiveReadings: 3, toleranceSG: 0.002 },
              { type: "duration", minDays: 10 },
            ],
          },
          actions: [],
        },
        {
          name: "Clearing",
          sortOrder: 2,
          expectedDurationDays: 14,
          targetTempLow: 60,
          targetTempHigh: 68,
          targetTempUnit: "F",
          completionCriteria: { type: "duration", minDays: 14 },
          actions: [
            { name: "Add finings", sortOrder: 0 },
          ],
        },
        {
          name: "Stabilization",
          sortOrder: 3,
          expectedDurationDays: 3,
          targetTempLow: 60,
          targetTempHigh: 68,
          targetTempUnit: "F",
          completionCriteria: { type: "duration", minDays: 3 },
          actions: [
            { name: "Stabilize (sorbate + meta)", sortOrder: 0 },
            { name: "Degas", sortOrder: 1 },
          ],
        },
        {
          name: "Bottling",
          sortOrder: 4,
          completionCriteria: { type: "manual" },
          actions: [],
        },
      ],
    },
  },
  {
    name: "Kit Wine (White)",
    description:
      "Standard 5-phase white wine kit protocol. Same structure as red, lower fermentation temps.",
    category: "wine",
    templateData: {
      phases: [
        {
          name: "Primary",
          sortOrder: 0,
          expectedDurationDays: 7,
          targetTempLow: 60,
          targetTempHigh: 68,
          targetTempUnit: "F",
          completionCriteria: {
            type: "gravity_stable",
            consecutiveReadings: 3,
            toleranceSG: 0.002,
          },
          actions: [],
        },
        {
          name: "Secondary",
          sortOrder: 1,
          expectedDurationDays: 14,
          targetTempLow: 58,
          targetTempHigh: 65,
          targetTempUnit: "F",
          completionCriteria: {
            type: "compound",
            criteria: [
              { type: "gravity_stable", consecutiveReadings: 3, toleranceSG: 0.002 },
              { type: "duration", minDays: 10 },
            ],
          },
          actions: [],
        },
        {
          name: "Clearing",
          sortOrder: 2,
          expectedDurationDays: 14,
          targetTempLow: 55,
          targetTempHigh: 62,
          targetTempUnit: "F",
          completionCriteria: { type: "duration", minDays: 14 },
          actions: [
            { name: "Add finings", sortOrder: 0 },
          ],
        },
        {
          name: "Stabilization",
          sortOrder: 3,
          expectedDurationDays: 3,
          targetTempLow: 55,
          targetTempHigh: 62,
          targetTempUnit: "F",
          completionCriteria: { type: "duration", minDays: 3 },
          actions: [
            { name: "Stabilize (sorbate + meta)", sortOrder: 0 },
            { name: "Degas", sortOrder: 1 },
          ],
        },
        {
          name: "Bottling",
          sortOrder: 4,
          completionCriteria: { type: "manual" },
          actions: [],
        },
      ],
    },
  },
  {
    name: "Simple Beer (Ale)",
    description:
      "Basic 3-phase ale protocol. Primary fermentation, conditioning, then packaging.",
    category: "beer",
    templateData: {
      phases: [
        {
          name: "Primary",
          sortOrder: 0,
          expectedDurationDays: 7,
          targetTempLow: 65,
          targetTempHigh: 72,
          targetTempUnit: "F",
          completionCriteria: {
            type: "gravity_stable",
            consecutiveReadings: 2,
            toleranceSG: 0.002,
          },
          actions: [],
        },
        {
          name: "Conditioning",
          sortOrder: 1,
          expectedDurationDays: 7,
          targetTempLow: 65,
          targetTempHigh: 72,
          targetTempUnit: "F",
          completionCriteria: { type: "duration", minDays: 7 },
          actions: [],
        },
        {
          name: "Packaging",
          sortOrder: 2,
          completionCriteria: { type: "manual" },
          actions: [],
        },
      ],
    },
  },
];
