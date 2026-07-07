import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "BirdDex",
  description: "Identify wild birds like a Pokédex",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "BirdDex" },
};

export const viewport: Viewport = {
  themeColor: "#DC0A2D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body className="h-full flex flex-col max-w-md mx-auto relative">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
