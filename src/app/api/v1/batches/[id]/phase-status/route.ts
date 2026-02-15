import { NextRequest, NextResponse } from "next/server";
import {
  getBatchByUuid,
  getPhasesByBatchId,
  getActionsByPhaseId,
  getTimelineEntries,
} from "@/lib/queries";
import { evaluatePhase } from "@/lib/phase-engine";

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

    if (!batch.currentPhaseId) {
      return NextResponse.json({ error: "Batch has no active phase" }, { status: 404 });
    }

    const phases = await getPhasesByBatchId(batch.id);
    const activePhase = phases.find((p) => p.id === batch.currentPhaseId);

    if (!activePhase) {
      return NextResponse.json({ error: "Active phase not found" }, { status: 404 });
    }

    const actions = await getActionsByPhaseId(activePhase.id);
    const { entries } = await getTimelineEntries(batch.id, { limit: 100 });

    const evaluation = evaluatePhase(activePhase, actions, entries);

    return NextResponse.json(evaluation);
  } catch (err) {
    console.error("GET /api/v1/batches/[id]/phase-status error:", err);
    return NextResponse.json({ error: "Failed to evaluate phase" }, { status: 500 });
  }
}
