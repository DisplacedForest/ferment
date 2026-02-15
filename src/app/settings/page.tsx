export default function Settings() {
  return (
    <div className="pt-8 sm:pt-16">
      <div className="mb-10">
        <h1 className="font-display text-3xl tracking-tight text-wine-800 sm:text-4xl">
          Settings
        </h1>
        <p className="mt-1 text-parchment-700">
          Nothing to configure yet.
        </p>
      </div>

      <div className="rounded-md border border-parchment-300/80 bg-parchment-50 px-6 py-10 sm:px-10">
        <p className="text-sm leading-relaxed text-parchment-800/60">
          Preferences, integrations, and account stuff will live here
          once there&apos;s something worth configuring.
        </p>
      </div>
    </div>
  );
}
