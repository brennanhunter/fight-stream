export default function EventDetails() {
  return (
    <section className="py-16 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Event <span className="text-accent">Details</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Everything you need to know about the event
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
                  <span className="text-white font-semibold">December 31, 2025</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Time:</span>
                  <span className="text-white font-semibold">8:00 PM EST</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Duration:</span>
                  <span className="text-white font-semibold">~4 hours</span>
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
                  <span className="text-gray-300">Arena:</span>
                  <span className="text-white font-semibold">MGM Grand Garden Arena</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Location:</span>
                  <span className="text-white font-semibold">Las Vegas, Nevada</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Capacity:</span>
                  <span className="text-white font-semibold">17,000 seats</span>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-accent/20">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="w-8 h-8 bg-accent rounded-full flex items-center justify-center mr-3">
                  🎥
                </span>
                Broadcast Details
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Production:</span>
                  <span className="text-white font-semibold">Live in 4K Ultra HD</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Commentary:</span>
                  <span className="text-white font-semibold">Expert Analysis</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Languages:</span>
                  <span className="text-white font-semibold">English, Spanish</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Content */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 border border-accent/20">
              <h3 className="text-2xl font-bold text-white mb-6">What&apos;s Included</h3>
              <ul className="space-y-3">
                {[
                  "Complete live fight card",
                  "Pre-fight ceremonies & walkouts",
                  "Post-fight interviews",
                  "Behind-the-scenes access",
                  "Instant replay capabilities",
                  "Multi-camera angle views",
                  "Expert commentary team",
                  "Real-time fight statistics"
                ].map((feature, index) => (
                  <li key={index} className="flex items-center text-white">
                    <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-accent/20">
              <h3 className="text-2xl font-bold text-white mb-6">Special Features</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-accent/10 rounded-xl">
                  <div className="text-3xl mb-2">🎬</div>
                  <h4 className="font-semibold text-white">Multi-Cam</h4>
                  <p className="text-sm text-gray-300">Choose your angle</p>
                </div>
                <div className="text-center p-4 bg-accent/10 rounded-xl">
                  <div className="text-3xl mb-2">📊</div>
                  <h4 className="font-semibold text-white">Live Stats</h4>
                  <p className="text-sm text-gray-300">Real-time data</p>
                </div>
                <div className="text-center p-4 bg-accent/10 rounded-xl">
                  <div className="text-3xl mb-2">💬</div>
                  <h4 className="font-semibold text-white">Live Chat</h4>
                  <p className="text-sm text-gray-300">Fan interaction</p>
                </div>
                <div className="text-center p-4 bg-accent/10 rounded-xl">
                  <div className="text-3xl mb-2">⏪</div>
                  <h4 className="font-semibold text-white">Replays</h4>
                  <p className="text-sm text-gray-300">Instant access</p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-accent/20">
              <h3 className="text-2xl font-bold text-white mb-4">Need Help?</h3>
              <p className="text-gray-300 mb-4">
                Our support team is available 24/7 to help with technical issues or questions.
              </p>
              <button className="bg-accent hover:bg-accent/90 text-black font-semibold py-2 px-6 rounded-lg transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}