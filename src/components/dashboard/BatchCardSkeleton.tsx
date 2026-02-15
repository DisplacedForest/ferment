export function BatchCardSkeleton() {
  return (
    <div className="animate-pulse rounded-md border border-parchment-300/50 bg-parchment-50/60 px-5 py-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-5 w-36 rounded-sm bg-parchment-300/30" />
          <div className="mt-2 h-3 w-20 rounded-sm bg-parchment-300/20" />
        </div>
        <div className="h-5 w-14 rounded-full bg-parchment-300/20" />
      </div>
      <div className="mt-4 flex gap-4">
        <div className="h-5 w-20 rounded-sm bg-parchment-300/30" />
        <div className="h-4 w-12 rounded-sm bg-parchment-300/20" />
      </div>
      <div className="mt-3 flex justify-between">
        <div className="h-3 w-24 rounded-sm bg-parchment-300/20" />
        <div className="h-3 w-12 rounded-sm bg-parchment-300/20" />
      </div>
      <div className="mt-3 flex gap-0.5">
        {[1, 2, 3, 4, 5].map((seg) => (
          <div key={seg} className="h-1.5 flex-1 rounded-sm bg-parchment-300/25" />
        ))}
      </div>
    </div>
  );
}
