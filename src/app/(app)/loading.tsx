// Shown the instant you tap a link, while the next page is prepared, so the app never feels frozen.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-3" role="status" aria-label="Loading">
      <div className="h-7 w-1/2 rounded-lg bg-gray-200" />
      <div className="h-24 rounded-2xl bg-gray-100" />
      <div className="h-16 rounded-2xl bg-gray-100" />
      <div className="h-16 rounded-2xl bg-gray-100" />
    </div>
  )
}
