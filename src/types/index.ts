export type BatchStatus = "planning" | "active" | "completed" | "archived";

export type TimelineEntryType =
  | "reading"
  | "addition"
  | "rack"
  | "taste"
  | "phase_change"
  | "note"
  | "alert"
  | "daily_recap"
  | "hourly_summary";

export type TimelineSource = "manual" | "hydrometer-auto" | "hydrometer-confirmed" | "system" | "api";

export type RackMethod = "siphon" | "pump" | "gravity";

export type AlertType = "stuck_fermentation" | "temperature" | "overdue_action" | "custom";
export type AlertSeverity = "info" | "warning" | "critical";

export type HydrometerType = "tilt" | "ispindel" | "rapt" | "other";

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

export interface DailyRecapData {
  type: "daily_recap";
  date: string;
  openingGravity: number;
  closingGravity: number;
  gravityDelta: number;
  avgTemperature: number | null;
  tempRange: { min: number; max: number } | null;
  tempUnit: "F" | "C";
  readingCount: number;
  dayNumber: number;
}

export interface HourlySummaryData {
  type: "hourly_summary";
  hourLabel: string;
  startGravity: number;
  endGravity: number;
  avgTemperature: number | null;
  tempUnit: "F" | "C";
  readingCount: number;
}

export type TimelineEntryData =
  | ReadingData
  | AdditionData
  | RackData
  | TasteData
  | NoteData
  | PhaseChangeData
  | AlertData
  | DailyRecapData
  | HourlySummaryData;

export interface Hydrometer {
  id: number;
  name: string;
  type: HydrometerType;
  identifier: string;
  calibrationOffset: number;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export type HydrometerStatus = "live" | "waiting" | "unknown";

export interface HydrometerWithStatus extends Hydrometer {
  status: HydrometerStatus;
  lastGravity: number | null;
  lastTemperature: number | null;
  minutesSinceLastReading: number | null;
}

export interface HydrometerReading {
  id: number;
  batchId: number | null;
  hydrometerId: number;
  gravity: number;
  temperature: number | null;
  tempUnit: "F" | "C" | null;
  rawData: Record<string, unknown> | null;
  recordedAt: string;
  createdAt: string;
}

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
  currentPhaseId: number | null;
  hydrometerId: number | null;
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
  phases?: BatchPhase[];
  currentPhase?: BatchPhase | null;
  nextActionName?: string;
  nextActionDueAt?: string;
  overdueActionCount?: number;
  unresolvedAlertCount?: number;
  readyToAdvance?: boolean;
}

// ---------------------------------------------------------------------------
// Phase 2 — Protocol & Phase Types
// ---------------------------------------------------------------------------

export type PhaseStatus = "pending" | "active" | "completed" | "skipped";
export type ProtocolCategory = "wine" | "beer" | "mead" | "cider" | "other";
export type CompletionCriteriaType =
  | "gravity_stable"
  | "duration"
  | "action_count"
  | "manual"
  | "compound";

export interface GravityStableCriteria {
  type: "gravity_stable";
  consecutiveReadings: number;
  toleranceSG: number;
}

export interface DurationCriteria {
  type: "duration";
  minDays: number;
}

export interface ActionCountCriteria {
  type: "action_count";
  actionName: string;
  minCount: number;
}

export interface ManualCriteria {
  type: "manual";
}

export interface CompoundCriteria {
  type: "compound";
  criteria: CompletionCriteria[];
}

export type CompletionCriteria =
  | GravityStableCriteria
  | DurationCriteria
  | ActionCountCriteria
  | ManualCriteria
  | CompoundCriteria;

export interface BatchPhase {
  id: number;
  batchId: number;
  name: string;
  sortOrder: number;
  status: PhaseStatus;
  startedAt: string | null;
  completedAt: string | null;
  expectedDurationDays: number | null;
  targetTempLow: number | null;
  targetTempHigh: number | null;
  targetTempUnit: "F" | "C" | null;
  completionCriteria: CompletionCriteria | null;
  notes: string | null;
}

export interface PhaseAction {
  id: number;
  phaseId: number;
  name: string;
  intervalDays: number | null;
  dueAt: string | null;
  lastCompletedAt: string | null;
  sortOrder: number;
}

export interface ProtocolTemplate {
  id: number;
  name: string;
  description: string | null;
  category: ProtocolCategory;
  templateData: ProtocolTemplateData;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolPhaseTemplate {
  name: string;
  sortOrder: number;
  expectedDurationDays?: number;
  targetTempLow?: number;
  targetTempHigh?: number;
  targetTempUnit?: "F" | "C";
  completionCriteria?: CompletionCriteria;
  actions?: { name: string; intervalDays?: number; sortOrder: number }[];
}

export interface ProtocolTemplateData {
  phases: ProtocolPhaseTemplate[];
}

export interface PhaseEvaluation {
  criteriaMet: boolean;
  criteriaDetails: string;
  nextActions: PhaseAction[];
  overdueActions: PhaseAction[];
  daysInPhase: number;
}
