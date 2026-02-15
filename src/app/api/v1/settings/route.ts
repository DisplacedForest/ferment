import { NextRequest, NextResponse } from "next/server";
import { getSettings, setSetting } from "@/lib/queries";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = [
  "tilt.enabled",
  "tilt.url",
  "tilt.pollInterval",
];

export async function GET() {
  const settings = await getSettings(ALLOWED_KEYS);
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();

  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        { error: `Unknown setting: ${key}` },
        { status: 400 }
      );
    }
    updates[key] = String(value);
  }

  for (const [key, value] of Object.entries(updates)) {
    await setSetting(key, value);
  }

  // If polling config changed, restart polling
  if ("tilt.enabled" in updates || "tilt.url" in updates || "tilt.pollInterval" in updates) {
    try {
      const { restartTiltPolling } = await import("@/lib/hydrometer/polling-service");
      await restartTiltPolling();
    } catch {
      // Polling restart is best-effort
    }
  }

  const settings = await getSettings(ALLOWED_KEYS);
  return NextResponse.json(settings);
}
