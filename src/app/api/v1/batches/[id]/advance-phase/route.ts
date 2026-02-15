import { NextRequest, NextResponse } from "next/server";
import { getBatchByUuid, advancePhase } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await getBatchByUuid(id);

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const result = await advancePhase(batch.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/v1/batches/[id]/advance-phase error:", err);
    return NextResponse.json({ error: "Failed to advance phase" }, { status: 500 });
  }
}
