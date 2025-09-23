export default function FightCard() {
  const fights = [
    {
      type: "Main Event",
      title: "Heavyweight Championship",
      fighter1: { name: "John \"Thunder\" Davis", record: "28-0-0", country: "🇺🇸" },
      fighter2: { name: "Mike \"Iron Fist\" Rodriguez", record: "26-2-0", country: "🇺🇸" },
      rounds: 12,
      isTitle: true
    },
    {
      type: "Co-Main Event", 
      title: "Light Heavyweight",
      fighter1: { name: "Carlos \"Lightning\" Mendez", record: "24-1-0", country: "🇲🇽" },
      fighter2: { name: "Viktor \"The Viking\" Petrov", record: "22-3-0", country: "🇳🇴" },
      rounds: 10,
      isTitle: false
    },
    {
      type: "Featured Bout",
      title: "Middleweight",
      fighter1: { name: "James \"Bulldog\" Thompson", record: "19-2-1", country: "🇬🇧" },
      fighter2: { name: "Andre \"The Giant\" Silva", record: "21-4-0", country: "🇧🇷" },
      rounds: 8,
      isTitle: false
    },
    {
      type: "Opening Bout",
      title: "Welterweight",
      fighter1: { name: "Danny \"Quick\" Martinez", record: "15-1-0", country: "🇺🇸" },
      fighter2: { name: "Kai \"Tsunami\" Tanaka", record: "17-3-0", country: "🇯🇵" },
      rounds: 6,
      isTitle: false
    }
  ];

  return (
    <section id="card" className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Fight <span className="text-accent">Card</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A stacked card featuring the best fighters in the world
          </p>
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
          {fights.map((fight, index) => (
            <div
              key={index}
              className={`bg-card rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-102 ${
                fight.type === "Main Event"
                  ? 'border-accent shadow-2xl bg-gradient-to-r from-card to-accent/10'
                  : fight.type === "Co-Main Event"
                  ? 'border-primary shadow-lg'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              {/* Fight Type Badge */}
              <div className="flex justify-between items-start mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                    fight.type === "Main Event"
                      ? 'bg-accent text-black'
                      : fight.type === "Co-Main Event"
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {fight.type}
                </span>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">{fight.rounds} Rounds</div>
                  {fight.isTitle && (
                    <div className="text-xs text-accent font-semibold">TITLE FIGHT</div>
                  )}
                </div>
              </div>

              {/* Fight Title */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-card-foreground">{fight.title}</h3>
              </div>

              {/* Fighters */}
              <div className="grid md:grid-cols-3 gap-4 items-center">
                {/* Fighter 1 */}
                <div className="text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-end mb-2">
                    <span className="text-2xl mr-2">{fight.fighter1.country}</span>
                    <div>
                      <h4 className="font-bold text-card-foreground">{fight.fighter1.name}</h4>
                      <p className="text-sm text-muted-foreground">{fight.fighter1.record}</p>
                    </div>
                  </div>
                </div>

                {/* VS */}
                <div className="text-center">
                  <span className="text-2xl font-bold text-accent">VS</span>
                </div>

                {/* Fighter 2 */}
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start mb-2">
                    <div>
                      <h4 className="font-bold text-card-foreground">{fight.fighter2.name}</h4>
                      <p className="text-sm text-muted-foreground">{fight.fighter2.record}</p>
                    </div>
                    <span className="text-2xl ml-2">{fight.fighter2.country}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Event Time Info */}
        <div className="text-center mt-12 bg-card rounded-xl p-6 border border-border max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-card-foreground mb-4">Event Schedule</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">First Fight</p>
              <p className="font-semibold text-card-foreground">6:00 PM EST</p>
            </div>
            <div>
              <p className="text-muted-foreground">Main Event</p>
              <p className="font-semibold text-card-foreground">~10:00 PM EST</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            *Fight times are approximate and subject to change
          </p>
        </div>
      </div>
    </section>
  );
}