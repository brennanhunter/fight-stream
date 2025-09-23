export default function TaleOfTheTape() {
  const fighter1 = {
    name: "John \"Thunder\" Davis",
    nickname: "Thunder",
    record: "28-0-0",
    age: 29,
    height: "6'4\"",
    weight: "240 lbs",
    reach: "78\"",
    stance: "Orthodox",
    hometown: "Las Vegas, NV",
    ko: 22
  };

  const fighter2 = {
    name: "Mike \"Iron Fist\" Rodriguez", 
    nickname: "Iron Fist",
    record: "26-2-0",
    age: 31,
    height: "6'2\"",
    weight: "238 lbs", 
    reach: "76\"",
    stance: "Southpaw",
    hometown: "Brooklyn, NY",
    ko: 20
  };

  const stats = [
    { label: "Age", fighter1: fighter1.age, fighter2: fighter2.age },
    { label: "Height", fighter1: fighter1.height, fighter2: fighter2.height },
    { label: "Weight", fighter1: fighter1.weight, fighter2: fighter2.weight },
    { label: "Reach", fighter1: fighter1.reach, fighter2: fighter2.reach },
    { label: "Stance", fighter1: fighter1.stance, fighter2: fighter2.stance },
    { label: "Hometown", fighter1: fighter1.hometown, fighter2: fighter2.hometown },
    { label: "KO/TKO", fighter1: fighter1.ko, fighter2: fighter2.ko }
  ];

  return (
    <section id="fighters" className="py-16 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Tale of the <span className="text-accent">Tape</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            A detailed comparison of both fighters
          </p>
        </div>

        {/* Fighter Headers */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Fighter 1 */}
          <div className="text-center">
            <div className="w-48 h-48 bg-gradient-to-br from-primary to-primary/70 rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-6xl font-bold text-white">JD</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{fighter1.name}</h3>
            <p className="text-accent font-bold text-xl mb-2">Record: {fighter1.record}</p>
            <p className="text-gray-300">Current Champion</p>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl font-bold text-accent mb-4">VS</div>
              <p className="text-white text-lg">Heavyweight Championship</p>
              <p className="text-gray-300">Title Fight</p>
            </div>
          </div>

          {/* Fighter 2 */}
          <div className="text-center">
            <div className="w-48 h-48 bg-gradient-to-br from-accent to-accent/70 rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-6xl font-bold text-black">MR</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{fighter2.name}</h3>
            <p className="text-accent font-bold text-xl mb-2">Record: {fighter2.record}</p>
            <p className="text-gray-300">Top Contender</p>
          </div>
        </div>

        {/* Stats Comparison */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-accent/20">
          <div className="space-y-6">
            {stats.map((stat, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 items-center">
                {/* Fighter 1 Stat */}
                <div className="text-right">
                  <span className="text-white font-semibold text-lg">
                    {stat.fighter1}
                  </span>
                </div>

                {/* Stat Label */}
                <div className="text-center">
                  <span className="text-accent font-bold text-sm uppercase tracking-wide">
                    {stat.label}
                  </span>
                </div>

                {/* Fighter 2 Stat */}
                <div className="text-left">
                  <span className="text-white font-semibold text-lg">
                    {stat.fighter2}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <div className="bg-card/10 backdrop-blur-sm rounded-xl p-6 border border-primary/20">
            <h4 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">1</span>
              </span>
              {fighter1.nickname} Davis
            </h4>
            <p className="text-gray-300 mb-4">
              Undefeated heavyweight champion known for his devastating power and technical precision. 
              Davis has dominated the division with his orthodox stance and exceptional reach advantage.
            </p>
            <div className="text-accent font-semibold">
              Last 5 fights: All victories (4 by KO/TKO)
            </div>
          </div>

          <div className="bg-card/10 backdrop-blur-sm rounded-xl p-6 border border-accent/20">
            <h4 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 bg-accent rounded-full flex items-center justify-center mr-3">
                <span className="text-black font-bold text-sm">2</span>
              </span>
              {fighter2.nickname} Rodriguez
            </h4>
            <p className="text-gray-300 mb-4">
              Explosive southpaw contender with incredible knockout power. Rodriguez&apos;s aggressive style 
              and iron will have earned him this title shot after devastating his last three opponents.
            </p>
            <div className="text-accent font-semibold">
              Last 5 fights: 5-0 (All by KO/TKO)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}