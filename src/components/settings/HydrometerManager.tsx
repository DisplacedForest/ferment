"use client";

import { useState, useEffect, useCallback } from "react";
import { Gauge, Trash, Plus, MagnifyingGlass } from "@phosphor-icons/react";
import { timeAgo } from "@/lib/utils";
import type { Hydrometer, HydrometerType } from "@/types";

const TILT_COLORS = ["red", "green", "black", "purple", "orange", "blue", "yellow", "pink"];

interface ScannedDevice {
  color: string;
  temperature: number;
  gravity: number;
  rssi: number;
  mac: string;
}

export function HydrometerManager() {
  const [hydrometers, setHydrometers] = useState<Hydrometer[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "tilt" as HydrometerType,
    identifier: "",
    calibrationOffset: "0",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchHydrometers = useCallback(async () => {
    const res = await fetch("/api/v1/hydrometers");
    if (res.ok) setHydrometers(await res.json());
  }, []);

  useEffect(() => {
    fetchHydrometers();
  }, [fetchHydrometers]);

  async function handleScan() {
    setScanning(true);
    setScanError(null);
    setScannedDevices([]);

    try {
      const res = await fetch("/api/v1/hydrometers/scan");
      const data = await res.json();

      if (!res.ok) {
        setScanError(data.error ?? "Scan failed");
        return;
      }

      if (data.devices.length === 0) {
        setScanError("No Tilt hydrometers found on the network.");
        return;
      }

      setScannedDevices(data.devices);
    } catch {
      setScanError("Could not reach TiltPi. Check that it's on your network.");
    } finally {
      setScanning(false);
    }
  }

  function selectScannedDevice(device: ScannedDevice) {
    const colorName = device.color.charAt(0).toUpperCase() + device.color.slice(1);
    setForm({
      name: `Tilt ${colorName}`,
      type: "tilt",
      identifier: device.color,
      calibrationOffset: "0",
    });
    setScannedDevices([]);
    setShowAdd(true);
  }

  async function handleAdd() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/hydrometers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          identifier: form.identifier.trim(),
          calibrationOffset: parseFloat(form.calibrationOffset) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to add hydrometer");
        return;
      }

      // Auto-enable Tilt polling when the first device is registered
      if (hydrometers.length === 0) {
        await fetch("/api/v1/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "tilt.enabled": "true" }),
        });
      }

      setForm({ name: "", type: "tilt", identifier: "", calibrationOffset: "0" });
      setShowAdd(false);
      fetchHydrometers();
    } catch {
      setError("Failed to add hydrometer");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: number, isActive: boolean) {
    await fetch(`/api/v1/hydrometers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchHydrometers();
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this hydrometer? Readings linked to it will be preserved.")) return;
    await fetch(`/api/v1/hydrometers/${id}`, { method: "DELETE" });
    fetchHydrometers();
  }

  async function handleCalibrationChange(id: number, value: string) {
    const offset = parseFloat(value);
    if (isNaN(offset)) return;
    await fetch(`/api/v1/hydrometers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calibrationOffset: offset }),
    });
    fetchHydrometers();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-wine-800">Hydrometers</h2>
        <div className="flex gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-1.5 rounded border border-parchment-300/80 px-3 py-1.5 text-xs font-medium text-parchment-800/70 transition-colors hover:border-wine-400 hover:text-wine-600 disabled:opacity-50"
          >
            <MagnifyingGlass size={14} weight="regular" className={scanning ? "animate-pulse" : ""} />
            {scanning ? "Scanning..." : "Scan for Tilts"}
          </button>
          <button
            onClick={() => { setShowAdd(!showAdd); setScannedDevices([]); }}
            className="flex items-center gap-1.5 rounded bg-wine-500 px-3 py-1.5 text-xs font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600"
          >
            <Plus size={14} weight="bold" />
            Add manually
          </button>
        </div>
      </div>

      {/* Scan results */}
      {scannedDevices.length > 0 && (
        <div className="mb-4 rounded-md border border-wine-300/40 bg-wine-50/30 p-4">
          <p className="text-xs font-medium text-wine-800 mb-2">
            Found {scannedDevices.length} Tilt{scannedDevices.length > 1 ? "s" : ""} on the network
          </p>
          <div className="space-y-2">
            {scannedDevices.map((device) => {
              const alreadyRegistered = hydrometers.some(
                (h) => h.type === "tilt" && h.identifier === device.color
              );
              return (
                <div
                  key={device.mac}
                  className="flex items-center justify-between rounded-md border border-parchment-300/80 bg-parchment-50 px-4 py-2.5"
                >
                  <div>
                    <span className="text-sm font-medium text-wine-800">
                      Tilt {device.color.charAt(0).toUpperCase() + device.color.slice(1)}
                    </span>
                    <span className="ml-3 font-mono text-xs text-parchment-700">
                      {device.gravity.toFixed(3)} SG · {device.temperature}°F
                    </span>
                    <span className="ml-2 text-[10px] text-parchment-500">
                      RSSI {device.rssi}
                    </span>
                  </div>
                  {alreadyRegistered ? (
                    <span className="text-xs text-parchment-600">Already registered</span>
                  ) : (
                    <button
                      onClick={() => selectScannedDevice(device)}
                      className="rounded bg-wine-500 px-3 py-1 text-xs font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600"
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scanError && (
        <p className="mb-4 text-xs text-[#a04040]">{scanError}</p>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 rounded-md border border-parchment-300/80 bg-parchment-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-wine-800 mb-1">Name</label>
              <input
                type="text"
                placeholder="Tilt Green"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-1.5 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-wine-800 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value as HydrometerType;
                  setForm({ ...form, type, identifier: "" });
                }}
                className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-1.5 text-sm text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
              >
                <option value="tilt">Tilt</option>
                <option value="ispindel">iSpindel</option>
                <option value="rapt">RAPT Pill</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-wine-800 mb-1">
                {form.type === "tilt" ? "Color" : "Identifier"}
              </label>
              {form.type === "tilt" ? (
                <select
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-1.5 text-sm text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
                >
                  <option value="">Select color...</option>
                  {TILT_COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Device name or ID"
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-1.5 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-wine-800 mb-1">
                Calibration offset
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={form.calibrationOffset}
                onChange={(e) => setForm({ ...form, calibrationOffset: e.target.value })}
                className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-1.5 font-mono text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
              />
            </div>
          </div>

          {error && <p className="text-xs text-[#a04040]">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !form.name.trim() || !form.identifier.trim()}
              className="rounded bg-wine-500 px-4 py-1.5 text-xs font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add hydrometer"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded border border-parchment-300/80 px-4 py-1.5 text-xs font-medium text-parchment-800/70 transition-colors hover:border-parchment-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hydrometer list */}
      {hydrometers.length === 0 && !showAdd && scannedDevices.length === 0 ? (
        <div className="rounded-md border border-dashed border-parchment-400 bg-parchment-100 px-4 py-6 text-center">
          <Gauge size={24} weight="thin" className="mx-auto mb-2 text-parchment-500" />
          <p className="text-sm text-parchment-600">
            No hydrometers registered. Hit &ldquo;Scan for Tilts&rdquo; to find devices on your network.
          </p>
        </div>
      ) : hydrometers.length > 0 && (
        <div className="space-y-2">
          {hydrometers.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 rounded-md border border-parchment-300/80 bg-parchment-50 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-wine-800 truncate">{h.name}</span>
                  <span className="rounded-full bg-parchment-200 px-2 py-0.5 text-[10px] font-medium text-parchment-700">
                    {h.type}
                  </span>
                  <span className="text-[10px] text-parchment-600">{h.identifier}</span>
                  {!h.isActive && (
                    <span className="rounded-full bg-parchment-300 px-2 py-0.5 text-[10px] text-parchment-600">
                      inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-parchment-600">
                  {h.calibrationOffset !== 0 && (
                    <span className="font-mono">
                      offset: {h.calibrationOffset > 0 ? "+" : ""}{h.calibrationOffset.toFixed(3)}
                    </span>
                  )}
                  {h.lastSeenAt && <span>last seen {timeAgo(h.lastSeenAt)}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  defaultValue={h.calibrationOffset}
                  onBlur={(e) => handleCalibrationChange(h.id, e.target.value)}
                  className="w-20 rounded border border-parchment-300 bg-parchment-100 px-2 py-1 font-mono text-xs text-wine-800 focus:border-wine-400 focus:outline-none"
                  title="Calibration offset"
                />
                <button
                  onClick={() => handleToggleActive(h.id, h.isActive)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    h.isActive
                      ? "bg-[#5a8a5e]/10 text-[#5a8a5e] hover:bg-[#5a8a5e]/20"
                      : "bg-parchment-200 text-parchment-600 hover:bg-parchment-300"
                  }`}
                >
                  {h.isActive ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => handleDelete(h.id)}
                  className="rounded p-1 text-parchment-500 transition-colors hover:text-[#a04040]"
                  title="Remove hydrometer"
                >
                  <Trash size={16} weight="regular" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
