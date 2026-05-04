import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "How it works — 24 時間で 1 ループ",
  description:
    "AI が異常を検出 → SV に配布 → 店舗で実行 → POS / 勤怠に反映。AENTRO が 24 時間で経営判断のループを回す仕組みを、4 ステップで解説。",
  openGraph: {
    title: "How it works | AENTRO Restaurant OS",
    description: "AENTRO は 24 時間で 1 ループする — 検出 / 配布 / 実行 / 反映の 4 ステップ詳解。",
  },
}

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children
}
