import { NextRequest, NextResponse } from "next/server";
import { getBatches, createBatch } from "@/lib/queries";
import type { BatchStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") as BatchStatus | null;
    const sort = searchParams.get("sort") ?? "updatedAt";

    const validStatuses: BatchStatus[] = ["planning", "active", "completed", "archived"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const allBatches = await getBatches(status ?? undefined);

    // Sort
    if (sort === "name") {
      allBatches.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "createdAt") {
      allBatches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    // default: updatedAt desc (already from query)

    return NextResponse.json(allBatches);
  } catch (err) {
    console.error("GET /api/v1/batches error:", err);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const batch = await createBatch({
      name: body.name.trim(),
      style: body.style?.trim() || undefined,
      status: body.status ?? "active",
      targetVolume: body.targetVolume ?? undefined,
      targetVolumeUnit: body.targetVolumeUnit ?? undefined,
      yeastStrain: body.yeastStrain?.trim() || undefined,
      originalGravity: body.originalGravity ?? undefined,
      notes: body.notes?.trim() || undefined,
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/batches error:", err);
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}
