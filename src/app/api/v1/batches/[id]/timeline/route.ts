import { NextRequest, NextResponse } from "next/server";
import { getBatchByUuid, getTimelineEntries, createTimelineEntry } from "@/lib/queries";
import { validateTimelineData } from "@/lib/validation";
import type { TimelineEntryType } from "@/types";

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
    const type = searchParams.get("type") as TimelineEntryType | null;
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const result = await getTimelineEntries(batch.id, {
      type: type ?? undefined,
      limit: Math.min(limit, 100),
      offset: Math.max(offset, 0),
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/v1/batches/[id]/timeline error:", err);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
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

    if (!body.entryType) {
      return NextResponse.json({ error: "entryType is required" }, { status: 400 });
    }

    const validTypes: TimelineEntryType[] = [
      "reading", "addition", "rack", "taste", "phase_change", "note", "alert",
    ];
    if (!validTypes.includes(body.entryType)) {
      return NextResponse.json(
        { error: `Invalid entryType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const validation = validateTimelineData(body.entryType, body.data ?? {});
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const entry = await createTimelineEntry(batch.id, {
      entryType: body.entryType,
      source: body.source,
      data: validation.data,
      createdBy: body.createdBy,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/batches/[id]/timeline error:", err);
    return NextResponse.json({ error: "Failed to create timeline entry" }, { status: 500 });
  }
}
