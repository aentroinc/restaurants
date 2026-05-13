import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "外食AI導入 ROIシミュレーター",
  description:
    "外食企業向けAI導入コース C01〜C35 を選択して、初期費用・維持費・営業利益改善・回収年数を即時試算する経営者向けシミュレーター。",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased bg-white">{children}</body>
    </html>
  )
}
