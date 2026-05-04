import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatYen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`
}

export function formatCompactYen(n: number): string {
  if (n >= 100_000_000) return `¥${(n / 100_000_000).toFixed(1)}億`
  if (n >= 10_000) return `¥${(n / 10_000).toLocaleString("ja-JP")}万`
  return `¥${n.toLocaleString("ja-JP")}`
}
