"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { BatchWithComputed, HydrometerWithStatus, HydrometerStatus } from "@/types";
import type { PhaseInput } from "./StepProtocol";
import { parseTiltCSV, type TiltCSVRow } from "@/lib/import/parse-tilt-csv";

export type TrackingMode = "manual" | "hydrometer" | "import";

export interface UnlinkedReadingsData {
  readings: { id: number; gravity: number; temperature: number | null; recordedAt: string }[];
  count: number;
  dateRange: { from: string; to: string };
  sgRange: { min: number; max: number };
}

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
  trackingMode: TrackingMode;
  onTrackingModeChange: (mode: TrackingMode) => void;
  originalGravity: string;
  onOriginalGravityChange: (og: string) => void;
  csvData: { rows: TiltCSVRow[]; fileName: string; rawText: string } | null;
  onCsvDataChange: (data: { rows: TiltCSVRow[]; fileName: string; rawText: string } | null) => void;
  includeBackfill: boolean;
  onIncludeBackfillChange: (include: boolean) => void;
  onUnlinkedReadingsChange: (data: UnlinkedReadingsData | null) => void;
}

interface ScanDevice {
  color: string;
  gravity: number;
  temperature: number;
}

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

const MODE_CARDS: { mode: TrackingMode; title: string; desc: string }[] = [
  { mode: "manual", title: "Manual", desc: "Log readings by hand" },
  { mode: "hydrometer", title: "Hydrometer", desc: "Link a Tilt or other device" },
  { mode: "import", title: "Import", desc: "Upload a CSV from a previous log" },
];

