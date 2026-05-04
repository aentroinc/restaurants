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
    default: "AENTRO — 外食チェーンの「もったいない」を AI が毎日見つけて教えます",
    template: "%s | AENTRO",
  },
  description: "外食チェーンの廃棄ロス・シフト過剰・欠品・問題店舗を、AI が毎朝チェックして本部と店長に直接届けます。今のシステムは何も変えず、8 週間のお試しから始められます。",
  keywords: ["外食", "AI", "経営", "シフト最適化", "廃棄削減", "欠品対策", "外食 DX", "店舗運営"],
  authors: [{ name: "AENTRO Inc." }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://aentroinc.com/restaurants",
    siteName: "AENTRO",
    title: "AENTRO — 外食チェーン向け AI 経営支援",
    description: "外食チェーンの「もったいない」を AI が毎日見つけて、本部と店長に届けます。8 週間のお試しで効果を確認できます。",
    images: [{ url: "/restaurants/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AENTRO — 外食チェーン向け AI 経営支援",
    description: "AI が「今日改善すべきこと」を本部と店長に毎朝届けます",
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
