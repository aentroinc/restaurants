import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_JP, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { RoleProvider } from "@/lib/role-context";

const ibmPlexSansJP = IBM_Plex_Sans_JP({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kanjo | Restaurant Intelligence",
  description: "AI-powered restaurant operations platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${ibmPlexSansJP.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <RoleProvider>
          <main className="flex-1 pb-16 max-w-lg mx-auto w-full">
            {children}
          </main>
          <BottomNav />
        </RoleProvider>
      </body>
    </html>
  );
}
