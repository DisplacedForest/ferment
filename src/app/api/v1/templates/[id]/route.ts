import { NextRequest, NextResponse } from "next/server";
import { getTemplateById, updateTemplate, deleteTemplate } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getTemplateById(parseInt(id, 10));

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (err) {
    console.error("GET /api/v1/templates/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getTemplateById(parseInt(id, 10));

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = await updateTemplate(template.id, body);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/v1/templates/[id] error:", err);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getTemplateById(parseInt(id, 10));

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (template.isBuiltin) {
      return NextResponse.json({ error: "Cannot delete built-in templates" }, { status: 403 });
    }

    await deleteTemplate(template.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/v1/templates/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
