import { NextRequest, NextResponse } from "next/server";
import {
  getBatchByUuid,
  getAllReadingsForCleanup,
  markReadingsExcluded,
  markReadingsIncluded,
  applyTrimBoundaries,
  getLatestHydrometerReading,
} from "@/lib/queries";
import { detectOutliers, type ReadingPoint } from "@/lib/hydrometer/outlier-detection";
import { db } from "@/db";
import { batches, timelineEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await getBatchByUuid(id);
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Get all readings including excluded ones
    const readings = await getAllReadingsForCleanup(batch.id);

    // Run auto-detection
    const points: ReadingPoint[] = readings.map((r) => ({
      id: r.id,
      gravity: r.gravity,
      recordedAt: r.recordedAt,
    }));

    const detection = detectOutliers(points);

    return NextResponse.json({
      readings,
      detection,
      trimStart: batch.trimStart,
      trimEnd: batch.trimEnd,
    });
  } catch (err) {
    console.error("GET /api/v1/batches/[id]/cleanup error:", err);
    return NextResponse.json({ error: "Failed to fetch cleanup data" }, { status: 500 });
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
    const {
      excludeIds = [],
      includeIds = [],
      excludeReason = "outlier_auto",
      trimStart = null,
      trimEnd = null,
    } = body;

    // Mark readings as excluded/included
    if (excludeIds.length > 0) {
      await markReadingsExcluded(excludeIds, excludeReason);
    }
    if (includeIds.length > 0) {
      await markReadingsIncluded(includeIds);
    }

    // Apply trim boundaries
    await applyTrimBoundaries(batch.id, trimStart, trimEnd);

    // Regenerate affected daily recaps
    // Delete existing recaps for this batch and regenerate
    if (excludeIds.length > 0 || includeIds.length > 0) {
      // Delete all existing daily_recap entries for this batch
      await db
        .delete(timelineEntries)
        .where(
          and(
            eq(timelineEntries.batchId, batch.id),
            eq(timelineEntries.entryType, "daily_recap")
          )
        );

      // Recaps will be lazily regenerated on next timeline load via generateMissingRecaps
    }

    // Update originalGravity if the first (non-excluded) reading changed
    const latestFirst = await getLatestHydrometerReading(batch.id);
    if (latestFirst) {
      // Get the earliest non-excluded reading
      const allReadings = await getAllReadingsForCleanup(batch.id);
      const firstClean = allReadings.find((r) => !r.isExcluded);
      if (firstClean && batch.originalGravity !== firstClean.gravity) {
        await db
          .update(batches)
          .set({
            originalGravity: firstClean.gravity,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(batches.id, batch.id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/v1/batches/[id]/cleanup error:", err);
    return NextResponse.json({ error: "Failed to apply cleanup" }, { status: 500 });
  }
}
