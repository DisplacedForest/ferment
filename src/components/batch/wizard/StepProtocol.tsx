"use client";

import { useState, useEffect } from "react";
import type { ProtocolTemplate, ProtocolPhaseTemplate, CompletionCriteria } from "@/types";

interface PhaseInput {
  name: string;
  sortOrder: number;
  expectedDurationDays: string;
  targetTempLow: string;
  targetTempHigh: string;
  targetTempUnit: "F" | "C";
  completionCriteria: CompletionCriteria | null;
  actions: { name: string; intervalDays: string; sortOrder: number }[];
}

interface StepProtocolProps {
  phases: PhaseInput[];
  onPhasesChange: (phases: PhaseInput[]) => void;
}

const inputClass =
  "w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50";

const smallInputClass =
  "w-20 rounded-md border border-parchment-400 bg-parchment-50 px-2 py-1.5 text-sm text-wine-800 font-mono placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50";

function templatePhaseToInput(p: ProtocolPhaseTemplate): PhaseInput {
  return {
    name: p.name,
    sortOrder: p.sortOrder,
    expectedDurationDays: p.expectedDurationDays?.toString() ?? "",
    targetTempLow: p.targetTempLow?.toString() ?? "",
    targetTempHigh: p.targetTempHigh?.toString() ?? "",
    targetTempUnit: p.targetTempUnit ?? "F",
    completionCriteria: p.completionCriteria ?? null,
    actions: (p.actions ?? []).map((a) => ({
      name: a.name,
      intervalDays: a.intervalDays?.toString() ?? "",
      sortOrder: a.sortOrder,
    })),
  };
}

function criteriaLabel(criteria: CompletionCriteria | null): string {
  if (!criteria) return "None";
  switch (criteria.type) {
    case "gravity_stable":
      return `Gravity stable (${criteria.consecutiveReadings} readings within ${criteria.toleranceSG} SG)`;
    case "duration":
      return `${criteria.minDays} days elapsed`;
    case "action_count":
      return `${criteria.minCount}x ${criteria.actionName}`;
    case "manual":
      return "Manual advancement";
    case "compound":
      return criteria.criteria.map(criteriaLabel).join(" + ");
  }
}

