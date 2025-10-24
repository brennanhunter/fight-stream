export default function SlidingScalePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-black to-secondary/90 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center">
          Revenue Sharing Program
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Table */}
          <div className="bg-black/40 backdrop-blur-sm border-2 border-accent/20 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Revenue Split Table</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b-2 border-accent/30">
                    <th className="text-left py-3 px-4 font-bold text-accent">Purchases</th>
                    <th className="text-center py-3 px-4 font-bold text-accent">You Get</th>
                    <th className="text-center py-3 px-4 font-bold text-accent">We Get</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10 hover:bg-primary/10 transition-colors">
                    <td className="py-4 px-4">0 - 99</td>
                    <td className="text-center py-4 px-4 font-bold">0%</td>
                    <td className="text-center py-4 px-4">100%</td>
                  </tr>
                  <tr className="border-b border-white/10 hover:bg-primary/10 transition-colors">
                    <td className="py-4 px-4">100 - 1,000</td>
                    <td className="text-center py-4 px-4 font-bold text-green-400">20%</td>
                    <td className="text-center py-4 px-4">80%</td>
                  </tr>
                  <tr className="border-b border-white/10 hover:bg-primary/10 transition-colors">
                    <td className="py-4 px-4">1,001 - 2,000</td>
                    <td className="text-center py-4 px-4 font-bold text-green-400">30%</td>
                    <td className="text-center py-4 px-4">70%</td>
                  </tr>
                  <tr className="border-b border-white/10 hover:bg-primary/10 transition-colors">
                    <td className="py-4 px-4">2,001 - 3,000</td>
                    <td className="text-center py-4 px-4 font-bold text-green-400">40%</td>
                    <td className="text-center py-4 px-4">60%</td>
                  </tr>
                  <tr className="border-b border-white/10 hover:bg-primary/10 transition-colors">
                    <td className="py-4 px-4">3,001 - 4,000</td>
                    <td className="text-center py-4 px-4 font-bold text-green-400">50%</td>
                    <td className="text-center py-4 px-4">50%</td>
                  </tr>
                  <tr className="border-b border-white/10 hover:bg-primary/10 transition-colors">
                    <td className="py-4 px-4">4,001 - 5,000</td>
                    <td className="text-center py-4 px-4 font-bold text-green-400">60%</td>
                    <td className="text-center py-4 px-4">40%</td>
                  </tr>
                  <tr className="border-b border-white/10 hover:bg-primary/10 transition-colors">
                    <td className="py-4 px-4">5,001 - 6,000</td>
                    <td className="text-center py-4 px-4 font-bold text-green-400">70%</td>
                    <td className="text-center py-4 px-4">30%</td>
                  </tr>
                  <tr className="hover:bg-primary/10 transition-colors">
                    <td className="py-4 px-4">6,001+</td>
                    <td className="text-center py-4 px-4 font-bold text-green-400">80%</td>
                    <td className="text-center py-4 px-4">20%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-6 border-t border-accent/20">
              <h3 className="text-lg font-bold text-white mb-4">Revenue Examples (at $21.99/PPV)</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• 1,001 purchases = $6,604 for you (30% of $22,012)</li>
                <li>• 2,001 purchases = $17,601 for you (40% of $44,002)</li>
                <li>• 5,001 purchases = $76,980 for you (70% of $109,972)</li>
              </ul>
            </div>
          </div>

          {/* Right Side - Bullet Points */}
          <div className="bg-black/40 backdrop-blur-sm border-2 border-primary/20 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Why This Works</h2>
            
            <ul className="space-y-6 text-gray-300">
              <li className="flex gap-4">
                <span className="text-accent text-2xl flex-shrink-0">•</span>
                <div>
                  <span className="text-white font-bold">Leverage Your Following:</span> If you have 5,000 followers and promote this option, it&apos;s just a matter of time until those numbers grow.
                </div>
              </li>
              
              <li className="flex gap-4">
                <span className="text-accent text-2xl flex-shrink-0">•</span>
                <div>
                  <span className="text-white font-bold">Zero Risk:</span> If there are no results, the worst case outcome is you get great highlight reels to promote for door ticket sales.
                </div>
              </li>
              
              <li className="flex gap-4">
                <span className="text-accent text-2xl flex-shrink-0">•</span>
                <div>
                  <span className="text-white font-bold">Growing Revenue:</span> As you hit higher purchase tiers, your percentage increases—you keep more of what you earn.
                </div>
              </li>
              
              <li className="flex gap-4">
                <span className="text-accent text-2xl flex-shrink-0">•</span>
                <div>
                  <span className="text-white font-bold">Professional Content:</span> Every event gives you promotional material to build your brand and attract more fans.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
