"use client";

import { useState, useEffect } from "react";
import type { BatchWithComputed } from "@/types";
import type { PhaseInput } from "./StepProtocol";

interface StepConnectProps {
  basics: {
    name: string;
    style: string;
    targetVolume: string;
    targetVolumeUnit: string;
    yeastStrain: string;
    originalGravity: string;
    notes: string;
  };
  phases: PhaseInput[];
  parentBatchIds: string[];
  onParentBatchIdsChange: (ids: string[]) => void;
}

export function StepConnect({
  basics,
  phases,
  parentBatchIds,
  onParentBatchIdsChange,
}: StepConnectProps) {
  const [batches, setBatches] = useState<BatchWithComputed[]>([]);

  useEffect(() => {
    fetch("/api/v1/batches")
      .then((r) => r.json())
      .then(setBatches)
      .catch(() => {});
  }, []);

  function toggleParent(uuid: string) {
    if (parentBatchIds.includes(uuid)) {
      onParentBatchIdsChange(parentBatchIds.filter((id) => id !== uuid));
    } else {
      onParentBatchIdsChange([...parentBatchIds, uuid]);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Hydrometer */}
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">
          Hydrometer
        </label>
        <div className="rounded-md border border-dashed border-parchment-400 bg-parchment-100 px-4 py-3">
          <p className="text-sm text-parchment-600">
            Available after device setup. For now, log readings manually.
          </p>
        </div>
      </div>

      {/* Parent batches */}
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">
          Parent batches
        </label>
        <p className="text-xs text-parchment-600 mb-2">
          Link this batch to others — useful for blends or second-run ferments.
        </p>
        {batches.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {batches.map((b) => (
              <label key={b.uuid} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={parentBatchIds.includes(b.uuid)}
                  onChange={() => toggleParent(b.uuid)}
                  className="accent-wine-500"
                />
                <span className="text-wine-800">{b.name}</span>
                {b.style && (
                  <span className="text-xs text-parchment-600">{b.style}</span>
                )}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-parchment-600">No existing batches to link to.</p>
        )}
      </div>

      {/* Review summary */}
      <div>
        <p className="text-sm font-medium text-wine-800 mb-2">Review</p>
        <div className="rounded-md border border-parchment-300/80 bg-parchment-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-parchment-700">Name</span>
            <span className="font-medium text-wine-800">{basics.name || "—"}</span>
          </div>
          {basics.style && (
            <div className="flex justify-between">
              <span className="text-parchment-700">Style</span>
              <span className="text-wine-800">{basics.style}</span>
            </div>
          )}
          {basics.targetVolume && (
            <div className="flex justify-between">
              <span className="text-parchment-700">Volume</span>
              <span className="font-mono text-wine-800">
                {basics.targetVolume} {basics.targetVolumeUnit}
              </span>
            </div>
          )}
          {basics.yeastStrain && (
            <div className="flex justify-between">
              <span className="text-parchment-700">Yeast</span>
              <span className="text-wine-800">{basics.yeastStrain}</span>
            </div>
          )}
          {basics.originalGravity && (
            <div className="flex justify-between">
              <span className="text-parchment-700">OG</span>
              <span className="font-mono text-wine-800">{basics.originalGravity} SG</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-parchment-700">Phases</span>
            <span className="text-wine-800">
              {phases.length > 0
                ? phases.map((p) => p.name).filter(Boolean).join(" → ")
                : "None"}
            </span>
          </div>
          {parentBatchIds.length > 0 && (
            <div className="flex justify-between">
              <span className="text-parchment-700">Parents</span>
              <span className="text-wine-800">{parentBatchIds.length} linked</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
