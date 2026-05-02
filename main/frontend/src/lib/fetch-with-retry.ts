/**
 * fetchWithRetry — 統一リトライポリシー。
 *
 * - 最大 3 回までリトライ（合計 4 回呼び出し）。
 * - exponential backoff: 500ms → 1000ms → 2000ms。
 * - リトライ対象: 5xx と network error (TypeError) のみ。
 * - 4xx (400/401/403/404/409/422) はリトライしない。
 * - 同じ Idempotency-Key を再使用するため、リクエストヘッダに既に設定されている
 *   key はそのまま流す。未設定の POST には UUID を自動付与する（同じ呼び出し内
 *   のリトライ全部で同じ key になる）。
 *
 * AbortSignal はそのまま fetch に伝播。タイムアウト制御は呼び出し側で。
 */

const RETRY_DELAYS_MS = [500, 1000, 2000]

export interface RetryOptions extends RequestInit {
  /** 最大リトライ回数。デフォルト 3。 */
  retries?: number
  /** 各 attempt のタイムアウト (ms)。0 で無効。デフォルト 15000。 */
  timeoutMs?: number
}

function isNetworkError(err: unknown): boolean {
  // TypeError: failed to fetch / NetworkError when attempting to fetch resource
  if (err instanceof TypeError) return true
  if (err instanceof Error && /network|fetch|abort/i.test(err.message)) return true
  return false
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  // Fallback for non-crypto environments
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function ensureIdempotencyKey(init: RequestInit): RequestInit {
  if (!init || (init.method && init.method.toUpperCase() !== "POST")) return init
  if (init.method && init.method.toUpperCase() !== "POST") return init
  const headers = new Headers(init.headers || {})
  if (!headers.has("Idempotency-Key") && !headers.has("idempotency-key")) {
    headers.set("Idempotency-Key", uuid())
  }
  return { ...init, headers }
}

async function _fetchOnce(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  if (timeoutMs <= 0) return fetch(input, init)
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  // Compose with caller's signal if present
  const callerSignal = init.signal
  if (callerSignal) {
    if (callerSignal.aborted) ctrl.abort()
    else callerSignal.addEventListener("abort", () => ctrl.abort(), { once: true })
  }
  try {
    return await fetch(input, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RetryOptions = {},
): Promise<Response> {
  const { retries = 3, timeoutMs = 15000, ...rest } = init
  const method = (rest.method || "GET").toUpperCase()
  const finalInit: RequestInit =
    method === "POST" ? ensureIdempotencyKey(rest) : (rest as RequestInit)

  let lastError: unknown = null
  const maxAttempts = retries + 1

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await _fetchOnce(input, finalInit, timeoutMs)
      // 5xx -> retry
      if (res.status >= 500 && attempt < maxAttempts - 1) {
        await sleep(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)])
        continue
      }
      return res
    } catch (err) {
      lastError = err
      // network error -> retry; AbortError -> don't retry
      const isAbort = err instanceof Error && err.name === "AbortError"
      if (!isAbort && isNetworkError(err) && attempt < maxAttempts - 1) {
        await sleep(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)])
        continue
      }
      throw err
    }
  }
  throw lastError ?? new Error("fetchWithRetry: unknown failure")
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Exposed for tests.
export const _internal = { RETRY_DELAYS_MS, isNetworkError, uuid, ensureIdempotencyKey }
