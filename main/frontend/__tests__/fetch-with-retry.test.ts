/**
 * fetchWithRetry のロジックテスト。
 *
 * 実行: `node --import tsx __tests__/fetch-with-retry.test.ts` または `vitest run`。
 * Node の assert ベース。test runner 非依存。
 */
import assert from "node:assert/strict"

import { fetchWithRetry, _internal } from "../src/lib/fetch-with-retry"

const tests: Array<[string, () => Promise<void> | void]> = []
function test(name: string, fn: () => Promise<void> | void) { tests.push([name, fn]) }

// ---- helpers ----

function mockFetch(responses: Array<Response | Error>): { calls: Request[]; restore: () => void } {
  const calls: Request[] = []
  const orig = globalThis.fetch
  let i = 0
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(new Request(typeof input === "string" || input instanceof URL ? String(input) : (input as Request).url, init))
    const next = responses[Math.min(i++, responses.length - 1)]
    if (next instanceof Error) return Promise.reject(next)
    return Promise.resolve(next.clone())
  }) as typeof fetch
  return {
    calls,
    restore: () => { globalThis.fetch = orig },
  }
}

function jsonResp(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

// ---- Idempotency-Key auto-generation ----

test("ensureIdempotencyKey: GET is untouched", () => {
  const init = _internal.ensureIdempotencyKey({ method: "GET" })
  const headers = new Headers(init.headers)
  assert.equal(headers.has("Idempotency-Key"), false)
})

test("ensureIdempotencyKey: POST gets a key", () => {
  const init = _internal.ensureIdempotencyKey({ method: "POST" })
  const headers = new Headers(init.headers)
  assert.ok(headers.has("Idempotency-Key"))
})

test("ensureIdempotencyKey: existing key is preserved", () => {
  const init = _internal.ensureIdempotencyKey({ method: "POST", headers: { "Idempotency-Key": "fixed" } })
  const headers = new Headers(init.headers)
  assert.equal(headers.get("Idempotency-Key"), "fixed")
})

// ---- 5xx -> retry ----

test("retries on 500 then succeeds", async () => {
  const m = mockFetch([jsonResp(500), jsonResp(500), jsonResp(200, { ok: true })])
  try {
    const res = await fetchWithRetry("http://x.test/p", { method: "POST", retries: 3, timeoutMs: 0 })
    assert.equal(res.status, 200)
    assert.equal(m.calls.length, 3)
  } finally { m.restore() }
})

test("returns 5xx after max retries exhausted", async () => {
  const m = mockFetch([jsonResp(503), jsonResp(503), jsonResp(503), jsonResp(503)])
  try {
    const res = await fetchWithRetry("http://x.test/p", { method: "POST", retries: 3, timeoutMs: 0 })
    assert.equal(res.status, 503)
    assert.equal(m.calls.length, 4)
  } finally { m.restore() }
})

// ---- 4xx -> no retry ----

test("does NOT retry on 400", async () => {
  const m = mockFetch([jsonResp(400)])
  try {
    const res = await fetchWithRetry("http://x.test/p", { method: "POST", retries: 3, timeoutMs: 0 })
    assert.equal(res.status, 400)
    assert.equal(m.calls.length, 1)
  } finally { m.restore() }
})

test("does NOT retry on 409 conflict (double-punch)", async () => {
  const m = mockFetch([jsonResp(409, { code: "double_punch" })])
  try {
    const res = await fetchWithRetry("http://x.test/clock/in", { method: "POST", retries: 3, timeoutMs: 0 })
    assert.equal(res.status, 409)
    assert.equal(m.calls.length, 1)
  } finally { m.restore() }
})

test("does NOT retry on 422", async () => {
  const m = mockFetch([jsonResp(422)])
  try {
    const res = await fetchWithRetry("http://x.test/p", { method: "POST", retries: 3, timeoutMs: 0 })
    assert.equal(res.status, 422)
    assert.equal(m.calls.length, 1)
  } finally { m.restore() }
})

// ---- network error -> retry ----

test("retries on network error then succeeds", async () => {
  const m = mockFetch([new TypeError("Failed to fetch"), jsonResp(200, { ok: true })])
  try {
    const res = await fetchWithRetry("http://x.test/p", { method: "POST", retries: 3, timeoutMs: 0 })
    assert.equal(res.status, 200)
    assert.equal(m.calls.length, 2)
  } finally { m.restore() }
})

test("propagates network error after retries exhausted", async () => {
  const m = mockFetch([
    new TypeError("Failed to fetch"),
    new TypeError("Failed to fetch"),
    new TypeError("Failed to fetch"),
    new TypeError("Failed to fetch"),
  ])
  try {
    let caught: unknown = null
    try {
      await fetchWithRetry("http://x.test/p", { method: "POST", retries: 3, timeoutMs: 0 })
    } catch (e) { caught = e }
    assert.ok(caught instanceof TypeError)
    assert.equal(m.calls.length, 4)
  } finally { m.restore() }
})

// ---- Idempotency-Key reused across retries ----

test("same Idempotency-Key is reused across retries", async () => {
  const m = mockFetch([jsonResp(500), jsonResp(200, { ok: true })])
  try {
    await fetchWithRetry("http://x.test/p", { method: "POST", retries: 3, timeoutMs: 0 })
    const k1 = m.calls[0].headers.get("Idempotency-Key")
    const k2 = m.calls[1].headers.get("Idempotency-Key")
    assert.ok(k1)
    assert.equal(k1, k2)
  } finally { m.restore() }
})

// ---- Backoff timing ----

test("RETRY_DELAYS_MS = [500, 1000, 2000]", () => {
  assert.deepEqual(_internal.RETRY_DELAYS_MS, [500, 1000, 2000])
})

// ---- runner ----

;(async () => {
  let pass = 0, fail = 0
  for (const [name, fn] of tests) {
    try {
      await fn()
      pass++
    } catch (e: unknown) {
      fail++
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`FAIL ${name}: ${msg}`)
    }
  }
  console.log(`fetch-with-retry: ${pass} pass, ${fail} fail`)
  if (fail > 0 && typeof process !== "undefined") process.exit(1)
})()

export {}
