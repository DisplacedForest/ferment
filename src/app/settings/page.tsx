import { HydrometerManager } from "@/components/settings/HydrometerManager";
import { TiltImport } from "@/components/settings/TiltImport";
import { TiltPollingConfig } from "@/components/settings/TiltPollingConfig";

export default function Settings() {
  return (
    <div className="pt-8 sm:pt-16">
      <div className="mb-10">
        <h1 className="font-display text-3xl tracking-tight text-wine-800 sm:text-4xl">
          Settings
        </h1>
        <p className="mt-1 text-parchment-700">
          Device integrations and data management.
        </p>
      </div>

      <div className="space-y-8">
        {/* Tilt polling config */}
        <div className="rounded-md border border-parchment-300/80 bg-parchment-50 px-6 py-6">
          <TiltPollingConfig />
        </div>

        {/* Hydrometer manager */}
        <div className="rounded-md border border-parchment-300/80 bg-parchment-50 px-6 py-6">
          <HydrometerManager />
        </div>

        {/* Import */}
        <div className="rounded-md border border-parchment-300/80 bg-parchment-50 px-6 py-6">
          <TiltImport />
        </div>
      </div>
    </div>
  );
}
