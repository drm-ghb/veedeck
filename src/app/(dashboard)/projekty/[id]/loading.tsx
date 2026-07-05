export default function ProjectLoading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-2 bg-muted rounded" />
        <div className="h-4 w-36 bg-muted rounded" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-muted rounded-lg" />
          <div className="h-4 w-40 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="h-9 w-28 bg-muted rounded-lg" />
          <div className="h-9 w-36 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Tabs + view toggle */}
      <div className="flex items-center gap-2 border-b border-border mb-6">
        <div className="flex items-center gap-0.5 flex-1">
          <div className="h-9 w-24 bg-muted rounded-md mb-px" />
          <div className="h-9 w-32 bg-muted rounded-md mb-px" />
          <div className="h-9 w-32 bg-muted rounded-md mb-px" />
        </div>
        <div className="h-7 w-16 bg-muted rounded-md mb-1" />
      </div>

      {/* Room cards grid — matches grid-cols-2 md:grid-cols-3 lg:grid-cols-4 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-4">
            {/* Icon box */}
            <div className="w-14 h-14 bg-muted rounded-xl" />
            {/* Name */}
            <div className="space-y-1">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
