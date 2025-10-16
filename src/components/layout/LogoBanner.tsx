export default function LogoBanner() {
  return (
    <section className="bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <img 
            src="/logos/logo-white-text.png" 
            alt="BoxStreamTV Logo" 
            className="h-[70px] md:h-[88px] w-auto border-2 border-primary rounded-lg p-2 pl-[50px] shadow-[0_0_15px_rgba(220,38,38,0.6)] hover:shadow-[0_0_25px_rgba(220,38,38,0.9)] hover:scale-105 transition-all duration-300 cursor-pointer"
          />
        </div>
      </div>
    </section>
  );
}