export function StepProtocol({ phases, onPhasesChange }: StepProtocolProps) {
  const [templates, setTemplates] = useState<ProtocolTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/v1/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {});
  }, []);

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);

    if (templateId === "" || templateId === "scratch") {
      if (templateId === "scratch") {
        onPhasesChange([
          {
            name: "Primary",
            sortOrder: 0,
            expectedDurationDays: "",
            targetTempLow: "",
            targetTempHigh: "",
            targetTempUnit: "F",
            completionCriteria: { type: "manual" },
            actions: [],
          },
        ]);
      }
      return;
    }

    const template = templates.find((t) => t.id.toString() === templateId);
    if (template) {
      const data = template.templateData;
      onPhasesChange(data.phases.map(templatePhaseToInput));
    }
  }

  function updatePhase(index: number, field: string, value: string) {
    const updated = [...phases];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[index] as any)[field] = value;
    onPhasesChange(updated);
  }

  function removePhase(index: number) {
    const updated = phases.filter((_, i) => i !== index);
    updated.forEach((p, i) => (p.sortOrder = i));
    onPhasesChange(updated);
  }

  function addPhase() {
    onPhasesChange([
      ...phases,
      {
        name: "",
        sortOrder: phases.length,
        expectedDurationDays: "",
        targetTempLow: "",
        targetTempHigh: "",
        targetTempUnit: "F",
        completionCriteria: { type: "manual" },
        actions: [],
      },
    ]);
  }

  function addAction(phaseIndex: number) {
    const updated = [...phases];
    updated[phaseIndex].actions.push({
      name: "",
      intervalDays: "",
      sortOrder: updated[phaseIndex].actions.length,
    });
    onPhasesChange(updated);
  }

  function updateAction(
    phaseIndex: number,
    actionIndex: number,
    field: string,
    value: string
  ) {
    const updated = [...phases];
    (updated[phaseIndex].actions[actionIndex] as Record<string, unknown>)[field] = value;
    onPhasesChange(updated);
  }

  function removeAction(phaseIndex: number, actionIndex: number) {
    const updated = [...phases];
    updated[phaseIndex].actions = updated[phaseIndex].actions.filter(
      (_, i) => i !== actionIndex
    );
    onPhasesChange(updated);
  }

  // Group templates by category
  const grouped = templates.reduce<Record<string, ProtocolTemplate[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">
          Start from a template
        </label>
        <select
          value={selectedTemplateId}
          onChange={(e) => handleTemplateSelect(e.target.value)}
          className={inputClass}
        >
          <option value="">Choose a template...</option>
          <option value="scratch">Start from scratch</option>
          {Object.entries(grouped).map(([category, tmpls]) => (
            <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
              {tmpls.map((t) => (
                <option key={t.id} value={t.id.toString()}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {phases.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-wine-800">
            Phases ({phases.length})
          </p>

          {phases.map((phase, i) => (
            <div
              key={i}
              className="rounded-md border border-parchment-300/80 bg-parchment-50"
            >
              <button
                type="button"
                onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-medium text-wine-800">
                  <span className="font-mono text-xs text-parchment-700/80 mr-2">{i + 1}</span>
                  {phase.name || "Unnamed phase"}
                </span>
                <span className="text-xs text-parchment-700">
                  {phase.expectedDurationDays ? `${phase.expectedDurationDays}d` : ""}
                  {expandedPhase === i ? " \u25B4" : " \u25BE"}
                </span>
              </button>

              {expandedPhase === i && (
                <div className="border-t border-parchment-300/60 px-4 py-3 space-y-3">
                  <div>
                    <label className="block text-xs text-parchment-700 mb-1">Phase name</label>
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => updatePhase(i, "name", e.target.value)}
                      className={inputClass}
                      placeholder="Primary, Secondary..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-parchment-700 mb-1">Duration (days)</label>
                      <input
                        type="number"
                        value={phase.expectedDurationDays}
                        onChange={(e) => updatePhase(i, "expectedDurationDays", e.target.value)}
                        className={smallInputClass + " w-full"}
                        placeholder="7"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-parchment-700 mb-1">Temp low</label>
                      <input
                        type="number"
                        value={phase.targetTempLow}
                        onChange={(e) => updatePhase(i, "targetTempLow", e.target.value)}
                        className={smallInputClass + " w-full"}
                        placeholder="65"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-parchment-700 mb-1">Temp high</label>
                      <input
                        type="number"
                        value={phase.targetTempHigh}
                        onChange={(e) => updatePhase(i, "targetTempHigh", e.target.value)}
                        className={smallInputClass + " w-full"}
                        placeholder="75"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-parchment-700 mb-1">Completion criteria</label>
                    <p className="text-xs text-parchment-600">
                      {criteriaLabel(phase.completionCriteria)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-parchment-700">Actions</label>
                      <button
                        type="button"
                        onClick={() => addAction(i)}
                        className="text-xs text-wine-600 hover:text-wine-700"
                      >
                        + Add action
                      </button>
                    </div>
                    {phase.actions.map((action, ai) => (
                      <div key={ai} className="flex gap-2 mb-1.5">
                        <input
                          type="text"
                          value={action.name}
                          onChange={(e) => updateAction(i, ai, "name", e.target.value)}
                          className={inputClass + " flex-1"}
                          placeholder="Action name"
                        />
                        <input
                          type="number"
                          value={action.intervalDays}
                          onChange={(e) => updateAction(i, ai, "intervalDays", e.target.value)}
                          className={smallInputClass}
                          placeholder="days"
                          title="Repeat every N days (empty = one-time)"
                        />
                        <button
                          type="button"
                          onClick={() => removeAction(i, ai)}
                          className="text-xs text-parchment-500 hover:text-[#a04040] px-1"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => removePhase(i)}
                    className="text-xs text-parchment-500 hover:text-[#a04040]"
                  >
                    Remove this phase
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addPhase}
            className="text-sm text-wine-600 hover:text-wine-700"
          >
            + Add another phase
          </button>
        </div>
      )}

      {phases.length === 0 && (
        <div className="rounded-md border border-dashed border-parchment-400 py-8 text-center">
          <p className="text-sm text-parchment-700">
            Pick a template above or start from scratch.
          </p>
          <p className="mt-1 text-xs text-parchment-600">
            Phases are optional — you can always add them later.
          </p>
        </div>
      )}
    </div>
  );
}

export type { PhaseInput };
