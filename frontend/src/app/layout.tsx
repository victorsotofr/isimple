import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { absoluteUrl, getSiteUrl, siteConfig } from "@/lib/site";

const dmSans = DM_Sans({
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-serif",
  weight: ["400"],
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: siteConfig.name,
  title: {
    default: "isimple | Gestion locative IA",
    template: "%s | isimple",
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  category: "Property management software",
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: absoluteUrl('/'),
    siteName: siteConfig.name,
    title: "isimple | Gestion locative IA",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "isimple | Gestion locative IA",
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    'geo.region': 'FR',
    'geo.placename': 'France',
    'ai:llms-txt': absoluteUrl('/llms.txt'),
    'ai:llms-full-txt': absoluteUrl('/llms-full.txt'),
    'mcp:manifest': absoluteUrl('/.well-known/mcp'),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${dmSerif.variable} ${ibmPlexMono.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
