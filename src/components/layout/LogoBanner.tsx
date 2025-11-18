export default function LogoBanner() {
  return (
    <section className="bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-start items-center">
          <img 
            src="/logos/BoxStreamVerticalLogo.png" 
            alt="BoxStreamTV Logo" 
            className="h-[40px] md:h-[50px] w-auto"
          />
        </div>
      </div>
    </section>
  );
}