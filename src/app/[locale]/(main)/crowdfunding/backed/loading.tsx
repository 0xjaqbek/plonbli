export default function BackedCampaignsLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="h-8 w-48 rounded-md bg-muted animate-pulse mb-6" />
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
                <div className="h-5 w-48 rounded-md bg-muted animate-pulse" />
              </div>
              <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
              <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
