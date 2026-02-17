"use client";

import { useState, useEffect, useCallback } from "react";
import type { BatchWithComputed, HydrometerWithStatus, HydrometerStatus } from "@/types";
import type { PhaseInput } from "./StepProtocol";

interface StepConnectProps {
  basics: {
    name: string;
    style: string;
    targetVolume: string;
    targetVolumeUnit: string;
    yeastStrain: string;
    notes: string;
  };
  phases: PhaseInput[];
  parentBatchIds: string[];
  onParentBatchIdsChange: (ids: string[]) => void;
  hydrometerId: number | null;
  onHydrometerIdChange: (id: number | null) => void;
}

interface ScanDevice {
  color: string;
  gravity: number;
  temperature: number;
}

// DB-based status: what Ferment knows from polling history
const dbStatusConfig: Record<HydrometerStatus, { dot: string; label: string }> = {
  live: { dot: "bg-[#5a8a5e]", label: "Receiving data" },
  waiting: { dot: "bg-[#c49a3c]", label: "Awaiting data" },
  unknown: { dot: "bg-parchment-400", label: "No data yet" },
};

function formatMinutesAgo(minutes: number | null): string {
  if (minutes == null) return "never";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function StepConnect({
  basics,
  phases,
  parentBatchIds,
  onParentBatchIdsChange,
  hydrometerId,
  onHydrometerIdChange,
}: StepConnectProps) {
  const [batches, setBatches] = useState<BatchWithComputed[]>([]);
  const [hydrometers, setHydrometers] = useState<HydrometerWithStatus[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanDevices, setScanDevices] = useState<ScanDevice[]>([]);
  const [liveChecking, setLiveChecking] = useState(false);
  const [liveDevice, setLiveDevice] = useState<ScanDevice | null>(null);
  const [liveCheckDone, setLiveCheckDone] = useState(false);

  const loadHydrometers = useCallback(() => {
    fetch("/api/v1/hydrometers?active=true")
      .then((r) => r.json())
      .then((h) => setHydrometers(h))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/batches").then((r) => r.json()),
      fetch("/api/v1/hydrometers?active=true").then((r) => r.json()),
    ]).then(([b, h]) => {
      setBatches(b);
      setHydrometers(h);
    }).catch(() => {});
  }, []);

  // When a hydrometer is selected, do a live scan to check if it's broadcasting
  useEffect(() => {
    if (!hydrometerId) {
      setLiveDevice(null);
      setLiveCheckDone(false);
      return;
    }

    const selected = hydrometers.find((h) => h.id === hydrometerId);
    if (!selected) return;

    // If DB already says "live", use that data directly — no need to scan
    if (selected.status === "live" && selected.lastGravity != null) {
      setLiveDevice({
        color: selected.identifier,
        gravity: selected.lastGravity,
        temperature: selected.lastTemperature ?? 0,
      });
      setLiveCheckDone(true);
      return;
    }

    // Otherwise, do a live scan to check the network
    setLiveChecking(true);
    setLiveDevice(null);
    setLiveCheckDone(false);

    fetch("/api/v1/hydrometers/scan")
      .then((r) => r.json())
      .then((data) => {
        if (data.devices && data.devices.length > 0) {
          setScanDevices(data.devices);
          // Match by identifier (Tilt color)
          const match = data.devices.find(
            (d: ScanDevice) => d.color.toLowerCase() === selected.identifier.toLowerCase()
          );
          setLiveDevice(match ?? null);
        }
        setLiveCheckDone(true);
      })
      .catch(() => {
        setLiveCheckDone(true);
      })
      .finally(() => setLiveChecking(false));
  }, [hydrometerId, hydrometers]);

  function toggleParent(uuid: string) {
    if (parentBatchIds.includes(uuid)) {
      onParentBatchIdsChange(parentBatchIds.filter((id) => id !== uuid));
    } else {
      onParentBatchIdsChange([...parentBatchIds, uuid]);
    }
  }

  async function handleScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/v1/hydrometers/scan");
      const data = await res.json();
      if (data.devices && data.devices.length > 0) {
        setScanDevices(data.devices);
        setScanResult(`Found ${data.devices.length} Tilt${data.devices.length > 1 ? "s" : ""}: ${data.devices.map((d: ScanDevice) => d.color).join(", ")}`);
      } else {
        setScanResult(data.error || "No Tilts found on the network");
      }
      loadHydrometers();
    } catch {
      setScanResult("Could not reach TiltPi");
    } finally {
      setScanning(false);
    }
  }

  const selected = hydrometers.find((h) => h.id === hydrometerId);

  // Determine the effective status to display
  // Priority: live scan result > DB status
  function getEffectiveStatus(): { dot: string; label: string } {
    if (!selected) return dbStatusConfig.unknown;
    if (liveDevice) return { dot: "bg-[#5a8a5e]", label: "Live on network" };
    if (liveCheckDone && !liveDevice && selected.status !== "live") {
      return { dot: "bg-[#a04040]", label: "Not found on network" };
    }
    return dbStatusConfig[selected.status];
  }

  const effectiveStatus = getEffectiveStatus();

  return (
    <div className="max-w-lg space-y-6">
      {/* Hydrometer */}
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">
          Hydrometer
        </label>
        {hydrometers.length > 0 ? (
          <>
            <select
              value={hydrometerId ?? ""}
              onChange={(e) =>
                onHydrometerIdChange(e.target.value ? parseInt(e.target.value, 10) : null)
              }
              className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
            >
              <option value="">None — log readings manually</option>
              {hydrometers.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.type} — {h.identifier})
                </option>
              ))}
            </select>

            {/* Status detail for selected hydrometer */}
            {selected && (
              <div className="mt-3 rounded-md border border-parchment-300/80 bg-parchment-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  {liveChecking ? (
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-parchment-400 animate-pulse" />
                  ) : (
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${effectiveStatus.dot}`} />
                  )}
                  <span className="text-sm font-medium text-wine-800">
                    {selected.name}
                  </span>
                  <span className="text-xs text-parchment-600 ml-auto">
                    {liveChecking ? "Checking..." : effectiveStatus.label}
                    {selected.minutesSinceLastReading != null && !liveChecking && (
                      <> — last data {formatMinutesAgo(selected.minutesSinceLastReading)}</>
                    )}
                  </span>
                </div>

                {/* Live reading from scan or recent DB data */}
                {liveDevice && (
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-lg text-wine-800">
                      {liveDevice.gravity.toFixed(3)} SG
                    </span>
                    {liveDevice.temperature > 0 && (
                      <span className="font-mono text-sm text-parchment-700">
                        {liveDevice.temperature}°F
                      </span>
                    )}
                  </div>
                )}

                {/* Waiting: has reported before but not recently, and not found on live scan */}
                {!liveChecking && !liveDevice && selected.status === "waiting" && liveCheckDone && (
                  <div>
                    <p className="text-xs text-parchment-600 mb-2">
                      Not found on the network right now
                      {selected.lastGravity != null && (
                        <> — last reading was <span className="font-mono">{selected.lastGravity.toFixed(3)} SG</span></>
                      )}
                      . The Tilt may be out of range or powered off. You can still link it and readings will appear when it reconnects.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLiveCheckDone(false);
                        setLiveChecking(true);
                        fetch("/api/v1/hydrometers/scan")
                          .then((r) => r.json())
                          .then((data) => {
                            if (data.devices?.length > 0) {
                              const match = data.devices.find(
                                (d: ScanDevice) => d.color.toLowerCase() === selected.identifier.toLowerCase()
                              );
                              setLiveDevice(match ?? null);
                            }
                            setLiveCheckDone(true);
                          })
                          .catch(() => setLiveCheckDone(true))
                          .finally(() => setLiveChecking(false));
                      }}
                      className="rounded border border-parchment-300/80 px-3 py-1 text-xs text-parchment-800/70 transition-colors hover:border-parchment-400 hover:text-wine-600"
                    >
                      Check again
                    </button>
                  </div>
                )}

                {/* Unknown: never reported to Ferment */}
                {!liveChecking && !liveDevice && selected.status === "unknown" && liveCheckDone && (
                  <p className="text-xs text-parchment-600">
                    This hydrometer hasn&apos;t sent any data to Ferment yet. Make sure TiltPi is running and polling is enabled in Settings. You can still link it now.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-dashed border-parchment-400 bg-parchment-100 px-4 py-3">
            <p className="text-sm text-parchment-600">
              No hydrometers registered. Add one in Settings to enable auto-logging.
            </p>
          </div>
        )}

        {/* Scan button */}
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="rounded border border-parchment-300/80 px-3 py-1.5 text-xs font-medium text-parchment-800/70 transition-colors hover:border-parchment-400 hover:text-wine-600 disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Scan for Tilts"}
          </button>
          {scanResult && (
            <span className="text-xs text-parchment-600">{scanResult}</span>
          )}
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
          <div className="flex justify-between">
            <span className="text-parchment-700">Phases</span>
            <span className="text-wine-800">
              {phases.length > 0
                ? phases.map((p) => p.name).filter(Boolean).join(" → ")
                : "None"}
            </span>
          </div>
          {selected && (
            <div className="flex justify-between">
              <span className="text-parchment-700">Hydrometer</span>
              <span className="flex items-center gap-1.5 text-wine-800">
                <span className={`inline-block h-2 w-2 rounded-full ${effectiveStatus.dot}`} />
                {selected.name}
              </span>
            </div>
          )}
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
