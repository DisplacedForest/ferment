import { NextRequest, NextResponse } from "next/server";
import { getBatchByUuid, updateBatch, archiveBatch } from "@/lib/queries";

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

    return NextResponse.json(batch);
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
