"use client";

interface AdditionFormProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function AdditionForm({ data, onChange }: AdditionFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">Name *</label>
        <input
          type="text"
          placeholder="Potassium metabisulfite, oak chips..."
          value={(data.name as string) ?? ""}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
        />
      </div>

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
            className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          />
        </div>
      </div>

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
