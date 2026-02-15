"use client";

import { useState, useEffect, useRef } from "react";
import { Upload } from "@phosphor-icons/react";
import type { Hydrometer, BatchWithComputed } from "@/types";

export function TiltImport() {
  const [hydrometers, setHydrometers] = useState<Hydrometer[]>([]);
  const [batches, setBatches] = useState<BatchWithComputed[]>([]);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [selectedHydrometerId, setSelectedHydrometerId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    importedReadings: number;
    generatedRecaps: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/hydrometers").then((r) => r.json()),
      fetch("/api/v1/batches").then((r) => r.json()),
    ]).then(([h, b]) => {
      setHydrometers(h);
      setBatches(b);
    });
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setFileName(file.name);

      const lines = text.trim().split("\n");
      setPreview(lines.slice(0, 6));
      setRowCount(Math.max(0, lines.length - 1));
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!csvText || !selectedBatchId || !selectedHydrometerId) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/v1/import/tilt-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText,
          batchId: selectedBatchId,
          hydrometerId: selectedHydrometerId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Import failed");
        return;
      }

      const data = await res.json();
      setResult({
        importedReadings: data.importedReadings,
        generatedRecaps: data.generatedRecaps,
      });
      setCsvText(null);
      setFileName(null);
      setPreview([]);
      setRowCount(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Import failed. Check the CSV format and try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl text-wine-800 mb-4">Import data</h2>

      <p className="text-sm text-parchment-700 mb-4">
        Import CSV exports from TiltPi&apos;s Google Sheets log. The CSV should have columns
        for timestamp, gravity (SG), and optionally temperature.
      </p>

      {/* File upload */}
      <div className="mb-4">
        <label
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-parchment-400 bg-parchment-100 px-4 py-6 transition-colors hover:border-wine-400 hover:bg-parchment-50"
        >
          <Upload size={20} weight="regular" className="text-parchment-500" />
          <span className="text-sm text-parchment-600">
            {fileName ?? "Choose a CSV file..."}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="mb-4 rounded-md border border-parchment-300/80 bg-parchment-50 p-3">
          <p className="text-xs font-medium text-wine-800 mb-2">
            Preview ({rowCount} rows)
          </p>
          <div className="overflow-x-auto">
            <pre className="font-mono text-xs text-parchment-700 whitespace-pre">
              {preview.join("\n")}
            </pre>
          </div>
          {rowCount > 5 && (
            <p className="text-[10px] text-parchment-500 mt-1">
              ...and {rowCount - 5} more rows
            </p>
          )}
        </div>
      )}

      {/* Batch + Hydrometer selectors */}
      {csvText && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-wine-800 mb-1">Batch</label>
            <select
              value={selectedBatchId ?? ""}
              onChange={(e) => setSelectedBatchId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-1.5 text-sm text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
            >
              <option value="">Select batch...</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-wine-800 mb-1">Hydrometer</label>
            <select
              value={selectedHydrometerId ?? ""}
              onChange={(e) =>
                setSelectedHydrometerId(e.target.value ? parseInt(e.target.value, 10) : null)
              }
              className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-1.5 text-sm text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
            >
              <option value="">Select hydrometer...</option>
              {hydrometers.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.type} — {h.identifier})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Import button */}
      {csvText && (
        <button
          onClick={handleImport}
          disabled={importing || !selectedBatchId || !selectedHydrometerId}
          className="rounded bg-wine-500 px-5 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 disabled:opacity-50"
        >
          {importing ? "Importing..." : `Import ${rowCount} readings`}
        </button>
      )}

      {/* Error */}
      {error && <p className="mt-3 text-sm text-[#a04040]">{error}</p>}

      {/* Result */}
      {result && (
        <div className="mt-3 rounded-md border border-[#5a8a5e]/30 bg-[#5a8a5e]/5 p-3">
          <p className="text-sm text-[#5a8a5e]">
            Imported {result.importedReadings} readings, generated {result.generatedRecaps} daily
            recaps.
          </p>
        </div>
      )}
    </div>
  );
}
