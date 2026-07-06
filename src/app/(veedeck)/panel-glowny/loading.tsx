export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="h-8 w-52 bg-muted rounded-lg" />
        <div className="h-9 w-36 bg-muted rounded-lg" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-xl" />
            ))}
          </div>

          {/* Projekty */}
          <div className="space-y-3">
            <div className="h-4 w-48 bg-muted rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl bg-muted aspect-[4/3]" />
              ))}
            </div>
          </div>

          {/* Listy */}
          <div className="space-y-3">
            <div className="h-4 w-36 bg-muted rounded" />
            <div className="rounded-xl bg-muted h-28" />
          </div>

        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">

          {/* Kalendarz */}
          <div className="space-y-3">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="rounded-xl bg-muted h-44" />
          </div>

          {/* Nieprzeczytane */}
          <div className="space-y-3">
            <div className="h-4 w-52 bg-muted rounded" />
            <div className="rounded-xl bg-muted h-36" />
          </div>

          {/* Do zrobienia */}
          <div className="space-y-3">
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="rounded-xl bg-muted h-32" />
          </div>

        </div>

      </div>
    </div>
  );
}
