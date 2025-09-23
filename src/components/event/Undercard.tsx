export default function Undercard() {
  const undercardFights = [
    {
      time: "6:00 PM EST",
      division: "Welterweight",
      fighter1: { name: "Danny \"Quick\" Martinez", record: "15-1-0", country: "🇺🇸" },
      fighter2: { name: "Kai \"Tsunami\" Tanaka", record: "17-3-0", country: "🇯🇵" },
      rounds: 6,
      description: "Rising prospects clash in welterweight action"
    },
    {
      time: "6:30 PM EST",
      division: "Bantamweight",
      fighter1: { name: "Rico \"Lightning\" Santos", record: "12-0-0", country: "🇵🇷" },
      fighter2: { name: "Tommy \"The Tiger\" McGrath", record: "14-2-1", country: "🇮🇪" },
      rounds: 6,
      description: "Undefeated Santos looks to extend his streak"
    },
    {
      time: "7:00 PM EST",
      division: "Super Lightweight",
      fighter1: { name: "Marcus \"The Hammer\" Johnson", record: "18-4-0", country: "🇺🇸" },
      fighter2: { name: "Pavel \"Iron\" Volkov", record: "16-3-0", country: "🇷🇺" },
      rounds: 8,
      description: "Power vs technique in this exciting matchup"
    },
    {
      time: "7:30 PM EST",
      division: "Featherweight",
      fighter1: { name: "Carlos \"El Fuego\" Morales", record: "20-1-0", country: "🇲🇽" },
      fighter2: { name: "Jamie \"The Shark\" Wilson", record: "19-2-0", country: "🇬🇧" },
      rounds: 8,
      description: "Title eliminator - winner gets championship shot"
    },
    {
      time: "8:00 PM EST",
      division: "Heavyweight",
      fighter1: { name: "Big Joe \"The Mountain\" Anderson", record: "22-5-0", country: "🇺🇸" },
      fighter2: { name: "Dmitri \"The Bear\" Kozlov", record: "25-3-0", country: "🇷🇺" },
      rounds: 10,
      description: "Heavyweight slugfest between veteran warriors"
    },
    {
      time: "8:30 PM EST",
      division: "Middleweight",
      fighter1: { name: "Antonio \"The Artist\" Silva", record: "23-2-0", country: "🇧🇷" },
      fighter2: { name: "Jake \"Steel\" Thompson", record: "21-1-0", country: "🇨🇦" },
      rounds: 8,
      description: "Technical masterclass expected from both fighters"
    },
    {
      time: "9:00 PM EST",
      division: "Light Heavyweight",
      fighter1: { name: "Malik \"Thunder\" Washington", record: "26-3-0", country: "🇺🇸" },
      fighter2: { name: "Sven \"The Viking\" Larsson", record: "24-2-0", country: "🇸🇪" },
      rounds: 10,
      description: "Former champion seeks redemption"
    },
    {
      time: "9:30 PM EST",
      division: "Super Middleweight",
      fighter1: { name: "Francesco \"Il Leone\" Romano", record: "28-1-0", country: "🇮🇹" },
      fighter2: { name: "Kevin \"KO King\" Murphy", record: "25-4-0", country: "🇮🇪" },
      rounds: 10,
      description: "European rivalry continues in the ring"
    },
    {
      time: "10:00 PM EST",
      division: "Light Heavyweight",
      fighter1: { name: "Carlos \"Lightning\" Mendez", record: "24-1-0", country: "🇲🇽" },
      fighter2: { name: "Viktor \"The Viking\" Petrov", record: "22-3-0", country: "🇳🇴" },
      rounds: 10,
      description: "Co-main event - explosive power meeting"
    },
    {
      time: "10:30 PM EST",
      division: "Middleweight",
      fighter1: { name: "James \"Bulldog\" Thompson", record: "19-2-1", country: "🇬🇧" },
      fighter2: { name: "Andre \"The Giant\" Silva", record: "21-4-0", country: "🇧🇷" },
      rounds: 8,
      description: "Featured bout before the main event"
    }
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Complete <span className="text-accent">Undercard</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            10 thrilling preliminary fights leading up to the main event
          </p>
        </div>

        <div className="grid gap-4 max-w-5xl mx-auto">
          {undercardFights.map((fight, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-6 border border-border hover:border-accent/50 transition-all duration-300 hover:shadow-lg"
            >
              <div className="grid md:grid-cols-4 gap-4 items-center">
                {/* Time & Division */}
                <div className="text-center md:text-left">
                  <div className="text-sm font-semibold text-accent mb-1">
                    {fight.time}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    {fight.division}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fight.rounds} Rounds
                  </div>
                </div>

                {/* Fighter 1 */}
                <div className="text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-end mb-1">
                    <div className="mr-2">
                      <div className="font-semibold text-card-foreground text-sm">
                        {fight.fighter1.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fight.fighter1.record}
                      </div>
                    </div>
                    <span className="text-lg">{fight.fighter1.country}</span>
                  </div>
                </div>

                {/* VS */}
                <div className="text-center">
                  <span className="text-lg font-bold text-accent">VS</span>
                </div>

                {/* Fighter 2 */}
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start mb-1">
                    <span className="text-lg mr-2">{fight.fighter2.country}</span>
                    <div>
                      <div className="font-semibold text-card-foreground text-sm">
                        {fight.fighter2.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fight.fighter2.record}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fight Description */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground text-center italic">
                  {fight.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Event Flow Info */}
        <div className="mt-12 bg-card rounded-xl p-6 border border-border max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-card-foreground mb-4 text-center">
            Event Schedule
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-accent mb-2">6:00 PM</div>
              <div className="text-sm text-muted-foreground">First Fight</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-2">10:00 PM</div>
              <div className="text-sm text-muted-foreground">Co-Main Event</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent mb-2">11:00 PM</div>
              <div className="text-sm text-muted-foreground">Main Event</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              *All times are approximate and subject to change based on fight duration
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}