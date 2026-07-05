export default function ListDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-3 bg-muted rounded" />
        <div className="h-4 w-36 bg-muted rounded" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-muted rounded-lg" />
          <div className="h-4 w-36 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-muted rounded-lg" />
          <div className="h-9 w-28 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Section 1 */}
      <div className="space-y-3">
        <div className="h-6 w-40 bg-muted rounded-lg" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border p-4 flex items-center gap-4">
              <div className="h-14 w-14 bg-muted rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="h-3.5 w-1/3 bg-muted rounded" />
              </div>
              <div className="h-5 w-20 bg-muted rounded shrink-0" />
              <div className="h-8 w-8 bg-muted rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 */}
      <div className="space-y-3">
        <div className="h-6 w-32 bg-muted rounded-lg" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border p-4 flex items-center gap-4">
              <div className="h-14 w-14 bg-muted rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/5 bg-muted rounded" />
                <div className="h-3.5 w-1/4 bg-muted rounded" />
              </div>
              <div className="h-5 w-20 bg-muted rounded shrink-0" />
              <div className="h-8 w-8 bg-muted rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
