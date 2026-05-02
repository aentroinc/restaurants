"use client"

import Link from "next/link"
import { useState } from "react"
import { HelpCircle, X, MessageCircle, BookOpen, Phone } from "lucide-react"

type Props = {
  topicId?: string
  category?: string
  hideOn?: string[] // pathnames where the button should hide
  pathname?: string
}

export function HelpButton({ topicId, category }: Props) {
  const [open, setOpen] = useState(false)
  const helpUrl = topicId ? `/help/${topicId}` : category ? `/help?cat=${category}` : "/help"

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-4 z-[80] h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shadow-xl shadow-emerald-500/30 flex items-center justify-center transition-all md:bottom-6"
        aria-label="ヘルプ"
      >
        {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-40 right-4 z-[80] w-72 bg-[#0f1620] border border-white/10 rounded-xl shadow-2xl p-3 md:bottom-24 text-white">
          <div className="text-[12px] font-semibold mb-2 text-white/80 px-1">サポート</div>
          <div className="space-y-1">
            <Link
              href={helpUrl}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.06] text-[13px]"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>ヘルプ・FAQ</span>
            </Link>
            <Link
              href="/support"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.06] text-[13px]"
            >
              <MessageCircle className="w-4 h-4 text-blue-400" />
              <span>お問い合わせ</span>
            </Link>
            <a
              href="tel:0120-000-000"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.06] text-[13px]"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>電話 0120-XXX-XXX</span>
            </a>
          </div>
          <div className="text-[10px] text-white/40 mt-2 px-1">サポート時間: 9:00 - 22:00</div>
        </div>
      )}
    </>
  )
}
