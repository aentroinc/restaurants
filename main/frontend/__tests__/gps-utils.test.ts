/**
 * GPS ユーティリティのロジックテスト。Vitest / Jest どちらでも動くよう
 * Node の assert ベースで書く (test runner に依存しない self-check 形式)。
 *
 * 実行: `node --import tsx __tests__/gps-utils.test.ts` でも、
 *       `vitest run` でも OK。
 */
import assert from "node:assert/strict"

import {
  haversineMeters,
  isInsideStore,
  classifyAccuracy,
  GPS_ACC_WARN,
  GPS_ACC_FALLBACK,
} from "../src/lib/gps"

const tests: Array<[string, () => void]> = []
function test(name: string, fn: () => void) { tests.push([name, fn]) }

// ---- Haversine ----

test("haversine: identical points = 0m", () => {
  assert.equal(haversineMeters(35.6812, 139.7671, 35.6812, 139.7671), 0)
})

test("haversine: 1 degree latitude ~ 111km", () => {
  const d = haversineMeters(35, 139, 36, 139)
  assert.ok(d > 110_000 && d < 112_000, `expected ~111km, got ${d}`)
})

test("haversine: Tokyo Station -> Shinjuku Station ~ 6km", () => {
  // Tokyo: 35.6812, 139.7671 / Shinjuku: 35.6896, 139.7006
  const d = haversineMeters(35.6812, 139.7671, 35.6896, 139.7006)
  assert.ok(d > 5500 && d < 7500, `expected ~6km, got ${d}m`)
})

test("haversine: handles negative longitude (NYC -> LAX)", () => {
  // JFK: 40.6413, -73.7781 / LAX: 33.9416, -118.4085
  const d = haversineMeters(40.6413, -73.7781, 33.9416, -118.4085)
  assert.ok(d > 3_900_000 && d < 4_000_000, `expected ~3950km, got ${d}m`)
})

// ---- isInsideStore ----

test("isInsideStore: exactly at center => inside", () => {
  assert.equal(isInsideStore({ lat: 35.6812, lon: 139.7671 }, 35.6812, 139.7671, 100), true)
})

test("isInsideStore: 50m away with radius 100m => inside", () => {
  // 0.0005 deg lat ~ 55m
  const inside = isInsideStore({ lat: 35.6812 + 0.0005, lon: 139.7671 }, 35.6812, 139.7671, 100)
  assert.equal(inside, true)
})

test("isInsideStore: 300m away with radius 100m => outside", () => {
  // 0.003 deg lat ~ 333m
  const inside = isInsideStore({ lat: 35.6812 + 0.003, lon: 139.7671 }, 35.6812, 139.7671, 100)
  assert.equal(inside, false)
})

test("isInsideStore: low accuracy expands radius (overlap padding)", () => {
  // 200m away, radius 100m, BUT accuracy 150m -> overlap = inside
  const inside = isInsideStore(
    { lat: 35.6812 + 0.0018, lon: 139.7671, accuracyM: 150 },
    35.6812, 139.7671, 100,
  )
  assert.equal(inside, true)
})

// ---- classifyAccuracy ----

test("classifyAccuracy: <=100m => good", () => {
  assert.equal(classifyAccuracy(10), "good")
  assert.equal(classifyAccuracy(100), "good")
})

test("classifyAccuracy: 101-200m => warn", () => {
  assert.equal(classifyAccuracy(101), "warn")
  assert.equal(classifyAccuracy(200), "warn")
})

test("classifyAccuracy: >200m => fallback", () => {
  assert.equal(classifyAccuracy(201), "fallback")
  assert.equal(classifyAccuracy(5000), "fallback")
})

test("threshold constants are stable", () => {
  assert.equal(GPS_ACC_WARN, 100)
  assert.equal(GPS_ACC_FALLBACK, 200)
})

// ---- runner ----
let pass = 0, fail = 0
for (const [name, fn] of tests) {
  try {
    fn()
    pass++
  } catch (e: any) {
    fail++
    console.error(`FAIL ${name}: ${e?.message ?? e}`)
  }
}
console.log(`gps-utils: ${pass} pass, ${fail} fail`)
if (fail > 0 && typeof process !== "undefined") process.exit(1)

export {}
