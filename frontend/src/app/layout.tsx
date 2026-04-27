import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

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
  title: "ImmoSimple | Gestion locative",
  description: "Votre assistant IA pour la gestion locative",
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
