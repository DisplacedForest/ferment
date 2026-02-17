import { NextRequest, NextResponse } from "next/server";
import {
  getHydrometerById,
  getUnlinkedReadings,
  claimReadingsForBatch,
  getBatchById,
  updateBatch,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const hydrometerId = parseInt(id, 10);
  if (isNaN(hydrometerId)) {
    return NextResponse.json({ error: "Invalid hydrometer ID" }, { status: 400 });
  }

  const hydrometer = await getHydrometerById(hydrometerId);
  if (!hydrometer) {
    return NextResponse.json({ error: "Hydrometer not found" }, { status: 404 });
  }

  const readings = await getUnlinkedReadings(hydrometerId);

  if (readings.length === 0) {
    return NextResponse.json({ readings: [], count: 0 });
  }

  const gravities = readings.map((r) => r.gravity);
  const earliest = readings[0];
  const latest = readings[readings.length - 1];

  return NextResponse.json({
    readings,
    count: readings.length,
    dateRange: {
      from: earliest.recordedAt,
      to: latest.recordedAt,
    },
    sgRange: {
      min: Math.min(...gravities),
      max: Math.max(...gravities),
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const hydrometerId = parseInt(id, 10);
  if (isNaN(hydrometerId)) {
    return NextResponse.json({ error: "Invalid hydrometer ID" }, { status: 400 });
  }

  const body = await request.json();
  const { batchId, readingIds } = body as { batchId: number; readingIds: number[] };

  if (!batchId || !Array.isArray(readingIds) || readingIds.length === 0) {
    return NextResponse.json(
      { error: "batchId and readingIds are required" },
      { status: 400 }
    );
  }

  const hydrometer = await getHydrometerById(hydrometerId);
  if (!hydrometer) {
    return NextResponse.json({ error: "Hydrometer not found" }, { status: 404 });
  }

  const batch = await getBatchById(batchId);
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const claimed = await claimReadingsForBatch(readingIds, batchId);

  // Set OG from earliest claimed reading if batch doesn't have one
  if (!batch.originalGravity && claimed > 0) {
    const { getHydrometerReadings } = await import("@/lib/queries");
    const batchReadings = await getHydrometerReadings(batchId);
    if (batchReadings.length > 0) {
      await updateBatch(batchId, { originalGravity: batchReadings[0].gravity });
    }
  }

  return NextResponse.json({ claimed });
}
