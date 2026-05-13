export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function getMedian(low: number, high: number): number {
  return (low + high) / 2
}

export function formatOkuYen(value: number, digits = 2): string {
  if (!isFinite(value)) return "—"
  if (Math.abs(value) >= 100) return `${value.toFixed(0)}億円`
  if (Math.abs(value) >= 10) return `${value.toFixed(1)}億円`
  return `${value.toFixed(digits)}億円`
}

export function formatOkuYenShort(value: number): string {
  if (!isFinite(value)) return "—"
  return `${value.toFixed(2)}億円`
}

export function formatPct(value: number, digits = 1): string {
  if (!isFinite(value)) return "—"
  return `${value.toFixed(digits)}%`
}

export function formatYears(value: number | null): string {
  if (value === null || !isFinite(value) || value <= 0) return "回収不能"
  if (value > 99) return "99年以上"
  if (value < 1) return `${(value * 12).toFixed(1)}ヶ月`
  return `${value.toFixed(1)}年`
}

export function formatStores(value: number): string {
  return `${Math.round(value).toLocaleString("ja-JP")}店舗`
}
