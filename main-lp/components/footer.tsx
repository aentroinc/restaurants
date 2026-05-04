import Link from "next/link"
import { Hexagon } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-24 pt-16 pb-12 bg-[#08090d]">
      <div className="container-x">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <Hexagon className="w-7 h-7 text-blue-400" strokeWidth={1.5} />
              <div>
                <div className="text-[12px] font-bold tracking-[0.16em] text-blue-400 uppercase">AENTRO</div>
                <div className="text-[9px] text-white/45 tracking-[0.10em] mt-0.5">Restaurant OS</div>
              </div>
            </div>
            <p className="mt-4 text-[12px] text-white/55 leading-relaxed max-w-xs">
              既存システムを置き換えず、1ブランド・1テーマから 8 週間で収益改善を円換算で証明する外食特化 AI 経営レイヤー。
            </p>
            <p className="mt-4 text-[10px] text-white/30">
              © 2026 AENTRO Inc.<br />
              東京都港区
            </p>
          </div>

          <FooterColumn title="サービス" items={[
            { label: "どう動くか", href: "/how-it-works" },
            { label: "導入実績", href: "/value" },
            { label: "安全性", href: "/security" },
            { label: "他社比較", href: "/vs" },
          ]} />
          <FooterColumn title="始める" items={[
            { label: "お試し導入", href: "/poc" },
            { label: "デモを依頼", href: "/demo" },
            { label: "事例を見る", href: "/value#cases" },
          ]} />
          <FooterColumn title="法務" items={[
            { label: "プライバシー", href: "/legal/privacy" },
            { label: "利用規約", href: "/legal/terms" },
            { label: "特商法表記", href: "/legal/scta" },
          ]} />
        </div>

        <div className="pt-6 border-t border-white/[0.04] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[10px] text-white/35">
          <p>
            記載されている事例の数字は、AENTRO 導入企業 5 社の実績を匿名でまとめたものです。社名・店舗名は秘密保持により非公開です。
            業態・規模が似ていても、貴社で同等の効果が出ることを保証するものではありません。
          </p>
          <p className="shrink-0">
            v1.0 / 2026-05
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35 mb-3">{title}</div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="text-[12px] text-white/65 hover:text-white transition-colors">
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
