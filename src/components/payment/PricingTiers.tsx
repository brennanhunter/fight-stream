export default function PricingTiers() {
  const plans = [
    {
      name: "Standard HD",
      price: "$14.99",
      features: [
        "1080p HD Quality",
        "Single Device",
        "Live Stream Access",
        "Basic Support"
      ],
      popular: false
    },
    {
      name: "Premium 4K",
      price: "$19.99",
      features: [
        "4K Ultra HD Quality",
        "Up to 3 Devices",
        "Live Stream Access",
        "Instant Replays",
        "Priority Support"
      ],
      popular: true
    },
    {
      name: "Ultimate Experience",
      price: "$24.99",
      features: [
        "4K Ultra HD Quality",
        "Unlimited Devices",
        "Live Stream Access",
        "Instant Replays",
        "Multi-Camera Angles",
        "Behind-the-Scenes Access",
        "24/7 Premium Support"
      ],
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Choose Your <span className="text-accent">Experience</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the perfect package for the ultimate boxing experience
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-card rounded-2xl p-8 border-2 transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? 'border-accent shadow-2xl transform scale-105'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-accent text-black px-4 py-2 rounded-full text-sm font-bold">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-card-foreground mb-2">
                  {plan.name}
                </h3>
                <div className="text-5xl font-bold text-primary mb-2">
                  {plan.price}
                </div>
                <p className="text-muted-foreground">One-time payment</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <svg className="h-5 w-5 text-accent mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-card-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                  plan.popular
                    ? 'bg-accent hover:bg-accent/90 text-black'
                    : 'bg-primary hover:bg-primary/90 text-white'
                }`}
              >
                Get {plan.name}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Secure payment powered by Stripe • 30-day money-back guarantee
          </p>
          <div className="flex justify-center space-x-6">
            <span className="text-sm text-muted-foreground">💳 All major cards accepted</span>
            <span className="text-sm text-muted-foreground">🔒 SSL encrypted</span>
            <span className="text-sm text-muted-foreground">📱 Mobile friendly</span>
          </div>
        </div>
      </div>
    </section>
  );
}