export default function CampaignDetailLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      {/* Wallet button area */}
      <div className="flex justify-end mb-4">
        <div className="h-10 w-36 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Main campaign detail skeleton */}
      <div className="space-y-6">
        {/* Image */}
        <div className="aspect-video w-full rounded-lg bg-muted animate-pulse" />

        {/* Title and status */}
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-5 w-28 rounded-full bg-muted animate-pulse" />
            <div className="h-8 w-2/3 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
          <div className="flex justify-between">
            <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
            <div className="h-5 w-12 rounded-md bg-muted animate-pulse" />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-8">
          <div className="space-y-1">
            <div className="h-6 w-16 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="h-6 w-16 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="h-6 w-16 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-6 w-32 rounded-md bg-muted animate-pulse" />
          <div className="space-y-1">
            <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
