"use client";

import { useState, useEffect, useCallback } from "react";

interface BatchSettingsProps {
  batchUuid: string;
}

const inputClass =
  "w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50";

interface BatchData {
  originalGravity: number | null;
  finalGravity: number | null;
  name: string;
  style: string | null;
  yeastStrain: string | null;
  targetVolume: number | null;
  targetVolumeUnit: string | null;
  notes: string | null;
}

export function BatchSettings({ batchUuid }: BatchSettingsProps) {
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [og, setOg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/batches/${batchUuid}`)
      .then((r) => r.json())
      .then((data) => {
        setBatch(data);
        setOg(data.originalGravity != null ? String(data.originalGravity) : "");
      })
      .catch(() => {});
  }, [batchUuid]);

  const handleSaveOg = useCallback(async () => {
    const value = og.trim() ? parseFloat(og) : null;
    if (og.trim() && (isNaN(value!) || value! < 0.9 || value! > 1.2)) return;

    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/v1/batches/${batchUuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalGravity: value }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }, [batchUuid, og]);

  if (!batch) {
    return (
      <div className="py-12 text-center text-sm text-parchment-700">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Original Gravity */}
      <div>
        <label htmlFor="og" className="block text-sm font-medium text-wine-800 mb-1">
          Original gravity
        </label>
        <p className="text-xs text-parchment-600 mb-2">
          Set or correct the starting gravity for this batch. Used for ABV calculation.
        </p>
        <div className="flex items-center gap-3">
          <input
            id="og"
            type="number"
            step="0.001"
            value={og}
            onChange={(e) => setOg(e.target.value)}
            onBlur={handleSaveOg}
            onKeyDown={(e) => e.key === "Enter" && handleSaveOg()}
            placeholder="1.090"
            className={inputClass + " max-w-[140px] font-mono text-lg"}
          />
          <span className="text-sm text-parchment-600">SG</span>
          {saving && <span className="text-xs text-parchment-600">Saving...</span>}
          {saved && <span className="text-xs text-[#5a8a5e]">Saved</span>}
        </div>
      </div>

      {/* Placeholder for future batch settings */}
      <div className="border-t border-parchment-300/60 pt-6">
        <p className="text-sm text-parchment-700">
          More batch settings coming soon — metadata editing, hydrometer assignment, export, and archiving.
        </p>
      </div>
    </div>
  );
}
