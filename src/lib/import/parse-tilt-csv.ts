export interface TiltCSVRow {
  timestamp: string;
  beer: string;
  temperature: number;
  gravity: number;
  color: string;
}

/**
 * Parse CSV from TiltPi's /log.csv endpoint or Google Sheets export.
 * Expected columns: Time, Timepoint, Temp, SG, Beer, Color, Comment, RSSI, Uptime
 * Filters out rows with sentinel values (999°F temp = no data, SG outside 0.9–1.2).
 *
 * Pure function — no server dependencies. Safe to use client-side.
 */
export function parseTiltCSV(csvText: string): TiltCSVRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

  // TiltPi log.csv uses "time" for human-readable timestamp
  const timestampIdx = header.findIndex((h) =>
    h === "time" || h === "timepoint" || h === "timestamp" || h === "date"
  );
  const beerIdx = header.findIndex((h) => h === "beer" || h === "name");
  const tempIdx = header.findIndex((h) => h === "temp" || h === "temperature");
  const sgIdx = header.findIndex((h) => h === "sg" || h === "gravity" || h === "specific gravity");
  const colorIdx = header.findIndex((h) => h === "color");

  if (timestampIdx === -1 || sgIdx === -1) {
    throw new Error(
      "CSV must have at least a timestamp column (Time/Timepoint) and a gravity column (SG)"
    );
  }

  const rows: TiltCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);

    const timestampRaw = cols[timestampIdx]?.trim();
    const sgRaw = cols[sgIdx]?.trim();

    if (!timestampRaw || !sgRaw) continue;

    const gravity = parseFloat(sgRaw);
    // Filter invalid gravity (outside fermentation range)
    if (isNaN(gravity) || gravity < 0.9 || gravity > 1.2) continue;

    const timestamp = parseTimestamp(timestampRaw);
    if (!timestamp) continue;

    const temperature = tempIdx !== -1 ? parseFloat(cols[tempIdx]?.trim() ?? "") : NaN;
    // Filter sentinel temperature (999 = TiltPi "no data")
    const validTemp = !isNaN(temperature) && temperature < 200 && temperature > 0
      ? temperature
      : 0;

    const beer = beerIdx !== -1 ? cols[beerIdx]?.trim() ?? "" : "";
    const color = colorIdx !== -1 ? cols[colorIdx]?.trim().toLowerCase() ?? "" : "";

    rows.push({
      timestamp,
      beer,
      temperature: validTemp,
      gravity,
      color,
    });
  }

  return rows;
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseTimestamp(raw: string): string | null {
  // Try ISO format first
  const isoDate = new Date(raw);
  if (!isNaN(isoDate.getTime()) && raw.includes("-")) return isoDate.toISOString();

  // TiltPi format: "MM/DD/YYYY  HH:MM:SS" (may have double spaces)
  const usMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?\s*(AM|PM)?$/i
  );
  if (usMatch) {
    const [, month, day, year, hourStr, min, sec, ampm] = usMatch;
    let hour = parseInt(hourStr, 10);
    if (ampm) {
      if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
      if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
    }
    const d = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      hour,
      parseInt(min, 10),
      parseInt(sec ?? "0", 10)
    );
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}
