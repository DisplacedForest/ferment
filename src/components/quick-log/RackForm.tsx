"use client";

interface RackFormProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function RackForm({ data, onChange }: RackFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-1">From vessel</label>
          <input
            type="text"
            placeholder="Primary fermenter"
            value={(data.fromVessel as string) ?? ""}
            onChange={(e) => onChange({ ...data, fromVessel: e.target.value || undefined })}
            className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-1">To vessel</label>
          <input
            type="text"
            placeholder="Glass carboy"
            value={(data.toVessel as string) ?? ""}
            onChange={(e) => onChange({ ...data, toVessel: e.target.value || undefined })}
            className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">Method</label>
        <select
          value={(data.method as string) ?? ""}
          onChange={(e) => onChange({ ...data, method: e.target.value || undefined })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
        >
          <option value="">Select method...</option>
          <option value="siphon">Siphon</option>
          <option value="pump">Pump</option>
          <option value="gravity">Gravity</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-1">Volume loss</label>
          <input
            type="number"
            step="0.1"
            placeholder="0.5"
            value={(data.volumeLoss as number) ?? ""}
            onChange={(e) => onChange({ ...data, volumeLoss: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 font-mono text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-1">Unit</label>
          <select
            value={(data.volumeLossUnit as string) ?? "gal"}
            onChange={(e) => onChange({ ...data, volumeLossUnit: e.target.value })}
            className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          >
            <option value="gal">gal</option>
            <option value="L">L</option>
          </select>
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
