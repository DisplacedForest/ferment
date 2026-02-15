import { NextResponse } from "next/server";
import { getPollingStatus } from "@/lib/hydrometer/polling-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getPollingStatus();
  return NextResponse.json(status);
}
