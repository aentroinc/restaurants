import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(Math.round(value)) + "円"
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 100_000_000) return (value / 100_000_000).toFixed(1) + "億円"
  if (value >= 10_000) return (value / 10_000).toFixed(0) + "万円"
  return formatCurrency(value)
}

export function formatPercent(value: number): string {
  return value.toFixed(1) + "%"
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  if (!d || isNaN(d.getTime())) return "-"
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  if (!d || isNaN(d.getTime())) return "-"
  return `${d.getMonth() + 1}/${d.getDate()}`
}
