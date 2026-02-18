// ---------------------------------------------------------------------------
// Tilt Outlier Detection & Trimming — Pure Functions
// ---------------------------------------------------------------------------
// Detects head/tail outliers and mid-log spikes in hydrometer readings using
// a rolling median + MAD approach. No database dependencies.
// ---------------------------------------------------------------------------

export interface ReadingPoint {
  id: number;
  gravity: number;
  recordedAt: string;
}

export interface OutlierFlag {
  id: number;
  gravity: number;
  recordedAt: string;
  deviation: number;
  reason: "head_trim" | "tail_trim" | "outlier_auto";
}

export interface OutlierDetectionResult {
  headOutliers: OutlierFlag[];
  tailOutliers: OutlierFlag[];
  midLogOutliers: OutlierFlag[];
  cleanRangeStart: string | null;
  cleanRangeEnd: string | null;
  totalFlagged: number;
}

export interface OutlierDetectionOptions {
  /** Window size for rolling median (default 7) */
  windowSize?: number;
  /** SG deviation threshold from median to flag mid-log outliers (default 0.010) */
  midLogThreshold?: number;
  /** SG deviation threshold from neighbors for small datasets (default 0.020) */
  smallDatasetThreshold?: number;
  /** Number of readings to check at head/tail (default 5) */
  headTailCheckSize?: number;
  /** Reference window size for head/tail median comparison (default 8) */
  headTailRefSize?: number;
}

const DEFAULTS: Required<OutlierDetectionOptions> = {
  windowSize: 7,
  midLogThreshold: 0.010,
  smallDatasetThreshold: 0.020,
  headTailCheckSize: 5,
  headTailRefSize: 8,
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function rollingMedian(gravities: number[], windowSize: number): number[] {
  const half = Math.floor(windowSize / 2);
  return gravities.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(gravities.length, i + half + 1);
    return median(gravities.slice(start, end));
  });
}

export function detectOutliers(
  readings: ReadingPoint[],
  options?: OutlierDetectionOptions
): OutlierDetectionResult {
  const opts = { ...DEFAULTS, ...options };
  const result: OutlierDetectionResult = {
    headOutliers: [],
    tailOutliers: [],
    midLogOutliers: [],
    cleanRangeStart: null,
    cleanRangeEnd: null,
    totalFlagged: 0,
  };

  if (readings.length < 3) return result;

  const gravities = readings.map((r) => r.gravity);

  // Small dataset: skip head/tail detection, only flag absolute outliers
  if (readings.length < 14) {
    for (let i = 0; i < readings.length; i++) {
      const neighbors: number[] = [];
      if (i > 0) neighbors.push(gravities[i - 1]);
      if (i < gravities.length - 1) neighbors.push(gravities[i + 1]);
      const neighborMedian = median(neighbors);
      const dev = Math.abs(gravities[i] - neighborMedian);

      if (dev > opts.smallDatasetThreshold) {
        result.midLogOutliers.push({
          id: readings[i].id,
          gravity: readings[i].gravity,
          recordedAt: readings[i].recordedAt,
          deviation: dev,
          reason: "outlier_auto",
        });
      }
    }

    result.totalFlagged = result.midLogOutliers.length;
    return result;
  }

  // Head detection: compare first N readings against reference median
  const refStart = opts.headTailCheckSize;
  const refEnd = refStart + opts.headTailRefSize;
  const headRefMedian = median(gravities.slice(refStart, Math.min(refEnd, gravities.length)));

  for (let i = 0; i < Math.min(opts.headTailCheckSize, readings.length); i++) {
    const dev = Math.abs(gravities[i] - headRefMedian);
    if (dev > opts.midLogThreshold) {
      result.headOutliers.push({
        id: readings[i].id,
        gravity: readings[i].gravity,
        recordedAt: readings[i].recordedAt,
        deviation: dev,
        reason: "head_trim",
      });
    } else {
      break; // Stop at first non-outlier
    }
  }

  // Tail detection: same logic in reverse
  const tailRefEnd = gravities.length - opts.headTailCheckSize;
  const tailRefStart = tailRefEnd - opts.headTailRefSize;
  const tailRefMedian = median(gravities.slice(Math.max(0, tailRefStart), Math.max(0, tailRefEnd)));

  for (let i = readings.length - 1; i >= Math.max(0, readings.length - opts.headTailCheckSize); i--) {
    const dev = Math.abs(gravities[i] - tailRefMedian);
    if (dev > opts.midLogThreshold) {
      result.tailOutliers.push({
        id: readings[i].id,
        gravity: readings[i].gravity,
        recordedAt: readings[i].recordedAt,
        deviation: dev,
        reason: "tail_trim",
      });
    } else {
      break;
    }
  }

  // Mid-log outliers: rolling median + deviation threshold
  const headIds = new Set(result.headOutliers.map((o) => o.id));
  const tailIds = new Set(result.tailOutliers.map((o) => o.id));
  const medians = rollingMedian(gravities, opts.windowSize);

  for (let i = 0; i < readings.length; i++) {
    if (headIds.has(readings[i].id) || tailIds.has(readings[i].id)) continue;

    const dev = Math.abs(gravities[i] - medians[i]);
    if (dev > opts.midLogThreshold) {
      result.midLogOutliers.push({
        id: readings[i].id,
        gravity: readings[i].gravity,
        recordedAt: readings[i].recordedAt,
        deviation: dev,
        reason: "outlier_auto",
      });
    }
  }

  // Suggest clean range
  if (result.headOutliers.length > 0) {
    const lastHead = result.headOutliers[result.headOutliers.length - 1];
    // Clean start = the reading after the last head outlier
    const idx = readings.findIndex((r) => r.id === lastHead.id);
    if (idx >= 0 && idx + 1 < readings.length) {
      result.cleanRangeStart = readings[idx + 1].recordedAt;
    }
  }

  if (result.tailOutliers.length > 0) {
    const firstTail = result.tailOutliers[result.tailOutliers.length - 1]; // reversed order
    const idx = readings.findIndex((r) => r.id === firstTail.id);
    if (idx > 0) {
      result.cleanRangeEnd = readings[idx - 1].recordedAt;
    }
  }

  result.totalFlagged =
    result.headOutliers.length +
    result.tailOutliers.length +
    result.midLogOutliers.length;

  return result;
}
