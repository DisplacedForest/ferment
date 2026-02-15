"use client";

interface ReadingFormProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function ReadingForm({ data, onChange }: ReadingFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">Gravity</label>
        <input
          type="number"
          step="0.001"
          placeholder="1.045"
          value={(data.gravity as number) ?? ""}
          onChange={(e) => onChange({ ...data, gravity: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 font-mono text-lg text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-1">Temperature</label>
          <input
            type="number"
            step="0.1"
            placeholder="68"
            value={(data.temperature as number) ?? ""}
            onChange={(e) => onChange({ ...data, temperature: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 font-mono text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-1">Unit</label>
          <select
            value={(data.temperatureUnit as string) ?? "F"}
            onChange={(e) => onChange({ ...data, temperatureUnit: e.target.value })}
            className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          >
            <option value="F">°F</option>
            <option value="C">°C</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">pH</label>
        <input
          type="number"
          step="0.01"
          placeholder="3.5"
          value={(data.ph as number) ?? ""}
          onChange={(e) => onChange({ ...data, ph: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 font-mono text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">Notes</label>
        <textarea
          rows={2}
          placeholder="Optional notes about this reading..."
          value={(data.notes as string) ?? ""}
          onChange={(e) => onChange({ ...data, notes: e.target.value || undefined })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50 resize-none"
        />
      </div>
    </div>
  );
}
