"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type TempUnit = "F" | "C";
type VolumeUnit = "gal" | "L";
type GravityUnit = "SG" | "Brix" | "Plato";

export function WelcomeForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Auto-detect timezone
  const [timezone, setTimezone] = useState("UTC");
  const [editingTimezone, setEditingTimezone] = useState(false);

  const [tempUnit, setTempUnit] = useState<TempUnit>("F");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("gal");
  const [gravityUnit, setGravityUnit] = useState<GravityUnit>("SG");

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {
      // Fall back to UTC
    }
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "user.timezone": timezone,
          "user.tempUnit": tempUnit,
          "user.volumeUnit": volumeUnit,
          "user.gravityUnit": gravityUnit,
          "onboarding.complete": "true",
        }),
      });
      router.push("/");
    } catch {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    try {
      await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "onboarding.complete": "true",
        }),
      });
      router.push("/");
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">
          Timezone
        </label>
        {!editingTimezone ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-wine-800">{timezone}</span>
            <button
              type="button"
              onClick={() => setEditingTimezone(true)}
              className="text-xs text-parchment-600 hover:text-wine-600 transition-colors"
            >
              Change
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            onBlur={() => setEditingTimezone(false)}
            placeholder="America/New_York"
            className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 font-mono text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
            autoFocus
          />
        )}
        <p className="text-xs text-parchment-600 mt-1">
          Used for daily recap timing
        </p>
      </div>

      {/* Temperature unit */}
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-2">
          Temperature
        </label>
        <div className="flex gap-2">
          {(["F", "C"] as TempUnit[]).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => setTempUnit(unit)}
              className={`rounded border px-4 py-1.5 text-sm font-medium transition-colors ${
                tempUnit === unit
                  ? "border-wine-400 bg-wine-50 text-wine-700 shadow-[0_1px_2px_rgba(46,14,29,0.06)]"
                  : "border-parchment-300/80 text-parchment-700 hover:border-parchment-400"
              }`}
            >
              {unit === "F" ? "Fahrenheit" : "Celsius"}
            </button>
          ))}
        </div>
      </div>

      {/* Volume unit */}
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-2">
          Volume
        </label>
        <div className="flex gap-2">
          {(["gal", "L"] as VolumeUnit[]).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => setVolumeUnit(unit)}
              className={`rounded border px-4 py-1.5 text-sm font-medium transition-colors ${
                volumeUnit === unit
                  ? "border-wine-400 bg-wine-50 text-wine-700 shadow-[0_1px_2px_rgba(46,14,29,0.06)]"
                  : "border-parchment-300/80 text-parchment-700 hover:border-parchment-400"
              }`}
            >
              {unit === "gal" ? "Gallons" : "Liters"}
            </button>
          ))}
        </div>
      </div>

      {/* Gravity unit */}
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-2">
          Gravity display
        </label>
        <div className="flex gap-2">
          {(["SG", "Brix", "Plato"] as GravityUnit[]).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => setGravityUnit(unit)}
              className={`rounded border px-4 py-1.5 text-sm font-medium transition-colors ${
                gravityUnit === unit
                  ? "border-wine-400 bg-wine-50 text-wine-700 shadow-[0_1px_2px_rgba(46,14,29,0.06)]"
                  : "border-parchment-300/80 text-parchment-700 hover:border-parchment-400"
              }`}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      {/* Tilt prompt */}
      <div className="rounded-md border border-parchment-300/60 bg-parchment-100/50 p-3">
        <p className="text-sm text-wine-800 mb-1">
          Got a Tilt hydrometer?
        </p>
        <p className="text-xs text-parchment-600">
          You can set up Tilt polling in{" "}
          <a href="/settings" className="text-wine-600 hover:text-wine-700 transition-colors underline underline-offset-2">
            Settings
          </a>{" "}
          after you get started.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-wine-500 px-5 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 active:bg-wine-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Let's go"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="text-sm text-parchment-600 hover:text-wine-600 transition-colors disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
