import { cn } from "@/lib/utils";
import type { BatchPhase } from "@/types";

interface PhaseIndicatorProps {
  phases: BatchPhase[];
  variant?: "compact" | "detailed";
  currentPhaseId?: number | null;
}

function segmentClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-wine-500";
    case "active":
      return "bg-wine-400 animate-pulse";
    case "skipped":
      return "bg-parchment-400 opacity-50";
    default:
      return "bg-parchment-300";
  }
}

export function PhaseIndicator({
  phases,
  variant = "compact",
  currentPhaseId,
}: PhaseIndicatorProps) {
  if (phases.length === 0) return null;

  const isCompact = variant === "compact";

  return (
    <div>
      <div className={cn("flex gap-0.5", isCompact ? "h-1.5" : "h-2")}>
        {phases.map((phase) => (
          <div
            key={phase.id}
            className={cn("flex-1 rounded-sm", segmentClass(phase.status))}
          />
        ))}
      </div>
      {!isCompact && (
        <div className="mt-1.5 flex gap-0.5">
          {phases.map((phase) => (
            <div key={phase.id} className="flex-1 text-center">
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  phase.id === currentPhaseId
                    ? "font-medium text-wine-800"
                    : "text-parchment-600"
                )}
              >
                {phase.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
