"use client";

import { useState, useEffect, useCallback } from "react";
import { Broadcast, ArrowClockwise } from "@phosphor-icons/react";
import { timeAgo } from "@/lib/utils";

interface PollingStatus {
  enabled: boolean;
  running: boolean;
  url: string | null;
  intervalSeconds: number | null;
  lastPollTime: string | null;
  lastPollError: string | null;
}

const INTERVAL_OPTIONS = [
  { value: 60, label: "1 min" },
  { value: 300, label: "5 min" },
  { value: 900, label: "15 min" },
  { value: 1800, label: "30 min" },
  { value: 3600, label: "1 hour" },
];

export function TiltPollingConfig() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<PollingStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState("");
  const [interval, setInterval_] = useState("900");
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchSettings = useCallback(async () => {
    const [settingsRes, statusRes] = await Promise.all([
      fetch("/api/v1/settings"),
      fetch("/api/v1/settings/polling"),
    ]);
    if (settingsRes.ok) {
      const data = await settingsRes.json();
      setSettings(data);
      setUrl(data["tilt.url"] ?? "");
      setInterval_(data["tilt.pollInterval"] ?? "900");
      setEnabled(data["tilt.enabled"] === "true");
    }
    if (statusRes.ok) {
      setStatus(await statusRes.json());
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Refresh status every 30s while polling is active
  useEffect(() => {
    if (!status?.running) return;
    const timer = window.setInterval(async () => {
      const res = await fetch("/api/v1/settings/polling");
      if (res.ok) setStatus(await res.json());
    }, 30000);
    return () => window.clearInterval(timer);
  }, [status?.running]);

  async function handleToggle() {
    setSaving(true);
    const newEnabled = !enabled;
    setEnabled(newEnabled);

    await fetch("/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "tilt.enabled": String(newEnabled) }),
    });

    // Brief delay so polling service has time to start/stop
    await new Promise((r) => setTimeout(r, 500));
    await fetchSettings();
    setSaving(false);
  }

  async function handleSave() {
    setSaving(true);
    const updates: Record<string, string> = {};
    const trimmedUrl = url.trim();

    if (trimmedUrl !== (settings["tilt.url"] ?? "")) {
      updates["tilt.url"] = trimmedUrl;
    }
    if (interval !== (settings["tilt.pollInterval"] ?? "900")) {
      updates["tilt.pollInterval"] = interval;
    }

    if (Object.keys(updates).length > 0) {
      await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await new Promise((r) => setTimeout(r, 500));
      await fetchSettings();
    }

    setSaving(false);
  }

  if (!loaded) {
    return (
      <div className="animate-pulse">
        <div className="h-5 w-40 rounded bg-parchment-200 mb-4" />
        <div className="h-20 rounded bg-parchment-200" />
      </div>
    );
  }

  const hasChanges =
    url.trim() !== (settings["tilt.url"] ?? "") ||
    interval !== (settings["tilt.pollInterval"] ?? "900");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-wine-800">Tilt Polling</h2>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-[#5a8a5e]" : "bg-parchment-400"
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-parchment-50 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Status indicator */}
      {status && enabled && (
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status.running
                ? "bg-[#5a8a5e] animate-pulse"
                : "bg-parchment-400"
            }`}
          />
          <span className="text-xs text-parchment-700">
            {status.running ? "Polling active" : "Not running"}
            {status.lastPollTime && (
              <> &middot; last polled {timeAgo(status.lastPollTime)}</>
            )}
          </span>
          {status.lastPollError && (
            <span className="text-xs text-[#a04040]">
              &middot; {status.lastPollError}
            </span>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-wine-800 mb-1">
            TiltPi URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="http://tiltpi.local:1880/tiltscan"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-md border border-parchment-400 bg-parchment-50 px-3 py-1.5 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50 font-mono"
            />
            <Broadcast
              size={18}
              weight="regular"
              className="self-center text-parchment-500"
            />
          </div>
          <p className="mt-1 text-[11px] text-parchment-600">
            The scan endpoint on your TiltPi. Usually http://tiltpi.local:1880/tiltscan
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-wine-800 mb-1">
            Poll interval
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval_(e.target.value)}
            className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-1.5 text-sm text-wine-800 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={String(opt.value)}>
                Every {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-parchment-600">
            How often to fetch readings from TiltPi. 15 min matches TiltPi&apos;s default logging rate.
          </p>
        </div>

        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded bg-wine-500 px-4 py-1.5 text-xs font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 disabled:opacity-50"
          >
            <ArrowClockwise size={14} weight="bold" className={saving ? "animate-spin" : ""} />
            {saving ? "Saving..." : "Save & restart polling"}
          </button>
        )}
      </div>
    </div>
  );
}
