"use client";

interface TasteFormProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function TasteForm({ data, onChange }: TasteFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">Appearance</label>
        <textarea
          rows={2}
          placeholder="Color, clarity, legs..."
          value={(data.appearance as string) ?? ""}
          onChange={(e) => onChange({ ...data, appearance: e.target.value || undefined })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">Aroma</label>
        <textarea
          rows={2}
          placeholder="What do you smell?"
          value={(data.aroma as string) ?? ""}
          onChange={(e) => onChange({ ...data, aroma: e.target.value || undefined })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">Flavor</label>
        <textarea
          rows={2}
          placeholder="Taste, mouthfeel, finish..."
          value={(data.flavor as string) ?? ""}
          onChange={(e) => onChange({ ...data, flavor: e.target.value || undefined })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">Overall</label>
        <textarea
          rows={2}
          placeholder="General impressions, balance, potential..."
          value={(data.overall as string) ?? ""}
          onChange={(e) => onChange({ ...data, overall: e.target.value || undefined })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">Notes</label>
        <textarea
          rows={2}
          placeholder="Anything else..."
          value={(data.notes as string) ?? ""}
          onChange={(e) => onChange({ ...data, notes: e.target.value || undefined })}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50 resize-none"
        />
      </div>
    </div>
  );
}
