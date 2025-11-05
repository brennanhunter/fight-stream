export default function LogoBanner() {
  return (
    <section className="bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[88px]">
          <img 
            src="/logos/logo-banner.png" 
            alt="BoxStreamTV Logo" 
            className="h-[360px] md:h-[420px] w-auto"
          />
          

        </div>
      </div>
    </section>
  );
}