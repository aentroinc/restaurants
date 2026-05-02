"use client"

import { useEffect, useState } from "react"
import { Smartphone, KeyRound, User, Wifi, Trash2, Download } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"
import { staffIdentity, clockLog } from "@/lib/staff-api"

export default function StaffSettingsPage() {
  const [empId, setEmpId] = useState("")
  const [pin1, setPin1] = useState("")
  const [pin2, setPin2] = useState("")
  const [installable, setInstallable] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [online, setOnline] = useState(true)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    setEmpId(staffIdentity.employeeId)
    if (typeof navigator !== "undefined") setOnline(navigator.onLine)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setInstallable(true)
    }
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  function saveId() {
    staffIdentity.setEmployeeId(empId)
    setMsg("従業員IDを保存しました")
    setTimeout(() => setMsg(""), 2000)
  }

  function savePin() {
    if (pin1.length !== 4) return setMsg("4桁で入力してください")
    if (pin1 !== pin2) return setMsg("PIN が一致しません")
    staffIdentity.setPin(pin1)
    setPin1("")
    setPin2("")
    setMsg("PINを更新しました")
    setTimeout(() => setMsg(""), 2000)
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setInstallable(false)
  }

  function clearLog() {
    if (!confirm("打刻履歴をローカル削除しますか？")) return
    clockLog.clear()
    setMsg("履歴をクリアしました")
    setTimeout(() => setMsg(""), 2000)
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-2xl font-bold">設定</h1>

      {msg && <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-200">{msg}</div>}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-emerald-400" />
          <div className="font-semibold">従業員ID</div>
        </div>
        <input
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          className="w-full h-12 px-3 rounded-lg bg-white/[0.05] border border-white/10 focus:outline-none focus:border-emerald-400"
        />
        <BigTapButton tone="primary" label="保存" onClick={saveId} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-amber-400" />
          <div className="font-semibold">4桁PIN</div>
        </div>
        <input
          inputMode="numeric"
          maxLength={4}
          value={pin1}
          onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))}
          placeholder="新PIN"
          className="w-full h-12 px-3 rounded-lg bg-white/[0.05] border border-white/10 focus:outline-none focus:border-emerald-400 tracking-widest"
        />
        <input
          inputMode="numeric"
          maxLength={4}
          value={pin2}
          onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
          placeholder="再入力"
          className="w-full h-12 px-3 rounded-lg bg-white/[0.05] border border-white/10 focus:outline-none focus:border-emerald-400 tracking-widest"
        />
        <BigTapButton tone="primary" label="PIN を更新" onClick={savePin} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-sky-400" />
          <div className="font-semibold">ホーム画面に追加</div>
        </div>
        {installable ? (
          <BigTapButton
            tone="success"
            icon={<Download className="h-5 w-5" />}
            label="アプリとしてインストール"
            onClick={install}
          />
        ) : (
          <div className="text-sm text-white/60">
            iOS Safari: 共有 → 「ホーム画面に追加」<br />
            Android Chrome: メニュー → 「アプリをインストール」
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wifi className={`h-5 w-5 ${online ? "text-emerald-400" : "text-red-400"}`} />
          <div className="font-semibold">接続状態</div>
        </div>
        <div className="text-sm text-white/70">
          {online ? "オンライン" : "オフライン（後でまとめて同期されます）"}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-400" />
          <div className="font-semibold">ローカルデータ</div>
        </div>
        <BigTapButton tone="danger" label="打刻履歴をクリア" onClick={clearLog} />
      </section>
    </div>
  )
}
