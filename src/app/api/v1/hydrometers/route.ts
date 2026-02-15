import { NextRequest, NextResponse } from "next/server";
import { getHydrometers, createHydrometer } from "@/lib/queries";
import type { HydrometerType } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get("active") === "true";
    const items = await getHydrometers(activeOnly || undefined);
    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/v1/hydrometers error:", err);
    return NextResponse.json({ error: "Failed to fetch hydrometers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const validTypes: HydrometerType[] = ["tilt", "ispindel", "rapt", "other"];
    if (!body.type || !validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.identifier || typeof body.identifier !== "string" || body.identifier.trim() === "") {
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
    }

    const hydrometer = await createHydrometer({
      name: body.name.trim(),
      type: body.type,
      identifier: body.identifier.trim(),
      calibrationOffset: body.calibrationOffset ?? 0,
    });

    return NextResponse.json(hydrometer, { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/hydrometers error:", err);
    return NextResponse.json({ error: "Failed to create hydrometer" }, { status: 500 });
  }
}
