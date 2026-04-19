import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import FooterWrapper from "@/components/layout/FooterWrapper";
import { Analytics } from "@vercel/analytics/react";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://boxstreamtv.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "BoxStreamTV | Live Boxing Streaming & Pay-Per-View Events",
    template: "%s | BoxStreamTV",
  },
  description: "Watch live boxing matches, championship fights, and exclusive PPV events in HD. Stream professional, amateur, and youth boxing online with BoxStreamTV.",
  keywords: [
    "BoxStreamTV",
    "boxstream tv",
    "Box Stream TV",
    "boxstreamtv.com",
    "live boxing stream",
    "watch boxing online",
    "boxing pay per view",
    "boxing PPV",
    "amateur boxing streaming",
    "youth boxing live stream",
    "professional boxing online",
    "boxing fight pass",
    "stream boxing events",
    "boxing live broadcast",
    "PPV boxing events",
    "online boxing matches",
  ],
  authors: [{ name: "BoxStreamTV", url: BASE_URL }],
  creator: "BoxStreamTV",
  publisher: "BoxStreamTV",
  alternates: {
    canonical: BASE_URL,
  },
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
    description: "Watch live boxing matches, championship fights, and exclusive PPV events in HD. Stream professional, amateur, and youth boxing online with BoxStreamTV.",
    type: "website",
    url: BASE_URL,
    siteName: "BoxStreamTV",
    locale: "en_US",
    images: [
      {
        url: "/logos/BoxStreamThumbnail.png",
        width: 1200,
        height: 630,
        alt: "BoxStreamTV - Live Boxing Streaming & Pay-Per-View",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BoxStreamTV | Live Boxing Streaming & Pay-Per-View Events",
    description: "Watch live boxing matches, championship fights, and exclusive PPV events in HD. Stream boxing online with BoxStreamTV.",
    images: ["/logos/BoxStreamThumbnail.png"],
    site: "@BoxStreamTV",
    creator: "@BoxStreamTV",
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
  category: "sports",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://boxstreamtv.com/#organization",
      "name": "BoxStreamTV",
      "url": "https://boxstreamtv.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://boxstreamtv.com/logos/BoxStreamThumbnail.png",
      },
      "sameAs": [
        "https://www.instagram.com/boxstreamtv",
        "https://www.youtube.com/@BoxStreamTV",
        "https://www.tiktok.com/@boxstream_tv",
        "https://www.linkedin.com/company/box-stream-tv",
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "url": "https://boxstreamtv.com/contact",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://boxstreamtv.com/#website",
      "url": "https://boxstreamtv.com",
      "name": "BoxStreamTV",
      "description": "Live boxing streaming and pay-per-view events for professional, amateur, and youth boxing.",
      "publisher": { "@id": "https://boxstreamtv.com/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://boxstreamtv.com/vod?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SiteNavigationElement",
      "@id": "https://boxstreamtv.com/#navigation",
      "name": "Main Navigation",
      "hasPart": [
        { "@type": "WebPage", "name": "Home", "url": "https://boxstreamtv.com" },
        { "@type": "WebPage", "name": "Replays", "url": "https://boxstreamtv.com/vod" },
        { "@type": "WebPage", "name": "Pricing", "url": "https://boxstreamtv.com/pricing" },
        { "@type": "WebPage", "name": "FAQ", "url": "https://boxstreamtv.com/faq" },
        { "@type": "WebPage", "name": "Contact", "url": "https://boxstreamtv.com/contact" },
        { "@type": "WebPage", "name": "Work With Us", "url": "https://boxstreamtv.com/work-with-us" },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:tracking-wide"
        >
          Skip to content
        </a>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <FooterWrapper />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
