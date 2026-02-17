"use client";

import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { STYLES, YEASTS } from "@/lib/reference-data";

interface StepBasicsProps {
  data: {
    name: string;
    style: string;
    targetVolume: string;
    targetVolumeUnit: "gal" | "L";
    yeastStrain: string;
    notes: string;
  };
  onChange: (field: string, value: string) => void;
}

const inputClass =
  "w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50";

const styleOptions = STYLES.map((s) => ({
  label: s.name,
  value: s.name,
  group: s.category,
}));

const yeastOptions = YEASTS.map((y) => ({
  label: y.fullName,
  value: y.name,
  group: y.brand,
  description: `${y.tempRangeLowF}–${y.tempRangeHighF}°F · ${y.alcoholTolerance}%`,
}));

export function StepBasics({ data, onChange }: StepBasicsProps) {
  return (
    <div className="max-w-lg space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-wine-800 mb-1">
          Batch name *
        </label>
        <input
          id="name"
          type="text"
          value={data.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="2025 Estate Cabernet"
          className={inputClass}
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="style" className="block text-sm font-medium text-wine-800 mb-1">
          Style
        </label>
        <SearchableCombobox
          id="style"
          value={data.style}
          onChange={(val) => onChange("style", val)}
          options={styleOptions}
          placeholder="Cabernet Sauvignon, Chardonnay..."
          allowCustom
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="targetVolume" className="block text-sm font-medium text-wine-800 mb-1">
            Target volume
          </label>
          <input
            id="targetVolume"
            type="number"
            step="0.1"
            value={data.targetVolume}
            onChange={(e) => onChange("targetVolume", e.target.value)}
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
            value={data.targetVolumeUnit}
            onChange={(e) => onChange("targetVolumeUnit", e.target.value)}
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
        <SearchableCombobox
          id="yeastStrain"
          value={data.yeastStrain}
          onChange={(val) => onChange("yeastStrain", val)}
          options={yeastOptions}
          placeholder="RC-212, EC-1118..."
          allowCustom
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-wine-800 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={data.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Grape source, harvest date, anything else worth remembering..."
          className={inputClass + " resize-none"}
        />
      </div>
    </div>
  );
}
