// What a page shows for the instant before its content is ready: the shape of the page, not the word "Loading". It makes the app feel
// quick, because something that looks like the page is there at once. Works for readers, lists and cards alike.
export default function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Loading the page">
      <div className="h-8 w-2/3 rounded-lg bg-gray-200" />
      <div className="h-4 w-1/2 rounded bg-gray-100" />
      <div className="space-y-3 pt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-3">
            <div className="h-4 w-1/4 rounded bg-gray-200" />
            <div className="h-6 w-full rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
