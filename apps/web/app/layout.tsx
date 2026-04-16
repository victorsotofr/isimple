import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { CookieBanner } from "@/components/CookieBanner";
import "./globals.css";

const dm = DM_Sans({
  variable: "--font-dm",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ImmoSimple — Gestion locative moderne pour propriétaires",
  description:
    "Gérez vos locations sans les frictions. Un outil moderne pour propriétaires qui veulent reprendre le contrôle de leur patrimoine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={dm.variable}>
      <body className="font-sans antialiased">
        {children}
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
