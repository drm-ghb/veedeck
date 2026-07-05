export default function RoomLoading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-2 bg-muted rounded" />
        <div className="h-4 w-28 bg-muted rounded" />
        <div className="h-4 w-2 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-lg" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="h-9 w-28 bg-muted rounded-lg" />
          <div className="h-9 w-28 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Tabs + view toggle */}
      <div className="flex items-center justify-between border-b border-border mb-6">
        <div className="flex items-center gap-1">
          <div className="h-9 w-20 bg-muted rounded-md mb-px" />
          <div className="h-9 w-32 bg-muted rounded-md mb-px" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-16 bg-muted rounded-md" />
        </div>
      </div>

      {/* Folders row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border p-3 space-y-2">
            <div className="h-8 w-8 bg-muted rounded-lg" />
            <div className="h-3.5 w-3/4 bg-muted rounded" />
            <div className="h-3 w-1/2 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Renders grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            <div className="aspect-video bg-muted" />
            <div className="p-2 space-y-1">
              <div className="h-3.5 w-4/5 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
