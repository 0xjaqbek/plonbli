export default function CreateCampaignLoading() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="h-8 w-48 rounded-md bg-muted animate-pulse mb-6" />
      <div className="space-y-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
            <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
          </div>
        ))}
        <div className="h-10 w-32 rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  );
}
