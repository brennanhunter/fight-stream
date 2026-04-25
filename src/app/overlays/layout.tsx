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
    <html lang="en" className={barlow.variable}>
      <head>
        <style>{`
          html, body {
            background: transparent !important;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
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
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, background: 'transparent' }}>
        {children}
      </body>
    </html>
  );
}
