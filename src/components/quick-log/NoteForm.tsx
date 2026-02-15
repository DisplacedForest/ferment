"use client";

interface NoteFormProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function NoteForm({ data, onChange }: NoteFormProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-wine-800 mb-1">Note *</label>
      <textarea
        rows={4}
        placeholder="What's happening with this batch?"
        value={(data.content as string) ?? ""}
        onChange={(e) => onChange({ ...data, content: e.target.value })}
        className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50 resize-none"
      />
    </div>
  );
}
