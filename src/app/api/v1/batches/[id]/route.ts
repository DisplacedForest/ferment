import { NextRequest, NextResponse } from "next/server";
import { getBatchByUuid, updateBatch, archiveBatch, getPhasesByBatchId } from "@/lib/queries";

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

    const phases = await getPhasesByBatchId(batch.id);
    const currentPhase = phases.find((p) => p.id === batch.currentPhaseId) ?? null;

    return NextResponse.json({ ...batch, phases, currentPhase });
  } catch (err) {
    console.error("GET /api/v1/batches/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch batch" }, { status: 500 });
  }
}

export async function PATCH(
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
    const updated = await updateBatch(batch.id, body);

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/v1/batches/[id] error:", err);
    return NextResponse.json({ error: "Failed to update batch" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await getBatchByUuid(id);

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    await archiveBatch(batch.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/v1/batches/[id] error:", err);
    return NextResponse.json({ error: "Failed to archive batch" }, { status: 500 });
  }
}