export function StepConnect({
  basics,
  phases,
  parentBatchIds,
  onParentBatchIdsChange,
  hydrometerId,
  onHydrometerIdChange,
  trackingMode,
  onTrackingModeChange,
  originalGravity,
  onOriginalGravityChange,
  csvData,
  onCsvDataChange,
  includeBackfill,
  onIncludeBackfillChange,
  onUnlinkedReadingsChange,
}: StepConnectProps) {
  const [batches, setBatches] = useState<BatchWithComputed[]>([]);
  const [hydrometers, setHydrometers] = useState<HydrometerWithStatus[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [, setScanDevices] = useState<ScanDevice[]>([]);
  const [liveChecking, setLiveChecking] = useState(false);
  const [liveDevice, setLiveDevice] = useState<ScanDevice | null>(null);
  const [liveCheckDone, setLiveCheckDone] = useState(false);
  const [useHydrometerOG, setUseHydrometerOG] = useState(true);
  const [editingOG, setEditingOG] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [unlinkedData, setUnlinkedData] = useState<UnlinkedReadingsData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (selected.status === "live" && selected.lastGravity != null) {
      setLiveDevice({
        color: selected.identifier,
        gravity: selected.lastGravity,
        temperature: selected.lastTemperature ?? 0,
      });
      setLiveCheckDone(true);
      return;
    }

    setLiveChecking(true);
    setLiveDevice(null);
    setLiveCheckDone(false);

    fetch("/api/v1/hydrometers/scan")
      .then((r) => r.json())
      .then((data) => {
        if (data.devices && data.devices.length > 0) {
          setScanDevices(data.devices);
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

  // Auto-set OG from live hydrometer reading
  useEffect(() => {
    if (trackingMode === "hydrometer" && useHydrometerOG && liveDevice && !editingOG) {
      onOriginalGravityChange(liveDevice.gravity.toFixed(3));
    }
  }, [trackingMode, useHydrometerOG, liveDevice, editingOG, onOriginalGravityChange]);

  // Fetch unlinked readings when a hydrometer is selected in hydrometer mode
  useEffect(() => {
    if (trackingMode !== "hydrometer" || !hydrometerId) {
      setUnlinkedData(null);
      onUnlinkedReadingsChange(null);
      return;
    }

    fetch(`/api/v1/hydrometers/${hydrometerId}/unlinked-readings`)
      .then((r) => r.json())
      .then((data) => {
        if (data.count > 0) {
          setUnlinkedData(data);
          onUnlinkedReadingsChange(data);
          // Auto-set OG from earliest unlinked reading if no manual OG and backfill is on
          if (includeBackfill && !editingOG && !liveDevice) {
            onOriginalGravityChange(data.readings[0].gravity.toFixed(3));
          }
        } else {
          setUnlinkedData(null);
          onUnlinkedReadingsChange(null);
        }
      })
      .catch(() => {
        setUnlinkedData(null);
        onUnlinkedReadingsChange(null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingMode, hydrometerId]);

  // Auto-match CSV color to registered hydrometer
  useEffect(() => {
    if (trackingMode === "import" && csvData && csvData.rows.length > 0) {
      const csvColor = csvData.rows[0].color;
      if (csvColor) {
        const match = hydrometers.find(
          (h) => h.identifier.toLowerCase() === csvColor.toLowerCase()
        );
        if (match) {
          onHydrometerIdChange(match.id);
        }
      }
    }
  }, [trackingMode, csvData, hydrometers, onHydrometerIdChange]);

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

  function handleFileSelect(file: File) {
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const rows = parseTiltCSV(text);
        if (rows.length === 0) {
          setCsvError("No valid readings found in this file. Check the format and try again.");
          return;
        }
        onCsvDataChange({ rows, fileName: file.name, rawText: text });

        // Auto-set OG from earliest reading
        const sorted = [...rows].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        onOriginalGravityChange(sorted[0].gravity.toFixed(3));
      } catch (err) {
        setCsvError(err instanceof Error ? err.message : "Failed to parse CSV");
      }
    };
    reader.onerror = () => setCsvError("Could not read the file");
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  const selected = hydrometers.find((h) => h.id === hydrometerId);

  function getEffectiveStatus(): { dot: string; label: string } {
    if (!selected) return dbStatusConfig.unknown;
    if (liveDevice) return { dot: "bg-[#5a8a5e]", label: "Live on network" };
    if (liveCheckDone && !liveDevice && selected.status !== "live") {
      return { dot: "bg-[#a04040]", label: "Not found on network" };
    }
    return dbStatusConfig[selected.status];
  }

  const effectiveStatus = getEffectiveStatus();

  // CSV stats for preview
  const csvStats = csvData ? getCsvStats(csvData.rows) : null;

  // Check if CSV color has a matching hydrometer
  const csvColor = csvData?.rows[0]?.color ?? null;
  const csvHydrometerMatch = csvColor
    ? hydrometers.find((h) => h.identifier.toLowerCase() === csvColor.toLowerCase())
    : null;

  return (
    <div className="max-w-lg space-y-6">
      {/* Mode selector */}
      <div>
        <p className="text-sm font-medium text-wine-800 mb-3">
          How are you tracking this batch?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {MODE_CARDS.map(({ mode, title, desc }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onTrackingModeChange(mode)}
              className={`rounded-md border px-3 py-3 text-left transition-colors ${
                trackingMode === mode
                  ? "border-wine-400 bg-wine-50 shadow-[0_1px_3px_rgba(46,14,29,0.08)]"
                  : "border-parchment-300/80 bg-parchment-50 hover:border-parchment-400"
              }`}
            >
              <span className={`block text-sm font-medium ${
                trackingMode === mode ? "text-wine-700" : "text-wine-800"
              }`}>
                {title}
              </span>
              <span className="block text-xs text-parchment-600 mt-0.5">
                {desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual mode */}
      {trackingMode === "manual" && (
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-1">
            Starting gravity <span className="font-normal text-parchment-600">(if you have it)</span>
          </label>
          <input
            type="number"
            step="0.001"
            min="0.9"
            max="1.2"
            placeholder="1.090"
            value={originalGravity}
            onChange={(e) => onOriginalGravityChange(e.target.value)}
            className="w-40 rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 font-mono text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          />
        </div>
      )}

      {/* Hydrometer mode */}
      {trackingMode === "hydrometer" && (
        <div className="space-y-4">
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
                  <option value="">Select a hydrometer</option>
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

                    {/* Live reading + OG auto-set */}
                    {liveDevice && (
                      <div className="space-y-2">
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

                        {/* Use as starting gravity */}
                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useHydrometerOG}
                              onChange={(e) => {
                                setUseHydrometerOG(e.target.checked);
                                if (e.target.checked) {
                                  setEditingOG(false);
                                  onOriginalGravityChange(liveDevice.gravity.toFixed(3));
                                }
                              }}
                              className="accent-wine-500"
                            />
                            <span className="text-wine-800">Use as starting gravity</span>
                          </label>
                          {useHydrometerOG && !editingOG && (
                            <button
                              type="button"
                              onClick={() => setEditingOG(true)}
                              className="text-xs text-parchment-600 hover:text-wine-600 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        {/* Manual OG override */}
                        {editingOG && (
                          <input
                            type="number"
                            step="0.001"
                            min="0.9"
                            max="1.2"
                            placeholder="1.090"
                            value={originalGravity}
                            onChange={(e) => onOriginalGravityChange(e.target.value)}
                            className="w-40 rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 font-mono text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
                          />
                        )}
                      </div>
                    )}

                    {/* Waiting state */}
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

                    {/* Unknown state */}
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

          {/* Backfill prompt for unlinked readings */}
          {unlinkedData && unlinkedData.count > 0 && (
            <div className="rounded-md border border-parchment-300/80 bg-parchment-50 p-3">
              <p className="text-sm text-wine-800 mb-2">
                This Tilt has <span className="font-medium">{unlinkedData.count} reading{unlinkedData.count !== 1 ? "s" : ""}</span> from before this batch was created
                <span className="font-mono text-xs text-parchment-700 ml-1">
                  ({unlinkedData.sgRange.max.toFixed(3)} → {unlinkedData.sgRange.min.toFixed(3)} SG)
                </span>
              </p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBackfill}
                  onChange={(e) => {
                    onIncludeBackfillChange(e.target.checked);
                    if (e.target.checked && !editingOG && !liveDevice) {
                      onOriginalGravityChange(
                        unlinkedData.readings[0].gravity.toFixed(3)
                      );
                    }
                  }}
                  className="accent-wine-500"
                />
                <span className="text-wine-800">Include these readings in this batch</span>
              </label>
            </div>
          )}

          {/* OG input when no live reading */}
          {!liveDevice && (
            <div>
              <label className="block text-sm font-medium text-wine-800 mb-1">
                Starting gravity <span className="font-normal text-parchment-600">(if you have it)</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0.9"
                max="1.2"
                placeholder="1.090"
                value={originalGravity}
                onChange={(e) => onOriginalGravityChange(e.target.value)}
                className="w-40 rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 font-mono text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
              />
            </div>
          )}
        </div>
      )}

      {/* Import mode */}
      {trackingMode === "import" && (
        <div className="space-y-4">
          {!csvData ? (
            /* Drop zone */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-md border-2 border-dashed px-6 py-8 text-center transition-colors ${
                dragging
                  ? "border-wine-400 bg-wine-50/50"
                  : "border-parchment-400 bg-parchment-50 hover:border-parchment-500"
              }`}
            >
              <p className="text-sm font-medium text-wine-800 mb-1">
                Drop a CSV file here, or click to browse
              </p>
              <p className="text-xs text-parchment-600">
                Accepts .csv or .txt from TiltPi, Google Sheets, or similar exports
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            /* CSV Preview */
            <div className="rounded-md border border-parchment-300/80 bg-parchment-50 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-wine-800">{csvData.fileName}</p>
                  <p className="text-xs text-parchment-600 mt-0.5">
                    {csvStats!.count.toLocaleString()} readings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onCsvDataChange(null);
                    onOriginalGravityChange("");
                    onHydrometerIdChange(null);
                    setCsvError(null);
                  }}
                  className="text-xs text-parchment-600 hover:text-wine-600 transition-colors"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div>
                  <span className="text-parchment-700">Date range</span>
                </div>
                <div className="text-right font-mono text-wine-800">
                  {csvStats!.dateRange}
                </div>
                <div>
                  <span className="text-parchment-700">Gravity</span>
                </div>
                <div className="text-right font-mono text-wine-800">
                  {csvStats!.sgRange}
                </div>
                {csvColor && (
                  <>
                    <div>
                      <span className="text-parchment-700">Tilt color</span>
                    </div>
                    <div className="text-right text-wine-800 capitalize">
                      {csvColor}
                    </div>
                  </>
                )}
                {csvStats!.skippedWarning && (
                  <>
                    <div className="col-span-2 mt-1">
                      <span className="text-xs text-[#c49a3c]">{csvStats!.skippedWarning}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Hydrometer matching status */}
              {csvColor && (
                <div className="mt-3 pt-3 border-t border-parchment-300/60">
                  {csvHydrometerMatch ? (
                    <p className="text-xs text-[#5a8a5e]">
                      Matched to {csvHydrometerMatch.name} ({csvHydrometerMatch.identifier})
                    </p>
                  ) : (
                    <p className="text-xs text-parchment-600">
                      No registered {csvColor} Tilt found. You can add one in Settings, or import without linking.
                    </p>
                  )}
                </div>
              )}

              {/* Manual hydrometer selection for import if no auto-match */}
              {!csvHydrometerMatch && hydrometers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-parchment-300/60">
                  <label className="block text-xs font-medium text-wine-800 mb-1">
                    Link to a hydrometer
                  </label>
                  <select
                    value={hydrometerId ?? ""}
                    onChange={(e) =>
                      onHydrometerIdChange(e.target.value ? parseInt(e.target.value, 10) : null)
                    }
                    className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-1.5 text-xs text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
                  >
                    <option value="">Select a hydrometer</option>
                    {hydrometers.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.type} — {h.identifier})
                      </option>
                    ))}
                  </select>
                  {!hydrometerId && (
                    <p className="text-xs text-[#c49a3c] mt-1">
                      A hydrometer is needed to import readings. Select one above or add one in Settings first.
                    </p>
                  )}
                </div>
              )}

              {/* No hydrometers registered at all */}
              {!csvHydrometerMatch && hydrometers.length === 0 && (
                <div className="mt-3 pt-3 border-t border-parchment-300/60">
                  <p className="text-xs text-[#c49a3c]">
                    No hydrometers registered. Add one in Settings to import these readings, or the batch will be created without the CSV data.
                  </p>
                </div>
              )}
            </div>
          )}

          {csvError && (
            <p className="text-sm text-[#a04040]">{csvError}</p>
          )}

          {/* OG display — auto-set from CSV */}
          {csvData && originalGravity && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-parchment-700">Starting gravity:</span>
              <span className="font-mono text-lg text-wine-800">{originalGravity} SG</span>
              <span className="text-xs text-parchment-600">(from earliest reading)</span>
            </div>
          )}
        </div>
      )}

      {/* Parent batches — shared across all modes */}
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
          <div className="flex justify-between">
            <span className="text-parchment-700">Tracking</span>
            <span className="text-wine-800 capitalize">{trackingMode}</span>
          </div>
          {originalGravity && (
            <div className="flex justify-between">
              <span className="text-parchment-700">Starting gravity</span>
              <span className="font-mono text-wine-800">{originalGravity} SG</span>
            </div>
          )}
          {trackingMode === "hydrometer" && selected && (
            <div className="flex justify-between">
              <span className="text-parchment-700">Hydrometer</span>
              <span className="flex items-center gap-1.5 text-wine-800">
                <span className={`inline-block h-2 w-2 rounded-full ${effectiveStatus.dot}`} />
                {selected.name}
              </span>
            </div>
          )}
          {trackingMode === "import" && csvData && (
            <div className="flex justify-between">
              <span className="text-parchment-700">Import</span>
              <span className="text-wine-800">
                {csvStats!.count.toLocaleString()} readings from {csvData.fileName}
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

/** Compute summary stats from parsed CSV rows */
function getCsvStats(rows: TiltCSVRow[]) {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const startDate = new Date(first.timestamp);
  const endDate = new Date(last.timestamp);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const gravities = sorted.map((r) => r.gravity);
  const maxSG = Math.max(...gravities);
  const minSG = Math.min(...gravities);

  return {
    count: rows.length,
    dateRange: `${fmt(startDate)} – ${fmt(endDate)}`,
    sgRange: `${maxSG.toFixed(3)} → ${minSG.toFixed(3)}`,
    skippedWarning: null as string | null,
  };
}
