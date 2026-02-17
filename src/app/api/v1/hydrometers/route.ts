import { NextRequest, NextResponse } from "next/server";
import { getHydrometers, createHydrometer, getLatestReadingByHydrometer, getSetting } from "@/lib/queries";
import type { HydrometerType, Hydrometer, HydrometerStatus, HydrometerWithStatus } from "@/types";

export const dynamic = "force-dynamic";

const DEFAULT_POLL_INTERVAL_S = 900;

function deriveStatus(lastSeenAt: string | null, pollIntervalS: number): { status: HydrometerStatus; minutesSince: number | null } {
  if (!lastSeenAt) return { status: "unknown", minutesSince: null };

  const msSince = Date.now() - new Date(lastSeenAt).getTime();
  const minutesSince = Math.round(msSince / 60000);

  // "live" = data received within 2x the poll interval
  if (msSince <= pollIntervalS * 2 * 1000) return { status: "live", minutesSince };
  // "waiting" = registered and has reported before, but not recently
  return { status: "waiting", minutesSince };
}

async function enrichWithStatus(items: Hydrometer[]): Promise<HydrometerWithStatus[]> {
  const pollIntervalStr = await getSetting("tilt.pollInterval");
  const pollIntervalS = pollIntervalStr ? parseInt(pollIntervalStr, 10) : DEFAULT_POLL_INTERVAL_S;

  return Promise.all(
    items.map(async (h) => {
      const { status, minutesSince } = deriveStatus(h.lastSeenAt, pollIntervalS);
      const latest = await getLatestReadingByHydrometer(h.id);

      return {
        ...h,
        status,
        lastGravity: latest?.gravity ?? null,
        lastTemperature: latest?.temperature ?? null,
        minutesSinceLastReading: minutesSince,
      };
    })
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get("active") === "true";
    const withStatus = searchParams.get("status") !== "false";
    const items = await getHydrometers(activeOnly || undefined);

    if (withStatus) {
      const enriched = await enrichWithStatus(items);
      return NextResponse.json(enriched);
    }

    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/v1/hydrometers error:", err);
    return NextResponse.json({ error: "Failed to fetch hydrometers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const validTypes: HydrometerType[] = ["tilt", "ispindel", "rapt", "other"];
    if (!body.type || !validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.identifier || typeof body.identifier !== "string" || body.identifier.trim() === "") {
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
    }

    const hydrometer = await createHydrometer({
      name: body.name.trim(),
      type: body.type,
      identifier: body.identifier.trim(),
      calibrationOffset: body.calibrationOffset ?? 0,
    });

    return NextResponse.json(hydrometer, { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/hydrometers error:", err);
    return NextResponse.json({ error: "Failed to create hydrometer" }, { status: 500 });
  }
}
