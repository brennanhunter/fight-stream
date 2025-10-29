import { Instagram, Youtube } from 'lucide-react';

export default function LogoBanner() {
  return (
    <section className="bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <img 
            src="/logos/logo-white-text.png" 
            alt="BoxStreamTV Logo" 
            className="h-[70px] md:h-[88px] w-auto p-2"
          />
          
          {/* Social Media Links */}
          <div className="flex gap-3 md:gap-4">
            {/* Instagram Link */}
            <a
              href="https://www.instagram.com/boxstreamtv/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:rotate-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
              <Instagram className="relative w-6 h-6 md:w-7 md:h-7 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
            </a>
            
            {/* YouTube Link */}
            <a
              href="https://www.youtube.com/@BoxStreamTV"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-red-600 via-red-500 to-red-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:-rotate-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-red-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
              <Youtube className="relative w-6 h-6 md:w-7 md:h-7 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}