export default function Footer() {
  return (
    <footer className="bg-secondary border-t border-accent/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <h3 className="text-2xl font-bold text-white mb-4">
              FIGHTSTREAM<span className="text-accent">.COM</span>
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Premium boxing pay-per-view streaming platform delivering the ultimate fight experience in 4K Ultra HD.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-accent transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-accent transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-accent transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.647.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.328-1.297L6.21 14.59c.65.567 1.49.924 2.407.924 1.97 0 3.568-1.598 3.568-3.568S10.587 8.378 8.617 8.378s-3.568 1.598-3.568 3.568c0 .918.357 1.758.924 2.407l-1.101 1.089C4.165 14.562 3.675 13.411 3.675 12.114c0-2.734 2.217-4.951 4.951-4.951s4.951 2.217 4.951 4.951-2.217 4.951-4.951 4.951z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#home" className="text-gray-300 hover:text-accent transition-colors text-sm">Home</a></li>
              <li><a href="#fighters" className="text-gray-300 hover:text-accent transition-colors text-sm">Fighters</a></li>
              <li><a href="#card" className="text-gray-300 hover:text-accent transition-colors text-sm">Fight Card</a></li>
              <li><a href="#pricing" className="text-gray-300 hover:text-accent transition-colors text-sm">Pricing</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors text-sm">Help Center</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors text-sm">Contact Us</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors text-sm">Technical Support</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors text-sm">Refund Policy</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors text-sm">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors text-sm">Terms of Service</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors text-sm">Cookie Policy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors text-sm">DMCA</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 FightStream.com. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span className="text-gray-400 text-sm">Secure payments by</span>
              <div className="flex items-center space-x-2">
                <span className="text-accent font-semibold text-sm">Stripe</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400 text-sm">SSL Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}