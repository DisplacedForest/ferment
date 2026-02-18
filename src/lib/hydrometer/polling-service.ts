import { pollTiltPi, processTiltReadings } from "./tilt-adapter";
import { getSetting, setSetting } from "@/lib/queries";

let pollInterval: ReturnType<typeof setInterval> | null = null;
let lastPollTime: string | null = null;
let lastPollError: string | null = null;
let currentUrl: string | null = null;
let currentIntervalMs: number | null = null;

const DEFAULT_URL = "http://tiltpi.local:1880/tiltscan";
const DEFAULT_INTERVAL_S = 900;

async function loadConfig(): Promise<{ enabled: boolean; url: string; intervalMs: number }> {
  const enabled = (await getSetting("tilt.enabled")) === "true";
  const url = (await getSetting("tilt.url")) || DEFAULT_URL;
  const intervalS = parseInt((await getSetting("tilt.pollInterval")) || String(DEFAULT_INTERVAL_S), 10);
  return { enabled, url, intervalMs: intervalS * 1000 };
}

export async function startTiltPolling(): Promise<void> {
  const { enabled, url, intervalMs } = await loadConfig();

  if (!enabled) {
    console.log("[Tilt] Polling disabled");
    return;
  }

  if (!url) {
    console.error("[Tilt] No TiltPi URL configured, cannot start polling");
    return;
  }

  console.log(`[Tilt] Starting polling: ${url} every ${intervalMs / 1000}s`);

  currentUrl = url;
  currentIntervalMs = intervalMs;

  // Poll immediately on start
  runPoll(url);

  pollInterval = setInterval(() => runPoll(url), intervalMs);
}

export function stopTiltPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log("[Tilt] Polling stopped");
  }
}

export async function restartTiltPolling(): Promise<void> {
  stopTiltPolling();
  await startTiltPolling();
}

export async function getPollingStatus(): Promise<{
  enabled: boolean;
  running: boolean;
  url: string | null;
  intervalSeconds: number | null;
  lastPollTime: string | null;
  lastPollError: string | null;
}> {
  const { enabled, url, intervalMs } = await loadConfig();
  const dbLastPollTime = await getSetting("tilt.lastPollTime");
  const running =
    enabled &&
    dbLastPollTime !== null &&
    Date.now() - Date.parse(dbLastPollTime) < 2 * intervalMs;
  return {
    enabled,
    running,
    url: currentUrl ?? url,
    intervalSeconds: currentIntervalMs ? currentIntervalMs / 1000 : intervalMs / 1000,
    lastPollTime: dbLastPollTime ?? lastPollTime,
    lastPollError,
  };
}

async function runPoll(url: string): Promise<void> {
  try {
    const data = await pollTiltPi(url);
    const count = await processTiltReadings(data);
    lastPollTime = new Date().toISOString();
    await setSetting("tilt.lastPollTime", lastPollTime);
    lastPollError = null;
    if (count > 0) {
      console.log(`[Tilt] Ingested ${count} reading(s)`);
    }
  } catch (err) {
    lastPollError = err instanceof Error ? err.message : String(err);
    lastPollTime = new Date().toISOString();
    await setSetting("tilt.lastPollTime", lastPollTime);
    console.error("[Tilt] Poll error:", lastPollError);
  }
}
