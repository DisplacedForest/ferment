"use client";

import { useState, useEffect, useRef } from "react";
import type { ProtocolTemplate, ProtocolPhaseTemplate, CompletionCriteria, CompletionCriteriaType } from "@/types";
import {
  getStandardPhases,
  type StandardPhaseDefinition,
} from "@/lib/default-phases";
import { getSuggestionsForPhase, type PhaseSuggestion } from "@/lib/phase-suggestions";
import { getStyleCategory } from "@/lib/reference-data";

export interface ActionInput {
  name: string;
  intervalDays: string;
  sortOrder: number;
  triggerType?: "time" | "gravity";
  triggerGravity?: number;
  triggerAttenuationFraction?: number;
  dueAfterHours?: number;
}

interface PhaseInput {
  name: string;
  sortOrder: number;
  expectedDurationDays: string;
  targetTempLow: string;
  targetTempHigh: string;
  targetTempUnit: "F" | "C";
  completionCriteria: CompletionCriteria | null;
  actions: ActionInput[];
}

type ProtocolMode = "standard" | "custom";

interface WineContext {
  style: string;
  yeastStrain: string;
}

interface StepProtocolProps {
  phases: PhaseInput[];
  onPhasesChange: (phases: PhaseInput[]) => void;
  protocolMode: ProtocolMode;
  onProtocolModeChange: (mode: ProtocolMode) => void;
  wineContext?: WineContext;
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
      triggerType: a.triggerType,
      triggerGravity: a.triggerGravity,
      triggerAttenuationFraction: a.triggerAttenuationFraction,
      dueAfterHours: a.dueAfterHours,
    })),
  };
}

function standardPhaseToInput(p: StandardPhaseDefinition): PhaseInput {
  return templatePhaseToInput(p);
}

