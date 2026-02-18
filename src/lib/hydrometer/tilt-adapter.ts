import {
  getHydrometerByTypeAndIdentifier,
  getBatchesWithHydrometer,
  createHydrometerReading,
} from "@/lib/queries";

// Tilt UUID-to-color mapping (byte 4 of the iBeacon UUID)
// Reference: https://kvurd.com/blog/tilt-hydrometer-ibeacon-data-format/
const TILT_UUID_COLOR_MAP: Record<string, string> = {
  "a495bb10c5b14b44b5121370f02d74de": "red",
  "a495bb20c5b14b44b5121370f02d74de": "green",
  "a495bb30c5b14b44b5121370f02d74de": "black",
  "a495bb40c5b14b44b5121370f02d74de": "purple",
  "a495bb50c5b14b44b5121370f02d74de": "orange",
  "a495bb60c5b14b44b5121370f02d74de": "blue",
  "a495bb70c5b14b44b5121370f02d74de": "yellow",
  "a495bb80c5b14b44b5121370f02d74de": "pink",
};

// Raw response from TiltPi /tiltscan endpoint
interface TiltScanEntry {
  uuid: string;
  major: number;   // temperature in °F (raw from iBeacon)
  minor: number;   // gravity × 1000 (e.g. 1082 = 1.082 SG)
  tx_power: number;
  rssi: number;
  mac: string;
}

export interface ParsedTiltReading {
  color: string;
  temperature: number;
  gravity: number;
  rssi: number;
  mac: string;
  raw: TiltScanEntry;
}

export function parseTiltScanResponse(data: TiltScanEntry[]): ParsedTiltReading[] {
  const readings: ParsedTiltReading[] = [];

  for (const entry of data) {
    const uuid = entry.uuid?.toLowerCase().replace(/-/g, "");
    const color = TILT_UUID_COLOR_MAP[uuid];
    if (!color) continue;

    // major = temp °F, minor = SG × 1000
    const temperature = entry.major;
    const gravity = entry.minor / 1000;

    // Skip clearly invalid data (999°F = no-data sentinel from TiltPi)
    if (temperature >= 200 || temperature <= 0) continue;
    if (gravity <= 0.9 || gravity > 1.2) continue;

    readings.push({
      color,
      temperature,
      gravity,
      rssi: entry.rssi,
      mac: entry.mac,
      raw: entry,
    });
  }

  return readings;
}

export async function pollTiltPi(url: string): Promise<ParsedTiltReading[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    throw new Error(`TiltPi responded with ${res.status}`);
  }
  const data: TiltScanEntry[] = await res.json();

  if (!Array.isArray(data)) {
    throw new Error("Unexpected TiltPi response format — expected an array");
  }

  return parseTiltScanResponse(data);
}

export async function processTiltReadings(readings: ParsedTiltReading[]): Promise<number> {
  let ingested = 0;
  const now = new Date().toISOString();

  for (const reading of readings) {
    // Find matching hydrometer by type + identifier (color name)
    const hydrometer = await getHydrometerByTypeAndIdentifier("tilt", reading.color);
    if (!hydrometer || !hydrometer.isActive) continue;

    // Apply calibration offset
    const calibratedGravity = reading.gravity + hydrometer.calibrationOffset;

    // Find active batch linked to this hydrometer
    const activeBatches = await getBatchesWithHydrometer(hydrometer.id);

    if (activeBatches.length === 0) {
      // No active batch — store as unlinked reading for later backfill
      await createHydrometerReading({
        batchId: null,
        hydrometerId: hydrometer.id,
        gravity: calibratedGravity,
        temperature: reading.temperature,
        tempUnit: "F",
        rawData: reading.raw as unknown as Record<string, unknown>,
        recordedAt: now,
      });
      ingested++;
      continue;
    }

    if (activeBatches.length > 1) {
      console.warn(
        `[tilt] Hydrometer ${hydrometer.id} (${reading.color}) is linked to ${activeBatches.length} active batches — writing to batch ${activeBatches[0].id} only`
      );
    }

    await createHydrometerReading({
      batchId: activeBatches[0].id,
      hydrometerId: hydrometer.id,
      gravity: calibratedGravity,
      temperature: reading.temperature,
      tempUnit: "F",
      rawData: reading.raw as unknown as Record<string, unknown>,
      recordedAt: now,
    });
    ingested++;
  }

  return ingested;
}
