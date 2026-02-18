import { cn } from "@/lib/utils";
import type { BatchStatus } from "@/types";

const statusStyles: Record<BatchStatus, string> = {
  active: "bg-[var(--batch-accent-100,_#f0e0e6)] text-[var(--batch-accent-700,_#5c2038)] border-[var(--batch-accent-200,_#ddbcc7)]",
  completed: "bg-[#e8f0e8] text-[#3d6b40] border-[#c8ddc9]",
  planning: "bg-parchment-200 text-parchment-800 border-parchment-400",
  archived: "bg-parchment-200/60 text-parchment-700/60 border-parchment-300/60",
};

const statusLabels: Record<BatchStatus, string> = {
  active: "Active",
  completed: "Completed",
  planning: "Planning",
  archived: "Archived",
};

export function StatusBadge({ status }: { status: BatchStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        statusStyles[status]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
