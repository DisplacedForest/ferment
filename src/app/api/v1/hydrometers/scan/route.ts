import { NextRequest, NextResponse } from "next/server";
import { parseTiltScanResponse } from "@/lib/hydrometer/tilt-adapter";
import { getSetting } from "@/lib/queries";

export const dynamic = "force-dynamic";

const DEFAULT_URL = "http://tiltpi.local:1880/tiltscan";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Priority: query param > DB setting > default
  const savedUrl = await getSetting("tilt.url");
  const url = searchParams.get("url") || savedUrl || DEFAULT_URL;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return NextResponse.json(
        { error: `TiltPi responded with ${res.status}`, devices: [] },
        { status: 502 }
      );
    }

    const raw = await res.json();
    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { error: "Unexpected response format", devices: [] },
        { status: 502 }
      );
    }

    const parsed = parseTiltScanResponse(raw);

    const devices = parsed.map((p) => ({
      color: p.color,
      temperature: p.temperature,
      gravity: p.gravity,
      rssi: p.rssi,
      mac: p.mac,
    }));

    return NextResponse.json({ devices, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Could not reach TiltPi: ${message}`, devices: [] },
      { status: 502 }
    );
  }
}
