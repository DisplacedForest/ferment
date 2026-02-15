export type BatchStatus = "planning" | "active" | "completed" | "archived";

export type TimelineEntryType =
  | "reading"
  | "addition"
  | "rack"
  | "taste"
  | "phase_change"
  | "note"
  | "alert";

export type TimelineSource = "manual" | "tilt" | "ispindel" | "rapt" | "api";

export type RackMethod = "siphon" | "pump" | "gravity";

export type AlertType = "stuck_fermentation" | "temperature" | "overdue_action" | "custom";
export type AlertSeverity = "info" | "warning" | "critical";

export interface ReadingData {
  type: "reading";
  gravity?: number;
  temperature?: number;
  temperatureUnit?: "F" | "C";
  ph?: number;
  notes?: string;
}

export interface AdditionData {
  type: "addition";
  name: string;
  amount?: number;
  unit?: string;
  notes?: string;
}

export interface RackData {
  type: "rack";
  fromVessel?: string;
  toVessel?: string;
  method?: RackMethod;
  volumeLoss?: number;
  volumeLossUnit?: "gal" | "L";
  notes?: string;
}

export interface TasteData {
  type: "taste";
  appearance?: string;
  aroma?: string;
  flavor?: string;
  overall?: string;
  notes?: string;
}

export interface NoteData {
  type: "note";
  content: string;
}

export interface PhaseChangeData {
  type: "phase_change";
  fromPhase?: string;
  toPhase: string;
  notes?: string;
}

export interface AlertData {
  type: "alert";
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  resolved?: boolean;
  resolvedAt?: string;
}

export type TimelineEntryData =
  | ReadingData
  | AdditionData
  | RackData
  | TasteData
  | NoteData
  | PhaseChangeData
  | AlertData;

export interface Batch {
  id: number;
  uuid: string;
  name: string;
  style: string | null;
  status: BatchStatus;
  targetVolume: number | null;
  targetVolumeUnit: "gal" | "L" | null;
  yeastStrain: string | null;
  originalGravity: number | null;
  finalGravity: number | null;
  parentBatchIds: string[] | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TimelineEntry {
  id: number;
  batchId: number;
  entryType: TimelineEntryType;
  source: TimelineSource;
  data: TimelineEntryData;
  createdAt: string;
  createdBy: string | null;
}

export interface BatchWithComputed extends Batch {
  latestGravity?: number;
  latestTemperature?: number;
  abv?: number;
  daysSinceStart?: number;
  entryCount?: number;
}
