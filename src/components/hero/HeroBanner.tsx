export default function HeroBanner() {
  return (
    <div className="relative bg-black py-8 overflow-hidden">
      {/* Logo Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-start">
          <img 
            src="/logos/BoxStreamVerticalLogo.png" 
            alt="Box Stream Logo" 
            className="h-48 md:h-64 w-auto"
          />
        </div>
      </div>
    </div>
  );
}