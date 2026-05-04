import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "仕組み — AI が毎日、現場まで動かします",
  description:
    "AI が毎晩データをチェックし、朝には経営陣のスマホに「今日改善すべきこと」が届きます。承認すれば現場で実行され、翌朝には効果が確認できます。AENTRO の動き方を 4 ステップで解説。",
  openGraph: {
    title: "仕組み | AENTRO Restaurant OS",
    description: "AI が毎日、現場まで動かします — 見つける / 届ける / 実行する / 確かめる の 4 ステップ。",
  },
}

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children
}
