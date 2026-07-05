export default function FolderLoading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-2 bg-muted rounded" />
        <div className="h-4 w-28 bg-muted rounded" />
        <div className="h-4 w-2 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-2 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-muted rounded-lg" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
        <div className="h-9 w-28 bg-muted rounded-lg self-end sm:self-auto" />
      </div>

      {/* Tabs + view toggle */}
      <div className="flex items-center justify-between border-b border-border mb-6">
        <div className="flex items-center gap-1">
          <div className="h-9 w-20 bg-muted rounded-md mb-px" />
          <div className="h-9 w-32 bg-muted rounded-md mb-px" />
        </div>
        <div className="h-7 w-16 bg-muted rounded-md mb-1" />
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