function criteriaLabel(criteria: CompletionCriteria | null): string {
  if (!criteria) return "None";
  switch (criteria.type) {
    case "gravity_stable":
      if (criteria.stableDurationHours) {
        return `Gravity stable for ${criteria.stableDurationHours}h (within ${criteria.toleranceSG} SG)`;
      }
      return `Gravity stable (${criteria.consecutiveReadings} readings within ${criteria.toleranceSG} SG)`;
    case "gravity_reached":
      if (criteria.attenuationFraction != null) {
        return `${Math.round(criteria.attenuationFraction * 100)}% attenuation reached`;
      }
      if (criteria.targetGravity != null) {
        return `Gravity reaches ${criteria.targetGravity.toFixed(3)} SG`;
      }
      return "Gravity target reached";
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

export function actionTriggerLabel(action: ActionInput): string {
  if (action.triggerType === "gravity" && action.triggerAttenuationFraction) {
    return `at ${Math.round(action.triggerAttenuationFraction * 100)}% attenuation`;
  }
  if (action.triggerType === "gravity" && action.triggerGravity) {
    return `at ${action.triggerGravity.toFixed(3)} SG`;
  }
  if (action.dueAfterHours) {
    return `${action.dueAfterHours}h after phase start`;
  }
  if (action.intervalDays) {
    return `every ${action.intervalDays} days`;
  }
  return "one-time";
}

/** Derive wine type from style category string */
function inferWineType(style: string): "red" | "white" {
  const category = getStyleCategory(style);
  if (category?.includes("White") || category?.includes("Rosé")) return "white";
  return "red";
}

// ── Standard Mode ──────────────────────────────────────────────────────────

/** Each item in the unified ordered phase list */
type PhaseItem =
  | { kind: "standard"; slug: string; enabled: boolean }
  | { kind: "custom"; id: string; phase: PhaseInput };

let _nextCustomId = 0;
function nextCustomId() {
  return `custom-${_nextCustomId++}`;
}

function StandardMode({
  onPhasesChange,
  onSwitchToCustom,
  wineContext,
}: {
  onPhasesChange: (phases: PhaseInput[]) => void;
  onSwitchToCustom: () => void;
  wineContext?: WineContext;
}) {
  const inferredType = wineContext?.style ? inferWineType(wineContext.style) : "red";
  const [wineType, setWineType] = useState<"red" | "white">(inferredType);

  // All phases in display order. Standard phases are always present with enabled flag.
  const [items, setItems] = useState<PhaseItem[]>(() => {
    const phases = getStandardPhases(inferredType);
    return phases.map((p) => ({
      kind: "standard" as const,
      slug: p.slug,
      enabled: !p.optional || p.slug === "secondary",
    }));
  });

  // Per-phase user-added actions keyed by slug or custom id
  const [phaseActions, setPhaseActions] = useState<Record<string, ActionInput[]>>({});
  // Per-phase user-overridden criteria keyed by slug
  const [phaseCriteria, setPhaseCriteria] = useState<Record<string, CompletionCriteria>>({});

  // Add-phase form
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseCriteria, setNewPhaseCriteria] = useState<CompletionCriteria>({ type: "manual" });

  // Drag state
  const dragIndexRef = useRef<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ index: number; half: "top" | "bottom" } | null>(null);

  // Ref to avoid onPhasesChange in effect deps
  const onPhasesChangeRef = useRef(onPhasesChange);
  onPhasesChangeRef.current = onPhasesChange;
  const lastSyncRef = useRef("");

  const standardPhases = getStandardPhases(wineType);
  const standardBySlug = new Map(standardPhases.map((p) => [p.slug, p]));
  const suggestionCtx = { wineType, yeastStrain: wineContext?.yeastStrain };

  const enabledCount = items.filter(
    (i) => (i.kind === "standard" && i.enabled) || i.kind === "custom"
  ).length;

  // Sync enabled items to parent
  useEffect(() => {
    let sortOrder = 0;
    const output: PhaseInput[] = [];
    for (const item of items) {
      if (item.kind === "standard") {
        if (!item.enabled) continue;
        const def = standardBySlug.get(item.slug);
        if (!def) continue;
        const base = standardPhaseToInput(def);
        const userActions = phaseActions[item.slug] ?? [];
        const userCriteria = phaseCriteria[item.slug];
        output.push({
          ...base,
          sortOrder: sortOrder++,
          actions: [...base.actions, ...userActions],
          completionCriteria: userCriteria ?? base.completionCriteria,
        });
      } else {
        output.push({ ...item.phase, sortOrder: sortOrder++ });
      }
    }

    const json = JSON.stringify(output);
    if (json !== lastSyncRef.current) {
      lastSyncRef.current = json;
      onPhasesChangeRef.current(output);
    }
  }, [items, phaseActions, phaseCriteria, wineType]); // eslint-disable-line react-hooks/exhaustive-deps

  // External wine type change from style picker
  useEffect(() => {
    if (wineContext?.style) {
      const newType = inferWineType(wineContext.style);
      if (newType !== wineType) setWineType(newType);
    }
  }, [wineContext?.style]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild standard items when wine type changes
  useEffect(() => {
    setItems((prev) => {
      const newStandard = getStandardPhases(wineType);
      const newSlugs = new Set(newStandard.map((p) => p.slug));
      const prevEnabledSlugs = new Set(
        prev.filter((i): i is PhaseItem & { kind: "standard" } => i.kind === "standard" && i.enabled).map((i) => i.slug)
      );

      // Keep custom items, drop invalid standard slugs
      const kept = prev.filter((i) => i.kind === "custom" || newSlugs.has(i.slug));
      const presentSlugs = new Set(
        kept.filter((i): i is PhaseItem & { kind: "standard" } => i.kind === "standard").map((i) => i.slug)
      );

      // Add missing standard phases at the end
      const toAdd: PhaseItem[] = newStandard
        .filter((p) => !presentSlugs.has(p.slug))
        .map((p) => ({
          kind: "standard" as const,
          slug: p.slug,
          enabled: prevEnabledSlugs.has(p.slug) || (!p.optional || p.slug === "secondary"),
        }));

      return [...kept, ...toAdd];
    });
  }, [wineType]);

  function toggleEnabled(slug: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.kind === "standard" && item.slug === slug
          ? { ...item, enabled: !item.enabled }
          : item
      )
    );
  }

  function addSuggestion(slug: string, suggestion: PhaseSuggestion) {
    setPhaseActions((prev) => {
      const existing = prev[slug] ?? [];
      if (existing.some((a) => a.name === suggestion.action.name)) return prev;
      return { ...prev, [slug]: [...existing, { ...suggestion.action, sortOrder: existing.length }] };
    });
  }

  function removeAction(slug: string, actionIndex: number) {
    setPhaseActions((prev) => ({
      ...prev,
      [slug]: (prev[slug] ?? []).filter((_, i) => i !== actionIndex),
    }));
  }

  function isActionAdded(slug: string, suggestionId: string, suggestions: PhaseSuggestion[]): boolean {
    const existing = phaseActions[slug] ?? [];
    const suggestion = suggestions.find((s) => s.id === suggestionId);
    return suggestion ? existing.some((a) => a.name === suggestion.action.name) : false;
  }

  function updatePhaseCriteriaForSlug(slug: string, criteria: CompletionCriteria) {
    setPhaseCriteria((prev) => ({ ...prev, [slug]: criteria }));
  }

  function addCustomPhase() {
    if (!newPhaseName.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        kind: "custom",
        id: nextCustomId(),
        phase: {
          name: newPhaseName.trim(),
          sortOrder: 0,
          expectedDurationDays: "",
          targetTempLow: "",
          targetTempHigh: "",
          targetTempUnit: "F",
          completionCriteria: newPhaseCriteria,
          actions: [],
        },
      },
    ]);
    setNewPhaseName("");
    setNewPhaseCriteria({ type: "manual" });
    setShowAddPhase(false);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Reorder ──

  function moveItem(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
      next.splice(insertAt, 0, moved);
      return next;
    });
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  // ── Drag handlers ──

  function handleDragStart(e: React.DragEvent, index: number) {
    dragIndexRef.current = index;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndexRef.current == null || dragIndexRef.current === index) {
      setDropIndicator(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const half = e.clientY < rect.top + rect.height / 2 ? "top" : "bottom";
    setDropIndicator({ index, half });
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from == null || from === index) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;
    const to = insertBefore ? index : index + 1;

    moveItem(from, to);
    dragIndexRef.current = null;
    setDraggedIndex(null);
    setDropIndicator(null);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDraggedIndex(null);
    setDropIndicator(null);
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-2">Wine type</label>
        <div className="flex gap-2">
          {(["red", "white"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setWineType(type)}
              className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                wineType === type
                  ? "bg-wine-500 text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)]"
                  : "border border-parchment-300/80 text-parchment-700 hover:border-parchment-400 hover:text-wine-600"
              }`}
            >
              {type === "red" ? "Red wine" : "White wine"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-wine-800 mb-3">
          Phases ({enabledCount})
        </p>

        <div className="space-y-1.5">
          {items.map((item, index) => {
            const isDragging = draggedIndex === index;
            const showTopLine = dropIndicator?.index === index && dropIndicator.half === "top";
            const showBottomLine = dropIndicator?.index === index && dropIndicator.half === "bottom";
            const key = item.kind === "standard" ? item.slug : item.id;

            if (item.kind === "standard") {
              const def = standardBySlug.get(item.slug);
              if (!def) return null;

              // ── Disabled optional phase: compact row ──
              if (!item.enabled) {
                return (
                  <div
                    key={key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative rounded-md border border-dashed border-parchment-300/50 bg-parchment-100/50 px-4 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing transition-opacity ${
                      isDragging ? "opacity-30" : "opacity-60 hover:opacity-80"
                    }`}
                  >
                    {showTopLine && <div className="absolute inset-x-0 top-0 h-0.5 bg-wine-400 rounded-full -translate-y-1" />}
                    <div className="flex items-center gap-2">
                      <span className="text-parchment-400/50 select-none text-xs" aria-hidden="true">⠿</span>
                      <p className="text-xs text-parchment-600">{def.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleEnabled(item.slug)}
                      className="shrink-0 rounded px-2.5 py-0.5 text-xs font-medium bg-parchment-200 text-parchment-600 hover:bg-parchment-300 transition-colors"
                    >
                      Off
                    </button>
                    {showBottomLine && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-wine-400 rounded-full translate-y-1" />}
                  </div>
                );
              }

              // ── Enabled standard phase: full card ──
              const userActions = phaseActions[item.slug] ?? [];
              const effectiveCriteria = phaseCriteria[item.slug] ?? def.completionCriteria ?? null;
              const suggestions = getSuggestionsForPhase(item.slug, suggestionCtx);

              return (
                <div
                  key={key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative rounded-md border border-parchment-300/80 bg-parchment-50 px-4 py-3 cursor-grab active:cursor-grabbing transition-opacity ${
                    isDragging ? "opacity-30" : ""
                  }`}
                >
                  {showTopLine && <div className="absolute inset-x-0 top-0 h-0.5 bg-wine-400 rounded-full -translate-y-1" />}

                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-parchment-400/60 mt-0.5 select-none text-sm leading-none" aria-hidden="true">⠿</span>
                      <div className="min-w-0">
                        <p className="font-display text-sm text-wine-800">{def.name}</p>
                        <p className="mt-0.5 text-xs text-parchment-700">{def.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      {/* Move up/down */}
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="text-parchment-400 hover:text-wine-600 disabled:opacity-30 disabled:cursor-default leading-none text-[10px] px-0.5"
                          aria-label="Move up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(index)}
                          disabled={index === items.length - 1}
                          className="text-parchment-400 hover:text-wine-600 disabled:opacity-30 disabled:cursor-default leading-none text-[10px] px-0.5"
                          aria-label="Move down"
                        >
                          ▼
                        </button>
                      </div>
                      {def.optional && (
                        <button
                          type="button"
                          onClick={() => toggleEnabled(item.slug)}
                          className="rounded px-2.5 py-1 text-xs font-medium bg-wine-100 text-wine-700 hover:bg-wine-200 transition-colors"
                        >
                          On
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 space-y-2 pl-6">
                    {/* Criteria */}
                    {def.allowedCriteriaTypes ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-parchment-600 uppercase tracking-wide">Completion:</span>
                        <select
                          value={effectiveCriteria?.type ?? "manual"}
                          onChange={(e) => {
                            const t = e.target.value as CompletionCriteriaType;
                            if (t === "duration") {
                              updatePhaseCriteriaForSlug(item.slug, { type: "duration", minDays: 90 });
                            } else {
                              updatePhaseCriteriaForSlug(item.slug, { type: "manual" });
                            }
                          }}
                          className="rounded border border-parchment-400 bg-parchment-50 px-2 py-0.5 text-xs text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
                        >
                          {def.allowedCriteriaTypes.map((ct) => (
                            <option key={ct} value={ct}>
                              {ct === "manual" ? "Manual" : ct === "duration" ? "Duration" : ct}
                            </option>
                          ))}
                        </select>
                        {effectiveCriteria?.type === "duration" && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={(effectiveCriteria as { minDays: number }).minDays}
                              onChange={(e) =>
                                updatePhaseCriteriaForSlug(item.slug, {
                                  type: "duration",
                                  minDays: parseInt(e.target.value) || 90,
                                })
                              }
                              className="w-16 rounded border border-parchment-400 bg-parchment-50 px-2 py-0.5 text-xs font-mono text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
                              min={1}
                            />
                            <span className="text-[10px] text-parchment-600">days</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-parchment-600 uppercase tracking-wide">
                        {criteriaLabel(effectiveCriteria)}
                      </p>
                    )}

                    {/* Temp range */}
                    {def.targetTempLow != null && def.targetTempHigh != null && (
                      <p className="font-mono text-xs text-parchment-600">
                        {def.targetTempLow}–{def.targetTempHigh}°{def.targetTempUnit ?? "F"}
                      </p>
                    )}

                    {/* User-added actions */}
                    {userActions.length > 0 && (
                      <div className="space-y-0.5">
                        {userActions.map((a, ai) => (
                          <div key={ai} className="flex items-center gap-1.5 text-xs">
                            <span className="text-wine-700">{a.name}</span>
                            <span className="text-parchment-500">{actionTriggerLabel(a)}</span>
                            <button
                              type="button"
                              onClick={() => removeAction(item.slug, ai)}
                              className="text-parchment-400 hover:text-[#a04040] ml-1"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggestion chips */}
                    {suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {suggestions.map((s) => {
                          const added = isActionAdded(item.slug, s.id, suggestions);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => !added && addSuggestion(item.slug, s)}
                              disabled={added}
                              title={s.reason}
                              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                added
                                  ? "bg-parchment-200 text-parchment-500 cursor-default line-through"
                                  : s.emphasis === "recommended"
                                    ? "bg-wine-50 text-wine-700 border border-wine-200 hover:bg-wine-100"
                                    : "bg-parchment-100 text-parchment-700 border border-parchment-300/60 hover:bg-parchment-200"
                              }`}
                            >
                              {added ? "\u2713 " : "+ "}
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {showBottomLine && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-wine-400 rounded-full translate-y-1" />}
                </div>
              );
            }

            // ── Custom phase card ──
            return (
              <div
                key={key}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative rounded-md border border-parchment-300/80 bg-parchment-50 px-4 py-3 cursor-grab active:cursor-grabbing transition-opacity ${
                  isDragging ? "opacity-30" : ""
                }`}
              >
                {showTopLine && <div className="absolute inset-x-0 top-0 h-0.5 bg-wine-400 rounded-full -translate-y-1" />}

                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className="text-parchment-400/60 mt-0.5 select-none text-sm leading-none" aria-hidden="true">⠿</span>
                    <div>
                      <p className="font-display text-sm text-wine-800">{item.phase.name}</p>
                      <p className="mt-0.5 text-[10px] text-parchment-600 uppercase tracking-wide">
                        {criteriaLabel(item.phase.completionCriteria)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="text-parchment-400 hover:text-wine-600 disabled:opacity-30 disabled:cursor-default leading-none text-[10px] px-0.5"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === items.length - 1}
                        className="text-parchment-400 hover:text-wine-600 disabled:opacity-30 disabled:cursor-default leading-none text-[10px] px-0.5"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-xs text-parchment-400 hover:text-[#a04040]"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                {showBottomLine && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-wine-400 rounded-full translate-y-1" />}
              </div>
            );
          })}
        </div>

        {/* Add custom phase */}
        {showAddPhase ? (
          <div className="rounded-md border border-dashed border-parchment-400 bg-parchment-100/50 px-4 py-3 mt-2 space-y-2">
            <div>
              <label className="block text-xs text-parchment-700 mb-1">Phase name</label>
              <input
                type="text"
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                className={inputClass}
                placeholder="e.g. Extended Maceration"
                autoFocus
              />
            </div>
            <CriteriaBuilder
              criteria={newPhaseCriteria}
              onChange={(c) => setNewPhaseCriteria(c ?? { type: "manual" })}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addCustomPhase}
                disabled={!newPhaseName.trim()}
                className="rounded bg-wine-500 px-3 py-1 text-xs font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 disabled:opacity-50"
              >
                Add phase
              </button>
              <button
                type="button"
                onClick={() => { setShowAddPhase(false); setNewPhaseName(""); }}
                className="rounded px-3 py-1 text-xs text-parchment-600 hover:text-wine-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddPhase(true)}
            className="text-sm text-wine-600 hover:text-wine-700 mt-2"
          >
            + Add custom phase
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onSwitchToCustom}
        className="text-xs text-parchment-600 hover:text-wine-600 transition-colors"
      >
        Need more control? Switch to custom mode
      </button>
    </div>
  );
}

// ── Custom Mode ────────────────────────────────────────────────────────────

function CustomMode({
  phases,
  onPhasesChange,
  onSwitchToStandard,
}: {
  phases: PhaseInput[];
  onPhasesChange: (phases: PhaseInput[]) => void;
  onSwitchToStandard: () => void;
}) {
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
      onPhasesChange(template.templateData.phases.map(templatePhaseToInput));
    }
  }

  function updatePhase(index: number, field: string, value: string) {
    const updated = [...phases];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[index] as any)[field] = value;
    onPhasesChange(updated);
  }

  function updatePhaseCriteria(index: number, criteria: CompletionCriteria | null) {
    const updated = [...phases];
    updated[index] = { ...updated[index], completionCriteria: criteria };
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
    (updated[phaseIndex].actions[actionIndex] as unknown as Record<string, unknown>)[field] = value;
    onPhasesChange(updated);
  }

  function removeAction(phaseIndex: number, actionIndex: number) {
    const updated = [...phases];
    updated[phaseIndex].actions = updated[phaseIndex].actions.filter(
      (_, i) => i !== actionIndex
    );
    onPhasesChange(updated);
  }

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

                  {/* Completion Criteria Builder */}
                  <CriteriaBuilder
                    criteria={phase.completionCriteria}
                    onChange={(c) => updatePhaseCriteria(i, c)}
                  />

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

      <button
        type="button"
        onClick={onSwitchToStandard}
        className="text-xs text-parchment-600 hover:text-wine-600 transition-colors"
      >
        Use standard wine phases instead
      </button>
    </div>
  );
}

// ── Criteria Builder ───────────────────────────────────────────────────────

function CriteriaBuilder({
  criteria,
  onChange,
}: {
  criteria: CompletionCriteria | null;
  onChange: (c: CompletionCriteria | null) => void;
}) {
  const type = criteria?.type ?? "manual";

  function handleTypeChange(newType: string) {
    switch (newType) {
      case "gravity_stable":
        onChange({ type: "gravity_stable", consecutiveReadings: 3, toleranceSG: 0.002, stableDurationHours: 24 });
        break;
      case "gravity_reached":
        onChange({ type: "gravity_reached", attenuationFraction: 0.333 });
        break;
      case "duration":
        onChange({ type: "duration", minDays: 14 });
        break;
      case "manual":
        onChange({ type: "manual" });
        break;
      default:
        onChange({ type: "manual" });
    }
  }

  return (
    <div>
      <label className="block text-xs text-parchment-700 mb-1">Completion criteria</label>
      <select
        value={type}
        onChange={(e) => handleTypeChange(e.target.value)}
        className={inputClass + " mb-2"}
      >
        <option value="manual">Manual advancement</option>
        <option value="gravity_stable">Gravity stable</option>
        <option value="gravity_reached">Gravity reached</option>
        <option value="duration">Duration elapsed</option>
      </select>

      {/* Criteria-specific fields */}
      {criteria?.type === "gravity_stable" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-parchment-600 mb-0.5">Min readings</label>
              <input
                type="number"
                value={criteria.consecutiveReadings}
                onChange={(e) =>
                  onChange({ ...criteria, consecutiveReadings: parseInt(e.target.value) || 3 })
                }
                className={smallInputClass + " w-full"}
                min={2}
              />
            </div>
            <div>
              <label className="block text-[10px] text-parchment-600 mb-0.5">Tolerance (SG)</label>
              <input
                type="number"
                step="0.001"
                value={criteria.toleranceSG}
                onChange={(e) =>
                  onChange({ ...criteria, toleranceSG: parseFloat(e.target.value) || 0.002 })
                }
                className={smallInputClass + " w-full"}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-parchment-600 mb-0.5">
              Stable window (hours) <span className="text-parchment-500">— optional</span>
            </label>
            <input
              type="number"
              value={criteria.stableDurationHours ?? ""}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : undefined;
                onChange({ ...criteria, stableDurationHours: val });
              }}
              className={smallInputClass + " w-full"}
              placeholder="e.g. 24"
              min={1}
            />
          </div>
        </div>
      )}

      {criteria?.type === "gravity_reached" && (
        <div className="space-y-2">
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="gravity-mode"
                checked={criteria.attenuationFraction != null}
                onChange={() => onChange({ type: "gravity_reached", attenuationFraction: 0.333 })}
                className="accent-wine-500"
              />
              <span className="text-parchment-700">Attenuation fraction</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="gravity-mode"
                checked={criteria.targetGravity != null}
                onChange={() => onChange({ type: "gravity_reached", targetGravity: 1.010 })}
                className="accent-wine-500"
              />
              <span className="text-parchment-700">Specific gravity</span>
            </label>
          </div>

          {criteria.attenuationFraction != null && (
            <select
              value={criteria.attenuationFraction}
              onChange={(e) =>
                onChange({ type: "gravity_reached", attenuationFraction: parseFloat(e.target.value) })
              }
              className={inputClass}
            >
              <option value={0.25}>1/4 sugar break (25%)</option>
              <option value={0.333}>1/3 sugar break (33%)</option>
              <option value={0.5}>1/2 sugar break (50%)</option>
              <option value={0.667}>2/3 sugar break (67%)</option>
              <option value={0.75}>3/4 sugar break (75%)</option>
            </select>
          )}

          {criteria.targetGravity != null && (
            <div>
              <label className="block text-[10px] text-parchment-600 mb-0.5">Target SG</label>
              <input
                type="number"
                step="0.001"
                value={criteria.targetGravity}
                onChange={(e) =>
                  onChange({ type: "gravity_reached", targetGravity: parseFloat(e.target.value) || 1.010 })
                }
                className={smallInputClass + " w-full"}
              />
            </div>
          )}
        </div>
      )}

      {criteria?.type === "duration" && (
        <div>
          <label className="block text-[10px] text-parchment-600 mb-0.5">Minimum days</label>
          <input
            type="number"
            value={criteria.minDays}
            onChange={(e) =>
              onChange({ type: "duration", minDays: parseInt(e.target.value) || 14 })
            }
            className={smallInputClass + " w-full"}
            min={1}
          />
        </div>
      )}

      <p className="mt-1 text-[10px] text-parchment-500">
        {criteriaLabel(criteria)}
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function StepProtocol({
  phases,
  onPhasesChange,
  protocolMode,
  onProtocolModeChange,
  wineContext,
}: StepProtocolProps) {
  return (
    <div>
      {/* Mode toggle */}
      <div className="mb-5 flex gap-1 rounded border border-parchment-300/80 p-0.5 max-w-xs">
        {(["standard", "custom"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onProtocolModeChange(mode)}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              protocolMode === mode
                ? "bg-wine-500 text-parchment-100"
                : "text-parchment-700 hover:text-wine-600"
            }`}
          >
            {mode === "standard" ? "Standard" : "Custom"}
          </button>
        ))}
      </div>

      {protocolMode === "standard" ? (
        <StandardMode
          onPhasesChange={onPhasesChange}
          onSwitchToCustom={() => onProtocolModeChange("custom")}
          wineContext={wineContext}
        />
      ) : (
        <CustomMode
          phases={phases}
          onPhasesChange={onPhasesChange}
          onSwitchToStandard={() => onProtocolModeChange("standard")}
        />
      )}
    </div>
  );
}

export type { PhaseInput, ProtocolMode };
