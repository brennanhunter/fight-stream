export default function VodLoading() {
  return (
    <section className="min-h-screen bg-black overflow-x-hidden pt-20 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
        <div className="mb-12">
          <div className="h-3 w-16 bg-white/10 rounded mb-3 animate-pulse" />
          <div className="h-10 w-64 bg-white/10 rounded animate-pulse" />
          <div className="w-16 h-[2px] bg-white/10 mt-6" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/5 animate-pulse">
              <div className="aspect-[3/4] bg-white/10" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-white/10 rounded" />
                <div className="h-3 w-1/2 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
