export default function ProduktyLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="h-8 w-36 bg-muted rounded-lg" />
        <div className="h-9 w-32 bg-muted rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-px">
        {[80, 96, 88, 104].map((w, i) => (
          <div key={i} className={`h-9 bg-muted rounded-md`} style={{ width: w }} />
        ))}
      </div>

      {/* Search + actions */}
      <div className="flex items-center gap-2">
        <div className="h-9 flex-1 bg-muted rounded-lg" />
        <div className="h-9 w-9 bg-muted rounded-lg" />
        <div className="h-9 w-9 bg-muted rounded-lg" />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border">
            <div className="aspect-square bg-muted" />
            <div className="p-2 space-y-1.5">
              <div className="h-3.5 w-4/5 bg-muted rounded" />
              <div className="h-3 w-2/3 bg-muted rounded" />
              <div className="h-3.5 w-1/2 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
