"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewBatchForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string)?.trim();

    if (!name) {
      setError("Your batch needs a name");
      setSubmitting(false);
      return;
    }

    const ogStr = form.get("originalGravity") as string;
    const volStr = form.get("targetVolume") as string;

    const body = {
      name,
      style: (form.get("style") as string)?.trim() || undefined,
      targetVolume: volStr ? parseFloat(volStr) : undefined,
      targetVolumeUnit: (form.get("targetVolumeUnit") as string) || "gal",
      yeastStrain: (form.get("yeastStrain") as string)?.trim() || undefined,
      originalGravity: ogStr ? parseFloat(ogStr) : undefined,
      notes: (form.get("notes") as string)?.trim() || undefined,
    };

    try {
      const res = await fetch("/api/v1/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }

      const batch = await res.json();
      router.push(`/batches/${batch.uuid}`);
    } catch {
      setError("Failed to create batch. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50";

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-wine-800 mb-1">
          Batch name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="2025 Estate Cabernet"
          className={inputClass}
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="style" className="block text-sm font-medium text-wine-800 mb-1">
          Style
        </label>
        <input
          id="style"
          name="style"
          type="text"
          placeholder="Cabernet Sauvignon, Chardonnay..."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="targetVolume" className="block text-sm font-medium text-wine-800 mb-1">
            Target volume
          </label>
          <input
            id="targetVolume"
            name="targetVolume"
            type="number"
            step="0.1"
            placeholder="5"
            className={inputClass + " font-mono"}
          />
        </div>
        <div>
          <label htmlFor="targetVolumeUnit" className="block text-sm font-medium text-wine-800 mb-1">
            Unit
          </label>
          <select
            id="targetVolumeUnit"
            name="targetVolumeUnit"
            defaultValue="gal"
            className={inputClass}
          >
            <option value="gal">gal</option>
            <option value="L">L</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="yeastStrain" className="block text-sm font-medium text-wine-800 mb-1">
          Yeast strain
        </label>
        <input
          id="yeastStrain"
          name="yeastStrain"
          type="text"
          placeholder="RC-212, EC-1118..."
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="originalGravity" className="block text-sm font-medium text-wine-800 mb-1">
          Starting gravity
        </label>
        <input
          id="originalGravity"
          name="originalGravity"
          type="number"
          step="0.001"
          placeholder="1.090"
          className={inputClass + " font-mono text-lg"}
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-wine-800 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Grape source, harvest date, anything else worth remembering..."
          className={inputClass + " resize-none"}
        />
      </div>

      {error && (
        <p className="text-sm text-[#a04040]">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-wine-500 px-5 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 active:bg-wine-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create batch"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded border border-parchment-300/80 px-5 py-2 text-sm font-medium text-parchment-800/70 transition-colors hover:border-parchment-400 hover:text-wine-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
