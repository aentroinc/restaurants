"use client"

import { useEffect, useState } from "react"
import { svApi, type CompetitorScan } from "@/lib/sv-api"
import { offlineStore } from "@/lib/offline-store"
import { MapPin, Camera, Plus, X, Save, Trash2, Crosshair } from "lucide-react"

interface MenuRow { name: string; price: number }

export default function SVCompetitorPage() {
  const [scans, setScans] = useState<CompetitorScan[]>([])
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<Omit<CompetitorScan, "id" | "sv_user_id" | "menu_observations_json" | "photos_json"> & { menu: MenuRow[]; photoUrls: string[] }>({
    competitor_name: "",
    competitor_address: "",
    lat: 0, lon: 0,
    observations_text: "",
    visited_at: new Date().toISOString().slice(0, 16),
    menu: [{ name: "", price: 0 }],
    photoUrls: [],
  })

  useEffect(() => {
    svApi.listCompetitorScans().then(setScans)
  }, [])

  function getGPS() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm({ ...form, lat: +pos.coords.latitude.toFixed(6), lon: +pos.coords.longitude.toFixed(6) }),
      () => alert("GPS取得に失敗しました")
    )
  }

  async function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await offlineStore.storePhoto(file)
    const url = URL.createObjectURL(file)
    setForm({ ...form, photoUrls: [...form.photoUrls, url] })
  }

  function setMenu(i: number, patch: Partial<MenuRow>) {
    const next = [...form.menu]
    next[i] = { ...next[i], ...patch }
    setForm({ ...form, menu: next })
  }

  async function submit() {
    if (!form.competitor_name || !form.competitor_address) {
      alert("店名と住所は必須です")
      return
    }
    setSubmitting(true)
    try {
      const created = await svApi.createCompetitorScan({
        sv_user_id: "sv-001",
        competitor_name: form.competitor_name,
        competitor_address: form.competitor_address,
        lat: form.lat, lon: form.lon,
        observations_text: form.observations_text,
        menu_observations_json: form.menu.filter((m) => m.name),
        photos_json: form.photoUrls,
        visited_at: form.visited_at,
      })
      setScans([created, ...scans])
      setOpen(false)
      setForm({
        competitor_name: "", competitor_address: "", lat: 0, lon: 0,
        observations_text: "", visited_at: new Date().toISOString().slice(0, 16),
        menu: [{ name: "", price: 0 }], photoUrls: [],
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-5 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[20px] font-bold text-white/90">競合視察</h1>
          <p className="text-[12px] text-white/40 mt-0.5">担当エリアの競合店観察記録</p>
        </div>
        <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-md bg-blue-500 hover:bg-blue-400 text-white text-[12px] font-semibold flex items-center gap-1.5">
          <Plus className="w-4 h-4" />新規視察
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scans.map((s) => (
          <div key={s.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="text-[14px] font-semibold text-white/90">{s.competitor_name}</h3>
                <p className="text-[11px] text-white/50 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{s.competitor_address}</p>
                <p className="text-[10px] text-white/30 mt-0.5 font-mono">{s.lat.toFixed(4)}, {s.lon.toFixed(4)}</p>
              </div>
              <span className="text-[10px] text-white/40 font-mono shrink-0">{s.visited_at.slice(0, 10)}</span>
            </div>
            <p className="text-[12px] text-white/70 leading-relaxed">{s.observations_text}</p>
            {s.menu_observations_json.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <div className="text-[10px] uppercase text-white/40 mb-1">メニュー観察</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {s.menu_observations_json.map((m, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="text-white/70 truncate">{m.name}</span>
                      <span className="text-emerald-400 font-mono">¥{m.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl bg-[#0c1017] border border-white/[0.08] rounded-lg p-5 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-white/90">競合視察を記録</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/[0.06]"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="競合店名">
                  <input value={form.competitor_name} onChange={(e) => setForm({ ...form, competitor_name: e.target.value })} className="w-full px-3 py-1.5 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85" />
                </Field>
                <Field label="訪問日時">
                  <input type="datetime-local" value={form.visited_at} onChange={(e) => setForm({ ...form, visited_at: e.target.value })} className="w-full px-3 py-1.5 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85" />
                </Field>
              </div>
              <Field label="住所">
                <input value={form.competitor_address} onChange={(e) => setForm({ ...form, competitor_address: e.target.value })} className="w-full px-3 py-1.5 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85" />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="緯度">
                  <input type="number" step="0.000001" value={form.lat} onChange={(e) => setForm({ ...form, lat: +e.target.value })} className="w-full px-3 py-1.5 rounded bg-black/30 border border-white/[0.06] text-[13px] font-mono text-white/85" />
                </Field>
                <Field label="経度">
                  <input type="number" step="0.000001" value={form.lon} onChange={(e) => setForm({ ...form, lon: +e.target.value })} className="w-full px-3 py-1.5 rounded bg-black/30 border border-white/[0.06] text-[13px] font-mono text-white/85" />
                </Field>
                <div className="flex items-end">
                  <button onClick={getGPS} className="w-full px-3 py-1.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[12px] font-semibold flex items-center justify-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5" />現在地取得
                  </button>
                </div>
              </div>

              <Field label="観察メモ">
                <textarea
                  value={form.observations_text}
                  onChange={(e) => setForm({ ...form, observations_text: e.target.value })}
                  className="w-full h-24 px-3 py-2 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85 resize-none"
                  placeholder="客層・回転率・新メニュー・客単価感・スタッフ動線..."
                />
              </Field>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/60">メニュー価格表</span>
                  <button onClick={() => setForm({ ...form, menu: [...form.menu, { name: "", price: 0 }] })} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus className="w-3 h-3" />追加</button>
                </div>
                <div className="space-y-1.5">
                  {form.menu.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={m.name}
                        onChange={(e) => setMenu(i, { name: e.target.value })}
                        placeholder="メニュー名"
                        className="flex-1 px-3 py-1.5 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85"
                      />
                      <input
                        type="number"
                        value={m.price || ""}
                        onChange={(e) => setMenu(i, { price: +e.target.value })}
                        placeholder="価格"
                        className="w-28 px-3 py-1.5 rounded bg-black/30 border border-white/[0.06] text-[13px] font-mono text-white/85"
                      />
                      <button onClick={() => setForm({ ...form, menu: form.menu.filter((_, x) => x !== i) })} className="p-1.5 rounded hover:bg-red-500/10 text-red-400/80">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/60">写真</span>
                  <label className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" onChange={addPhoto} className="hidden" />
                    <Camera className="w-3 h-3" />追加
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {form.photoUrls.map((url, i) => (
                    <div key={i} className="aspect-square rounded overflow-hidden border border-white/[0.06]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="competitor" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[12px] text-white/70">キャンセル</button>
              <button onClick={submit} disabled={submitting} className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-white text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-60">
                <Save className="w-3.5 h-3.5" />{submitting ? "送信中..." : "視察を記録"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-white/60 mb-1 block">{label}</label>
      {children}
    </div>
  )
}
