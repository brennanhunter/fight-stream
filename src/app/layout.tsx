import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoxStreamTV.com | Live Boxing Streaming & Pay-Per-View Events",
  description: "Watch live boxing matches, championship fights, and exclusive PPV events in HD. Stream boxing online with BoxStreamTV - your premier destination for professional boxing, amateur fights, and combat sports entertainment.",
  keywords: "boxing stream, live boxing, boxing PPV, watch boxing online, boxing matches, championship boxing, professional boxing, amateur boxing, combat sports, fight streaming, boxing events, heavyweight boxing, boxing live stream, pay per view boxing, boxing channel, fight night, boxing championship, world boxing, boxing tv, sports streaming, live fights, boxing videos, boxing replays, boxing highlights, MMA, mixed martial arts, UFC, boxing news, fight card, boxing schedule, boxing results, boxing knockouts, title fights, boxing tournaments, boxing gym, boxing training, boxing equipment, boxing gloves, boxing ring, boxing referee, boxing judges, boxing promoter, boxing venue, boxing ticket, boxing broadcast, boxing commentary, boxing analysis, boxing statistics, boxing rankings, boxing history, boxing legends, boxing hall of fame, boxing records, boxing career, boxing debut, boxing retirement, boxing comeback, boxing rivalry, boxing drama, boxing entertainment, boxing fan, boxing community, boxing culture, boxing lifestyle, boxing passion, boxing dedication, boxing spirit, boxing courage, boxing strength, boxing power, boxing speed, boxing agility, boxing technique, boxing strategy, boxing tactics, boxing skills, boxing talent, boxing performance, boxing excellence, boxing mastery, boxing greatness, boxing legacy, boxing immortality",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logos/BoxStreamVerticalLogo.png", type: "image/png" },
    ],
    apple: "/logos/BoxStreamVerticalLogo.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "BoxStreamTV.com | Live Boxing Streaming & Pay-Per-View Events",
    description: "Watch live boxing matches, championship fights, and exclusive PPV events in HD. Stream boxing online with BoxStreamTV.",
    type: "website",
    siteName: "BoxStreamTV",
    locale: "en_US",
    images: [
      {
        url: "/logos/BoxStreamVerticalLogo.png",
        width: 1200,
        height: 630,
        alt: "BoxStreamTV - Live Boxing Streaming",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BoxStreamTV.com | Live Boxing Streaming & Pay-Per-View Events",
    description: "Watch live boxing matches, championship fights, and exclusive PPV events in HD. Stream boxing online with BoxStreamTV.",
    images: ["/logos/BoxStreamVerticalLogo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            <Header />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
