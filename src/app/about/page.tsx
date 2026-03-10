import Image from 'next/image';

export default function SlidingScalePage() {
  return (
    <div className="min-h-screen bg-black pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        {/* About Us Section */}
        <div className="mb-24">
          <div className="mb-12">
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
              Who We Are
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              About Us
            </h1>
            <div className="w-16 h-[2px] bg-white mt-6" />
          </div>

          <div className="border border-white/10 p-8 md:p-12 max-w-4xl">
            <div className="max-w-none">
              <p className="text-xl text-white font-semibold mb-6">
                Box Stream TV is a streaming platform that hosts Pay-Per-View events for professional, amateur and youth boxing.
              </p>

              <p className="text-lg text-gray-400 mb-6 leading-relaxed">
                Box Stream TV was born from a simple observation: boxing promoters are great at packing the house, but what about all the fans who can&apos;t make it to the venue? And let&apos;s be honest—getting quality event footage shouldn&apos;t cost an arm and a leg.
              </p>

              <p className="text-lg text-gray-400 mb-6 leading-relaxed">
                That&apos;s where we come in. Founded by <span className="text-white font-semibold">Ryan Ross</span> (sports video production pro with years in the game) and <span className="text-white font-semibold">Hunter Coleman</span> (full-stack developer and tech wizard), Box Stream TV offers a solution that&apos;s a win-win for everyone.
              </p>

              {/* Team Photo */}
              <div className="my-10 flex justify-center">
                <div className="group relative w-full max-w-2xl overflow-visible cursor-default">
                  <div className="absolute inset-0 border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.5),0_0_30px_rgba(255,255,255,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.8),0_0_60px_rgba(255,255,255,0.5),0_0_100px_rgba(255,255,255,0.3)]" />
                  <Image
                    src="/about-image.PNG"
                    alt="Ryan Ross and Hunter Coleman - Box Stream TV founders"
                    width={800}
                    height={600}
                    className="w-full h-auto"
                    priority
                  />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-4">Here&apos;s how it works:</h2>
              <p className="text-lg text-gray-400 mb-6 leading-relaxed">
                We stream your event live and split the PPV revenue with you. You get professional, multi-camera coverage, we capture high-quality footage you can use to promote future events, and fans around the world get to watch the action—everyone wins.
              </p>

              <p className="text-lg text-gray-400 mb-6 leading-relaxed">
                Ryan brings the cameras, the skills, and years of production know-how. Hunter brings the tech to make sure your stream runs smoothly every single time. Together, we make streaming your event easy and profitable.
              </p>

              <div className="mt-8 p-6 border-l-2 border-white bg-white/[0.03]">
                <p className="text-xl font-bold text-white mb-2">Want to see how we can help?</p>
                <p className="text-gray-400">Book a free 30-minute call with us. Let&apos;s talk about making your next event bigger, better, and more accessible.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Sharing Section */}
        <div className="mb-12">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
            Partnership
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Revenue Sharing Program
          </h2>
          <div className="w-16 h-[2px] bg-white mt-6" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Table */}
          <div className="border border-white/10 p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Revenue Split Table</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-xs font-bold tracking-[0.2em] uppercase text-gray-400">Purchases</th>
                    <th className="text-center py-3 px-4 text-xs font-bold tracking-[0.2em] uppercase text-gray-400">You Get</th>
                    <th className="text-center py-3 px-4 text-xs font-bold tracking-[0.2em] uppercase text-gray-400">We Get</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { range: '0 - 99', you: '0%', us: '100%' },
                    { range: '100 - 1,000', you: '20%', us: '80%' },
                    { range: '1,001 - 2,000', you: '30%', us: '70%' },
                    { range: '2,001 - 3,000', you: '40%', us: '60%' },
                    { range: '3,001 - 4,000', you: '50%', us: '50%' },
                    { range: '4,001 - 5,000', you: '60%', us: '40%' },
                    { range: '5,001 - 6,000', you: '70%', us: '30%' },
                    { range: '6,001+', you: '80%', us: '20%' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                      <td className="py-4 px-4">{row.range}</td>
                      <td className="text-center py-4 px-4 font-bold text-white">{row.you}</td>
                      <td className="text-center py-4 px-4 text-gray-500">{row.us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Revenue Examples (at $19.99/PPV)</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>1,001 purchases = <span className="text-white font-semibold">$6,003</span> for you (30% of $20,010)</li>
                <li>2,001 purchases = <span className="text-white font-semibold">$16,000</span> for you (40% of $40,000)</li>
                <li>5,001 purchases = <span className="text-white font-semibold">$69,979</span> for you (70% of $99,970)</li>
              </ul>
            </div>
          </div>

          {/* Right Side - Bullet Points */}
          <div className="border border-white/10 p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Why This Works</h2>

            <ul className="space-y-6 text-gray-400">
              {[
                {
                  title: 'Leverage Your Following:',
                  text: "If you have 5,000 followers and promote this option, it's just a matter of time until those numbers grow.",
                },
                {
                  title: 'Zero Risk:',
                  text: 'If there are no results, the worst case outcome is you get great highlight reels to promote for door ticket sales.',
                },
                {
                  title: 'Growing Revenue:',
                  text: 'As you hit higher purchase tiers, your percentage increases—you keep more of what you earn.',
                },
                {
                  title: 'Professional Content:',
                  text: 'Every event gives you promotional material to build your brand and attract more fans.',
                },
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <span className="text-white text-lg flex-shrink-0 mt-0.5">&mdash;</span>
                  <div>
                    <span className="text-white font-bold">{item.title}</span> {item.text}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
