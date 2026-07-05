export default function ListyLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-muted rounded-lg" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="h-9 w-32 bg-muted rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-border">
        <div className="h-9 w-28 bg-muted rounded-md mb-px" />
        <div className="h-9 w-32 bg-muted rounded-md mb-px" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-9 flex-1 bg-muted rounded-lg" />
        <div className="h-9 w-9 bg-muted rounded-md" />
        <div className="h-9 w-20 bg-muted rounded-md" />
        <div className="h-8 w-16 bg-muted rounded-md" />
      </div>

      {/* List rows */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i !== 5 ? "border-b border-border" : ""}`}>
            <div className="h-9 w-9 bg-muted rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="h-3 w-1/4 bg-muted rounded" />
            </div>
            <div className="h-4 w-20 bg-muted rounded shrink-0" />
            <div className="h-7 w-7 bg-muted rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
