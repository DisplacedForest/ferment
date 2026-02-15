import {
  Thermometer,
  Flask,
  ArrowsLeftRight,
  Wine,
  Flag,
  Notepad,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import { formatGravity, formatTemperature, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import type { TimelineEntry as TEntry, TimelineEntryData } from "@/types";

const typeConfig: Record<
  string,
  { icon: Icon; color: string; label: string }
> = {
  reading: { icon: Thermometer, color: "border-l-wine-400", label: "Reading" },
  addition: { icon: Flask, color: "border-l-parchment-600", label: "Addition" },
  rack: { icon: ArrowsLeftRight, color: "border-l-[#5a7a8a]", label: "Racking" },
  taste: { icon: Wine, color: "border-l-wine-600", label: "Taste" },
  phase_change: { icon: Flag, color: "border-l-wine-500", label: "Phase change" },
  note: { icon: Notepad, color: "border-l-[#8b7a6e]", label: "Note" },
  alert: { icon: Warning, color: "border-l-[#a04040]", label: "Alert" },
};

function ReadingContent({ data }: { data: TimelineEntryData }) {
  if (data.type !== "reading") return null;
  return (
    <div className="flex flex-wrap items-baseline gap-4">
      {data.gravity != null && (
        <span className="font-mono text-lg text-wine-800">{formatGravity(data.gravity)}</span>
      )}
      {data.temperature != null && (
        <span className="font-mono text-sm text-parchment-700">
          {formatTemperature(data.temperature, data.temperatureUnit)}
        </span>
      )}
      {data.ph != null && (
        <span className="font-mono text-sm text-parchment-700">pH {data.ph}</span>
      )}
      {data.notes && <p className="w-full text-sm text-parchment-800/70 mt-1">{data.notes}</p>}
    </div>
  );
}

function AdditionContent({ data }: { data: TimelineEntryData }) {
  if (data.type !== "addition") return null;
  return (
    <div>
      <p className="text-sm text-wine-800">
        <span className="font-medium">{data.name}</span>
        {data.amount != null && data.unit && (
          <span className="text-parchment-700"> — {data.amount} {data.unit}</span>
        )}
      </p>
      {data.notes && <p className="mt-1 text-sm text-parchment-800/70">{data.notes}</p>}
    </div>
  );
}

function RackContent({ data }: { data: TimelineEntryData }) {
  if (data.type !== "rack") return null;
  return (
    <div>
      <p className="text-sm text-wine-800">
        {data.fromVessel && data.toVessel
          ? `${data.fromVessel} → ${data.toVessel}`
          : data.toVessel
            ? `Into ${data.toVessel}`
            : "Racked"}
        {data.method && <span className="text-parchment-700"> ({data.method})</span>}
      </p>
      {data.volumeLoss != null && (
        <p className="text-sm text-parchment-700">
          Lost {data.volumeLoss} {data.volumeLossUnit ?? "gal"}
        </p>
      )}
      {data.notes && <p className="mt-1 text-sm text-parchment-800/70">{data.notes}</p>}
    </div>
  );
}

function TasteContent({ data }: { data: TimelineEntryData }) {
  if (data.type !== "taste") return null;
  const fields = [
    { label: "Appearance", value: data.appearance },
    { label: "Aroma", value: data.aroma },
    { label: "Flavor", value: data.flavor },
    { label: "Overall", value: data.overall },
  ].filter((f) => f.value);

  return (
    <div className="space-y-1">
      {fields.map((f) => (
        <p key={f.label} className="text-sm">
          <span className="font-medium text-wine-800">{f.label}:</span>{" "}
          <span className="text-parchment-800/80">{f.value}</span>
        </p>
      ))}
      {data.notes && <p className="text-sm text-parchment-800/70">{data.notes}</p>}
    </div>
  );
}

function NoteContent({ data }: { data: TimelineEntryData }) {
  if (data.type !== "note") return null;
  return <p className="text-sm text-parchment-800/80 whitespace-pre-wrap">{data.content}</p>;
}

function PhaseChangeContent({ data }: { data: TimelineEntryData }) {
  if (data.type !== "phase_change") return null;
  return (
    <div>
      <p className="text-sm text-wine-800">
        {data.fromPhase && <span className="text-parchment-700">{data.fromPhase} → </span>}
        <span className="font-medium">{data.toPhase}</span>
      </p>
      {data.notes && <p className="mt-1 text-sm text-parchment-800/70">{data.notes}</p>}
    </div>
  );
}

function AlertContent({ data }: { data: TimelineEntryData }) {
  if (data.type !== "alert") return null;
  return (
    <div>
      <p className="text-sm text-wine-800">{data.message}</p>
      {data.resolved && (
        <p className="mt-1 text-xs text-[#5a8a5e]">Resolved</p>
      )}
    </div>
  );
}

const contentRenderers: Record<string, React.ComponentType<{ data: TimelineEntryData }>> = {
  reading: ReadingContent,
  addition: AdditionContent,
  rack: RackContent,
  taste: TasteContent,
  note: NoteContent,
  phase_change: PhaseChangeContent,
  alert: AlertContent,
};

export function TimelineEntryCard({ entry }: { entry: TEntry }) {
  const config = typeConfig[entry.entryType] ?? typeConfig.note;
  const Icon = config.icon;
  const ContentRenderer = contentRenderers[entry.entryType] ?? NoteContent;

  return (
    <div
      className={cn(
        "border-l-2 pl-4 py-3",
        config.color
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={16} weight="regular" className="text-wine-600 shrink-0" />
        <span className="text-xs font-medium text-parchment-700 uppercase tracking-wide">
          {config.label}
        </span>
        <span className="text-xs text-parchment-700/60 ml-auto">
          {timeAgo(entry.createdAt)}
        </span>
      </div>

      {/* Content */}
      <ContentRenderer data={entry.data} />

      {/* Meta */}
      <div className="mt-2 flex gap-2">
        {entry.source !== "manual" && (
          <span className="inline-flex items-center rounded-full bg-parchment-200 px-2 py-0.5 text-[10px] font-medium text-parchment-700">
            {entry.source}
          </span>
        )}
        {entry.createdBy && (
          <span className="text-[10px] text-parchment-700/60">{entry.createdBy}</span>
        )}
      </div>
    </div>
  );
}
