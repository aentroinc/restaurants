import type { Metadata } from "next"
import { Inter, Noto_Sans_JP, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const notoJp = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-jp", display: "swap", weight: ["400", "500", "600", "700"] })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL("https://aentroinc.com/restaurants"),
  title: {
    default: "AENTRO Restaurant OS — 外食大手向け AI 経営レイヤー",
    template: "%s | AENTRO",
  },
  description: "既存システムを置き換えず、1ブランド・1テーマから 8 週間で収益改善を円換算で証明する外食特化 AI 経営レイヤー。",
  keywords: ["外食", "AI", "経営", "BI", "データ統合", "POS", "シフト最適化", "HACCP", "外食 DX"],
  authors: [{ name: "AENTRO Inc." }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://aentroinc.com/restaurants",
    siteName: "AENTRO",
    title: "AENTRO Restaurant OS",
    description: "外食大手向け AI 経営レイヤー。8 週間 POC で収益改善を円換算で証明。",
    images: [{ url: "/restaurants/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AENTRO Restaurant OS",
    description: "外食大手向け AI 経営レイヤー",
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoJp.variable} ${jetbrains.variable}`}>
      <body className="bg-bg-primary text-white antialiased">
        <Nav />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
