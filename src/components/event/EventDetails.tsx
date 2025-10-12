export default function EventDetails() {
  return (
    <section className="py-16 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Event <span className="text-accent">Details</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Havoc at the Hilton - November 8, 2025
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Event Info */}
          <div className="space-y-8">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-accent/20">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="w-8 h-8 bg-accent rounded-full flex items-center justify-center mr-3">
                  📅
                </span>
                Date & Time
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Date:</span>
                  <span className="text-white font-semibold">November 8, 2025</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Doors Open:</span>
                  <span className="text-white font-semibold">5:30 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">First Bell:</span>
                  <span className="text-white font-semibold">6:00 PM</span>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-accent/20">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="w-8 h-8 bg-accent rounded-full flex items-center justify-center mr-3">
                  🏟️
                </span>
                Venue Information
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Venue:</span>
                  <span className="text-white font-semibold">The Hilton</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Address:</span>
                  <span className="text-white font-semibold">350 Northlake Blvd</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Location:</span>
                  <span className="text-white font-semibold">Altamonte Springs, FL 32701</span>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-accent/20">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="w-8 h-8 bg-accent rounded-full flex items-center justify-center mr-3">
                  🥊
                </span>
                Event Information
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Event:</span>
                  <span className="text-white font-semibold">Havoc at the Hilton</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Presented by:</span>
                  <span className="text-white font-semibold">4 Man Crew</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Category:</span>
                  <span className="text-white font-semibold">Boxing</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Poster */}
          <div className="space-y-8">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-accent/20">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Official Event Poster</h3>
              <div className="rounded-xl overflow-hidden">
                <img 
                  src="/event-posters/havoc-hilton-poster.JPG" 
                  alt="Havoc at Hilton Event Poster" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-accent/20 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Watch Live</h3>
              <p className="text-gray-300 mb-4">
                Stream live from The Hilton in Altamonte Springs
              </p>
              <button className="bg-accent hover:bg-accent/90 text-black font-semibold py-3 px-8 rounded-lg transition-colors">
                Get Access - $19.99
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}