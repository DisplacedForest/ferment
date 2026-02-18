import { NextRequest, NextResponse } from "next/server";
import {
  getBatchByUuid,
  createHydrometerReading,
  getHydrometerReadings,
  getLatestHydrometerReading,
  getPhasesByBatchId,
  getTimelineEntries,
  createTimelineEntry,
} from "@/lib/queries";
import { runAlertDetection } from "@/lib/alert-detection";
import type { AlertData } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await getBatchByUuid(id);
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const resolution = (searchParams.get("resolution") ?? "raw") as "raw" | "hourly" | "daily";
    const includeExcluded = searchParams.get("includeExcluded") === "true";

    const readings = await getHydrometerReadings(batch.id, { from, to, resolution, includeExcluded });
    const latest = await getLatestHydrometerReading(batch.id);

    return NextResponse.json({ readings, latest });
  } catch (err) {
    console.error("GET /api/v1/batches/[id]/readings error:", err);
    return NextResponse.json({ error: "Failed to fetch readings" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await getBatchByUuid(id);
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.hydrometerId || typeof body.hydrometerId !== "number") {
      return NextResponse.json({ error: "hydrometerId is required" }, { status: 400 });
    }

    if (!body.gravity || typeof body.gravity !== "number" || body.gravity <= 0) {
      return NextResponse.json({ error: "gravity must be a positive number" }, { status: 400 });
    }

    const reading = await createHydrometerReading({
      batchId: batch.id,
      hydrometerId: body.hydrometerId,
      gravity: body.gravity,
      temperature: body.temperature,
      tempUnit: body.tempUnit ?? "F",
      rawData: body.rawData,
      recordedAt: body.recordedAt ?? new Date().toISOString(),
    });

    // Run alert detection
    try {
      const { entries: recentEntries } = await getTimelineEntries(batch.id, { limit: 20 });
      const phases = await getPhasesByBatchId(batch.id);
      const currentPhase = phases.find((p) => p.id === batch.currentPhaseId) ?? null;

      const alerts = runAlertDetection(recentEntries, currentPhase);

      for (const alert of alerts) {
        const recentSameAlert = recentEntries.find((e) => {
          if (e.entryType !== "alert") return false;
          const data = e.data as unknown as AlertData;
          if (data.alertType !== alert.alertType) return false;
          const ageMs = Date.now() - new Date(e.createdAt).getTime();
          return ageMs < 86400000;
        });

        if (!recentSameAlert) {
          await createTimelineEntry(batch.id, {
            entryType: "alert",
            source: "system",
            data: alert,
          });
        }
      }
    } catch (alertErr) {
      console.error("Alert detection error (non-fatal):", alertErr);
    }

    return NextResponse.json(reading, { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/batches/[id]/readings error:", err);
    return NextResponse.json({ error: "Failed to create reading" }, { status: 500 });
  }
}
