export default function LogoBanner() {
  return (
    <section className="bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <img 
            src="/logos/logo-white-text.png" 
            alt="BoxStreamTV Logo" 
            className="h-32 md:h-40 w-auto"
          />
        </div>
      </div>
    </section>
  );
}