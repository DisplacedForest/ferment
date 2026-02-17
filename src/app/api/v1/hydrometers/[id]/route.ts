import { NextRequest, NextResponse } from "next/server";
import { getHydrometerById, updateHydrometer, deleteHydrometer, getLatestReadingByHydrometer, getSetting } from "@/lib/queries";
import type { HydrometerStatus, HydrometerWithStatus } from "@/types";

export const dynamic = "force-dynamic";

const DEFAULT_POLL_INTERVAL_S = 900;

function deriveStatus(lastSeenAt: string | null, pollIntervalS: number): { status: HydrometerStatus; minutesSince: number | null } {
  if (!lastSeenAt) return { status: "unknown", minutesSince: null };

  const msSince = Date.now() - new Date(lastSeenAt).getTime();
  const minutesSince = Math.round(msSince / 60000);

  if (msSince <= pollIntervalS * 2 * 1000) return { status: "live", minutesSince };
  return { status: "waiting", minutesSince };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const hydrometer = await getHydrometerById(parseInt(id, 10));
    if (!hydrometer) {
      return NextResponse.json({ error: "Hydrometer not found" }, { status: 404 });
    }

    const pollIntervalStr = await getSetting("tilt.pollInterval");
    const pollIntervalS = pollIntervalStr ? parseInt(pollIntervalStr, 10) : DEFAULT_POLL_INTERVAL_S;
    const { status, minutesSince } = deriveStatus(hydrometer.lastSeenAt, pollIntervalS);
    const latest = await getLatestReadingByHydrometer(hydrometer.id);

    const enriched: HydrometerWithStatus = {
      ...hydrometer,
      status,
      lastGravity: latest?.gravity ?? null,
      lastTemperature: latest?.temperature ?? null,
      minutesSinceLastReading: minutesSince,
    };

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("GET /api/v1/hydrometers/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch hydrometer" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const hydrometer = await updateHydrometer(parseInt(id, 10), {
      name: body.name,
      identifier: body.identifier,
      calibrationOffset: body.calibrationOffset,
      isActive: body.isActive,
    });

    if (!hydrometer) {
      return NextResponse.json({ error: "Hydrometer not found" }, { status: 404 });
    }

    return NextResponse.json(hydrometer);
  } catch (err) {
    console.error("PATCH /api/v1/hydrometers/[id] error:", err);
    return NextResponse.json({ error: "Failed to update hydrometer" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getHydrometerById(parseInt(id, 10));
    if (!existing) {
      return NextResponse.json({ error: "Hydrometer not found" }, { status: 404 });
    }
    await deleteHydrometer(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/v1/hydrometers/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete hydrometer" }, { status: 500 });
  }
}
