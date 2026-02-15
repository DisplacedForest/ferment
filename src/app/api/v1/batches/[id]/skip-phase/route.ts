import { NextRequest, NextResponse } from "next/server";
import { getBatchByUuid, skipPhase } from "@/lib/queries";

export const dynamic = "force-dynamic";

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
    if (!body.phaseId) {
      return NextResponse.json({ error: "phaseId is required" }, { status: 400 });
    }

    const result = await skipPhase(batch.id, body.phaseId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/v1/batches/[id]/skip-phase error:", err);
    return NextResponse.json({ error: "Failed to skip phase" }, { status: 500 });
  }
}
