export default function LogoBanner() {
  return (
    <section className="bg-black h-[20vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-center pt-4">
          <img 
            src="/logos/logo-white-text.png" 
            alt="FightStream Logo" 
            className="h-48 md:h-56 w-auto"
          />
        </div>
      </div>
    </section>
  );
}