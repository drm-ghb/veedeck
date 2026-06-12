export default function RenderflowLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-muted rounded-lg" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
        <div className="h-9 w-36 bg-muted rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        <div className="h-9 w-28 bg-muted rounded-md mb-px" />
        <div className="h-9 w-32 bg-muted rounded-md mb-px" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-9 flex-1 bg-muted rounded-lg" />
        <div className="h-9 w-9 bg-muted rounded-md" />
        <div className="h-9 w-28 bg-muted rounded-md hidden sm:block" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_140px_200px_96px] gap-4 px-5 py-3 bg-muted/50 border-b border-border">
          {[120, 80, 140, 60].map((w, i) => (
            <div key={i} className={`h-3 bg-muted rounded ${i === 3 ? "ml-auto" : ""}`} style={{ width: w }} />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_200px_96px] gap-4 px-5 py-4 items-center ${i !== 5 ? "border-b border-border" : ""}`}>
            <div className="space-y-1.5">
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="h-3 w-1/3 bg-muted rounded" />
            </div>
            <div className="hidden sm:block h-4 w-24 bg-muted rounded" />
            <div className="hidden sm:flex gap-2">
              <div className="h-6 w-20 bg-muted rounded-md" />
              <div className="h-6 w-16 bg-muted rounded-md" />
            </div>
            <div className="flex items-center justify-end gap-1">
              <div className="h-7 w-16 bg-muted rounded-md" />
              <div className="h-7 w-7 bg-muted rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
