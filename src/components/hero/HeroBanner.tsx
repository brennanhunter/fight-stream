export default function HeroBanner() {
  return (
    <div className="relative bg-black py-8 overflow-hidden">
      {/* Logo Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex justify-center">
          <img 
            src="/logos/logo-white-text.png" 
            alt="FightStream Logo" 
            className="h-32 md:h-40 w-auto"
          />
        </div>
      </div>
    </div>
  );
}