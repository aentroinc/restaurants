import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_JP, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/toast";

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
  title: "AENTRO PRO | 中規模チェーン向け経営管理",
  description: "11-50店舗の飲食チェーン向け経営ダッシュボード",
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
      <body className="min-h-full bg-[#0a0e14] text-foreground">
        <ToastProvider>
          <Sidebar />
          <main className="ml-56 min-h-screen">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
