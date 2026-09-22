export default function CrowdfundingLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-32 rounded-md bg-muted animate-pulse" />
          <div className="h-10 w-40 rounded-md bg-muted animate-pulse" />
        </div>
      </div>

      {/* Campaign card grid skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card shadow-sm overflow-hidden"
          >
            {/* Image placeholder */}
            <div className="aspect-video w-full bg-muted animate-pulse" />

            <div className="p-4 space-y-3">
              {/* Category badge */}
              <div className="h-5 w-24 rounded-full bg-muted animate-pulse" />

              {/* Title */}
              <div className="h-6 w-3/4 rounded-md bg-muted animate-pulse" />

              {/* Description */}
              <div className="space-y-1">
                <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
                <div className="h-4 w-2/3 rounded-md bg-muted animate-pulse" />
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-muted animate-pulse" />
                <div className="flex justify-between">
                  <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
                  <div className="h-4 w-10 rounded-md bg-muted animate-pulse" />
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4">
                <div className="h-4 w-12 rounded-md bg-muted animate-pulse" />
                <div className="h-4 w-16 rounded-md bg-muted animate-pulse" />
              </div>

              {/* Creator */}
              <div className="h-3 w-20 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
