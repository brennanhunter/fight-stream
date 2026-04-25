import { Barlow_Condensed } from 'next/font/google';

const barlow = Barlow_Condensed({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export default function OverlaysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={barlow.variable} style={{ position: 'fixed', inset: 0 }}>
      {/* Hide the site header/footer and wipe the body background for overlay pages */}
      <style dangerouslySetInnerHTML={{ __html: `
        header { display: none !important; }
        html, body { background: transparent !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; }
        #main-content { padding: 0 !important; margin: 0 !important; overflow: hidden !important; }
        @keyframes glowPulse {
          0%, 100% {
            text-shadow:
              0 0 20px rgba(255,255,255,0.5),
              0 0 40px rgba(255,255,255,0.2);
          }
          50% {
            text-shadow:
              0 0 40px rgba(255,255,255,0.95),
              0 0 80px rgba(255,255,255,0.55),
              0 0 130px rgba(255,255,255,0.2);
          }
        }
      `}} />
      {children}
    </div>
  );
}
