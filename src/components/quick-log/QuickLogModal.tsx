"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Thermometer,
  Flask,
  ArrowsLeftRight,
  Wine,
  Notepad,
} from "@phosphor-icons/react";
import { ReadingForm } from "./ReadingForm";
import { AdditionForm } from "./AdditionForm";
import { RackForm } from "./RackForm";
import { TasteForm } from "./TasteForm";
import { NoteForm } from "./NoteForm";
import { cn } from "@/lib/utils";

const entryTypes = [
  { value: "reading", label: "Reading", icon: Thermometer },
  { value: "addition", label: "Addition", icon: Flask },
  { value: "rack", label: "Rack", icon: ArrowsLeftRight },
  { value: "taste", label: "Taste", icon: Wine },
  { value: "note", label: "Note", icon: Notepad },
] as const;

type EntryTypeValue = (typeof entryTypes)[number]["value"];

const formComponents: Record<
  EntryTypeValue,
  React.ComponentType<{ data: Record<string, unknown>; onChange: (data: Record<string, unknown>) => void }>
> = {
  reading: ReadingForm,
  addition: AdditionForm,
  rack: RackForm,
  taste: TasteForm,
  note: NoteForm,
};

interface QuickLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchUuid: string;
  onEntryCreated: () => void;
}

export function QuickLogModal({
  open,
  onOpenChange,
  batchUuid,
  onEntryCreated,
}: QuickLogModalProps) {
  const [activeType, setActiveType] = useState<EntryTypeValue>("reading");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [createdBy, setCreatedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load createdBy from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ferment-user-name");
    if (saved) setCreatedBy(saved);
  }, []);

  // Reset form when type changes or modal opens
  useEffect(() => {
    setFormData({});
    setError(null);
  }, [activeType, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Persist createdBy
    if (createdBy.trim()) {
      localStorage.setItem("ferment-user-name", createdBy.trim());
    }

    try {
      const res = await fetch(`/api/v1/batches/${batchUuid}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: activeType,
          data: formData,
          createdBy: createdBy.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Something went wrong");
        return;
      }

      onEntryCreated();
      onOpenChange(false);
    } catch {
      setError("Failed to save. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const FormComponent = formComponents[activeType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-wine-800">
            Log entry
          </DialogTitle>
          <DialogDescription className="text-sm text-parchment-700">
            What happened with this batch?
          </DialogDescription>
        </DialogHeader>

        {/* Type selector */}
        <div className="flex rounded border border-parchment-300/80 bg-parchment-50 p-0.5 gap-0.5">
          {entryTypes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveType(value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-sm px-1 py-2 text-[11px] font-medium transition-colors",
                activeType === value
                  ? "bg-wine-500 text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)]"
                  : "text-parchment-700 hover:text-wine-600"
              )}
            >
              <Icon size={18} weight="regular" />
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormComponent data={formData} onChange={setFormData} />

          {/* Created by */}
          <div className="border-t border-parchment-300/60 pt-4">
            <label className="block text-xs font-medium text-parchment-700 mb-1">
              Logged by
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="w-full rounded-md border border-parchment-300/80 bg-parchment-50 px-3 py-1.5 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-[#a04040]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded border border-parchment-300/80 px-4 py-2 text-sm font-medium text-parchment-800/70 transition-colors hover:border-parchment-400 hover:text-wine-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-wine-500 px-4 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 active:bg-wine-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
