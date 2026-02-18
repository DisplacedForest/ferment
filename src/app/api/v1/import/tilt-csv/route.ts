import { NextRequest, NextResponse } from "next/server";
import { parseTiltCSV, importTiltData } from "@/lib/import/tilt-csv";
import { getBatchById, getHydrometerById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.csvText || typeof body.csvText !== "string") {
      return NextResponse.json({ error: "csvText is required" }, { status: 400 });
    }

    if (!body.batchId || typeof body.batchId !== "number") {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    // hydrometerId is optional — historical imports may not link to a specific device
    const hydrometerId: number | null = body.hydrometerId ?? null;
    if (hydrometerId !== null && typeof hydrometerId !== "number") {
      return NextResponse.json({ error: "hydrometerId must be a number if provided" }, { status: 400 });
    }

    // Validate batch exists
    const batch = await getBatchById(body.batchId);
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Validate hydrometer exists only when provided
    if (hydrometerId !== null) {
      const hydrometer = await getHydrometerById(hydrometerId);
      if (!hydrometer) {
        return NextResponse.json({ error: "Hydrometer not found" }, { status: 404 });
      }
    }

    // Parse CSV
    let rows;
    try {
      rows = parseTiltCSV(body.csvText);
    } catch (parseErr) {
      return NextResponse.json(
        { error: parseErr instanceof Error ? parseErr.message : "Failed to parse CSV" },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
    }

    // Import
    const result = await importTiltData(rows, body.batchId, hydrometerId);

    return NextResponse.json({
      ...result,
      batchId: body.batchId,
      totalRows: rows.length,
    });
  } catch (err) {
    console.error("POST /api/v1/import/tilt-csv error:", err);
    return NextResponse.json({ error: "Failed to import CSV data" }, { status: 500 });
  }
}
