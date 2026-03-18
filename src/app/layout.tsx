import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { Analytics } from "@vercel/analytics/react";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoxStreamTV | Live Boxing Streaming & Pay-Per-View Events",
  description: "Watch live boxing matches, championship fights, and exclusive PPV events in HD. Stream boxing online with BoxStreamTV - your destination for professional and amateur boxing.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logos/BoxStreamThumbnail.png", type: "image/png" },
    ],
    apple: "/logos/BoxStreamThumbnail.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "BoxStreamTV | Live Boxing Streaming & Pay-Per-View Events",
    description: "Watch live boxing matches, championship fights, and exclusive PPV events in HD. Stream boxing online with BoxStreamTV.",
    type: "website",
    siteName: "BoxStreamTV",
    locale: "en_US",
    images: [
      {
        url: "/logos/BoxStreamThumbnail.png",
        width: 1200,
        height: 630,
        alt: "BoxStreamTV - Live Boxing Streaming",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BoxStreamTV | Live Boxing Streaming & Pay-Per-View Events",
    description: "Watch live boxing matches, championship fights, and exclusive PPV events in HD. Stream boxing online with BoxStreamTV.",
    images: ["/logos/BoxStreamThumbnail.png"],
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
        <Analytics />
      </body>
    </html>
  );
}
