import { NextRequest, NextResponse } from "next/server";
import { getTemplates, createTemplate } from "@/lib/queries";
import type { ProtocolCategory } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category") as ProtocolCategory | null;

    const validCategories: ProtocolCategory[] = ["wine", "beer", "mead", "cider", "other"];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    const templates = await getTemplates(category ?? undefined);
    return NextResponse.json(templates);
  } catch (err) {
    console.error("GET /api/v1/templates error:", err);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (!body.templateData || !body.templateData.phases) {
      return NextResponse.json({ error: "templateData with phases is required" }, { status: 400 });
    }

    const template = await createTemplate({
      name: body.name.trim(),
      description: body.description?.trim(),
      category: body.category,
      templateData: body.templateData,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/templates error:", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
