"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ADDITIVES, isOakAdditive, type AdditiveOption, type OakOption, type AdditiveCategory } from "@/lib/reference-data";

interface AdditionFormProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

const inputClass =
  "w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50";

const CATEGORIES: AdditiveCategory[] = [
  "Nutrient",
  "Sulfite",
  "Fining Agent",
  "Oak",
  "Acid",
  "Enzyme",
  "Other",
];

const OAK_FORMATS = ["Chips", "Cubes", "Spirals", "Staves", "Segments"];
const OAK_TOASTS = ["Light", "Medium", "Medium+", "Heavy"];
const OAK_ORIGINS = ["French", "American", "Hungarian"];

export function AdditionForm({ data, onChange }: AdditionFormProps) {
  const [searchQuery, setSearchQuery] = useState((data.name as string) ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAdditive, setSelectedAdditive] = useState<AdditiveOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize selectedAdditive from data.name on mount
  useEffect(() => {
    if (data.name) {
      const found = ADDITIVES.find(
        (a) => a.name.toLowerCase() === (data.name as string).toLowerCase()
      );
      if (found) setSelectedAdditive(found);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredByCategory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const grouped: Record<string, AdditiveOption[]> = {};

    for (const cat of CATEGORIES) {
      const items = ADDITIVES.filter((a) => a.category === cat);
      const filtered = q
        ? items.filter(
            (a) =>
              a.name.toLowerCase().includes(q) ||
              a.category.toLowerCase().includes(q) ||
              (a.description ?? "").toLowerCase().includes(q)
          )
        : items;
      if (filtered.length > 0) {
        grouped[cat] = filtered;
      }
    }

    return grouped;
  }, [searchQuery]);

  function selectAdditive(additive: AdditiveOption) {
    setSelectedAdditive(additive);
    setSearchQuery(additive.name);
    setIsOpen(false);

    const updates: Record<string, unknown> = {
      ...data,
      name: additive.name,
      unit: additive.defaultUnit,
      category: additive.category,
    };

    if (isOakAdditive(additive)) {
      const oak = additive as OakOption;
      updates.oakFormat = oak.oakFormat;
      updates.oakToast = oak.oakToast;
      updates.oakOrigin = oak.oakOrigin;
    } else {
      delete updates.oakFormat;
      delete updates.oakToast;
      delete updates.oakOrigin;
    }

    onChange(updates);
  }

  function handleCustomEntry(name: string) {
    setSearchQuery(name);
    setSelectedAdditive(null);
    onChange({ ...data, name });
  }

  const showOakFields =
    selectedAdditive && isOakAdditive(selectedAdditive) ||
    (data.category === "Oak");

  return (
    <div className="space-y-4">
      {/* Searchable Additive Combobox */}
      <div ref={containerRef} className="relative">
        <label className="block text-sm font-medium text-wine-800 mb-1">Name *</label>
        <input
          type="text"
          placeholder="Search additives..."
          value={searchQuery}
          onChange={(e) => {
            handleCustomEntry(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={inputClass}
          autoComplete="off"
        />

        {isOpen && (
          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-parchment-300/80 bg-parchment-50 shadow-[0_4px_16px_rgba(46,14,29,0.12)]">
            {Object.entries(filteredByCategory).map(([category, items]) => (
              <div key={category}>
                <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-parchment-600 font-medium">
                  {category}
                </p>
                {items.map((additive) => (
                  <button
                    key={additive.name}
                    type="button"
                    onClick={() => selectAdditive(additive)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-wine-50 transition-colors"
                  >
                    <span className="text-wine-800">{additive.name}</span>
                    {additive.description && (
                      <span className="text-parchment-600 ml-1.5 text-xs">{additive.description}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}

            {Object.keys(filteredByCategory).length === 0 && searchQuery.trim() && (
              <p className="px-3 py-2 text-sm text-parchment-600">
                No matches. Using &ldquo;{searchQuery}&rdquo; as custom entry.
              </p>
            )}

            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => {
                  handleCustomEntry(searchQuery);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm border-t border-parchment-300/60 text-parchment-600 hover:bg-wine-50 transition-colors"
              >
                Use custom: &ldquo;{searchQuery}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dosage info */}
      {selectedAdditive && (selectedAdditive.dosageRange || selectedAdditive.dosageNotes) && (
        <div className="rounded-md bg-parchment-100 border border-parchment-300/60 px-3 py-2">
          {selectedAdditive.dosageRange && (
            <p className="text-xs text-parchment-700">
              <span className="font-medium text-wine-700">Dosage:</span> {selectedAdditive.dosageRange}
            </p>
          )}
          {selectedAdditive.dosageNotes && (
            <p className="text-xs text-parchment-600 mt-0.5">{selectedAdditive.dosageNotes}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            placeholder="2.5"
            value={(data.amount as number) ?? ""}
            onChange={(e) => onChange({ ...data, amount: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 font-mono text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-1">Unit</label>
          <input
            type="text"
            placeholder="g, mL, oz..."
            value={(data.unit as string) ?? ""}
            onChange={(e) => onChange({ ...data, unit: e.target.value || undefined })}
            className={inputClass}
          />
        </div>
      </div>

      {/* Oak-specific fields */}
      {showOakFields && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium text-wine-800 mb-1">Format</label>
            <select
              value={(data.oakFormat as string) ?? ""}
              onChange={(e) => onChange({ ...data, oakFormat: e.target.value || undefined })}
              className={inputClass}
            >
              <option value="">Select...</option>
              {OAK_FORMATS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-wine-800 mb-1">Toast</label>
            <select
              value={(data.oakToast as string) ?? ""}
              onChange={(e) => onChange({ ...data, oakToast: e.target.value || undefined })}
              className={inputClass}
            >
              <option value="">Select...</option>
              {OAK_TOASTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-wine-800 mb-1">Origin</label>
            <select
              value={(data.oakOrigin as string) ?? ""}
              onChange={(e) => onChange({ ...data, oakOrigin: e.target.value || undefined })}
              className={inputClass}
            >
              <option value="">Select...</option>
              {OAK_ORIGINS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">Notes</label>
        <textarea
          rows={2}
          placeholder="Optional notes..."
          value={(data.notes as string) ?? ""}
          onChange={(e) => onChange({ ...data, notes: e.target.value || undefined })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50 resize-none"
        />
      </div>
    </div>
  );
}
