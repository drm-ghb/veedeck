export default function RenderViewerLoading() {
  return (
    <div className="fixed inset-0 top-[57px] z-20 bg-background flex flex-col animate-pulse">
      {/* Header bar */}
      <div className="border-b bg-card flex-shrink-0 px-4 py-2.5 flex items-center gap-3">
        {/* Back arrow */}
        <div className="h-5 w-5 bg-muted rounded flex-shrink-0" />
        <div className="w-px h-4 bg-muted flex-shrink-0" />
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-3 w-3 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-3 w-3 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
        {/* Toolbar actions */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <div className="h-8 w-24 bg-muted rounded-md" />
          <div className="h-8 w-28 bg-muted rounded-md" />
          <div className="h-8 w-8 bg-muted rounded-md" />
          <div className="h-8 w-8 bg-muted rounded-md" />
          <div className="h-8 w-8 bg-muted rounded-md" />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left thumbnail sidebar */}
        <div className="hidden md:flex w-44 border-r bg-card flex-col gap-2 p-2 flex-shrink-0">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-video bg-muted rounded-lg" />
          ))}
        </div>

        {/* Main image area */}
        <div className="flex-1 bg-muted/10 flex items-center justify-center">
          <div className="w-2/3 max-w-xl aspect-video bg-muted rounded-lg" />
        </div>

        {/* Right comments panel */}
        <div className="hidden md:flex w-80 border-l bg-card flex-col flex-shrink-0">
          {/* Panel header */}
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="ml-auto h-4 w-4 bg-muted rounded" />
          </div>
          {/* Comment rows */}
          <div className="flex-1 p-3 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="h-7 w-7 bg-muted rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-1/2 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-4/5 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
