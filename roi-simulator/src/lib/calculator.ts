import type {
  AggregatedImpact,
  Course,
  CourseSimulationResult,
  IncrementalCostBreakdown,
  PortfolioSimulationResult,
  SimulationInputs,
} from "@/src/types"
import { BASE_STORES, COURSE_BY_ID, COURSES } from "@/src/data/courses"
import { clamp, getMedian } from "@/src/lib/formatting"

const REUSE_DISCOUNT_INITIAL = 0.55
const REUSE_DISCOUNT_MAINT = 0.45
const MIN_INCREMENTAL_RATIO = 0.35

const MAX_OP_PROFIT_IMPROVEMENT_PCT_OF_SALES = 2.0
const MAX_SALES_INCREASE_PCT = 5.0

const GROUP_CONTRIBUTION_WEIGHTS = [1.0, 0.6, 0.4, 0.25, 0.15]

const CONFIDENCE_MULTIPLIER: Record<string, number> = {
  conservative: 0.75,
  standard: 1.0,
  aggressive: 1.2,
}

export function getStoreScale(storeCount: number): {
  implementationScale: number
  maintenanceScale: number
} {
  const safeStores = Math.max(1, storeCount)
  const storeRatio = safeStores / BASE_STORES
  const implementationScale = 0.55 + 0.45 * Math.pow(storeRatio, 0.65)
  const maintenanceScale = 0.45 + 0.55 * Math.pow(storeRatio, 0.75)
  return { implementationScale, maintenanceScale }
}

export function getCourseReadiness(
  course: Course,
  selectedSystems: string[],
): { readinessScore: number; readinessMultiplier: number; missingSystems: string[] } {
  if (course.requiredSystems.length === 0) {
    return { readinessScore: 1, readinessMultiplier: 1.0, missingSystems: [] }
  }
  const present = course.requiredSystems.filter((s) => selectedSystems.includes(s))
  const missing = course.requiredSystems.filter((s) => !selectedSystems.includes(s))
  const readinessScore = present.length / course.requiredSystems.length
  const readinessMultiplier = clamp(0.5 + 0.5 * readinessScore, 0.5, 1.0)
  return { readinessScore, readinessMultiplier, missingSystems: missing }
}

function getSelectedCourses(inputs: SimulationInputs): Course[] {
  return inputs.selectedCourseIds
    .map((id) => COURSE_BY_ID[id])
    .filter((c): c is Course => Boolean(c))
}

export function calculateStandaloneCourse(
  course: Course,
  inputs: SimulationInputs,
): CourseSimulationResult {
  const initialMedianOku = getMedian(course.initialCostOkuLow, course.initialCostOkuHigh)
  const maintenanceMedianOku = getMedian(course.annualMaintOkuLow, course.annualMaintOkuHigh)
  const salesImpactMedianPct = getMedian(course.salesImpactPctLow, course.salesImpactPctHigh)
  const opProfitImpactMedianPctOfSales = getMedian(
    course.opProfitImpactPctOfSalesLow,
    course.opProfitImpactPctOfSalesHigh,
  )

  const { implementationScale, maintenanceScale } = getStoreScale(inputs.storeCount)
  const { readinessScore, readinessMultiplier, missingSystems } = getCourseReadiness(
    course,
    inputs.selectedSystemIds,
  )
  const effectiveReadinessMultiplier =
    inputs.dataReadinessOverride !== null
      ? clamp(inputs.dataReadinessOverride, 0.5, 1.1)
      : readinessMultiplier

  const confidenceMultiplier = CONFIDENCE_MULTIPLIER[inputs.confidenceLevel] ?? 1.0

  const standaloneInitialOku = initialMedianOku * implementationScale
  const standaloneMaintenanceOku = maintenanceMedianOku * maintenanceScale

  const standaloneSalesIncreaseOku =
    inputs.annualSalesOku *
    (salesImpactMedianPct / 100) *
    inputs.rolloutRate *
    inputs.adoptionRate *
    effectiveReadinessMultiplier *
    confidenceMultiplier

  const standaloneOpProfitIncreaseOku =
    inputs.annualSalesOku *
    (opProfitImpactMedianPctOfSales / 100) *
    inputs.rolloutRate *
    inputs.adoptionRate *
    effectiveReadinessMultiplier *
    confidenceMultiplier

  return {
    course,
    initialMedianOku,
    maintenanceMedianOku,
    salesImpactMedianPct,
    opProfitImpactMedianPctOfSales,
    standaloneInitialOku,
    standaloneMaintenanceOku,
    standaloneSalesIncreaseOku,
    standaloneOpProfitIncreaseOku,
    readinessScore,
    readinessMultiplier: effectiveReadinessMultiplier,
    missingSystems,
  }
}

function calculateIncrementalCosts(
  effectiveCourses: Course[],
  resultByCourseId: Record<string, CourseSimulationResult>,
  suppressedByMap: Record<string, string>,
  selectedCourses: Course[],
): IncrementalCostBreakdown[] {
  const installedModules = new Set<string>()
  const incrementals: IncrementalCostBreakdown[] = []

  const sorted = [...effectiveCourses].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return a.id.localeCompare(b.id)
  })

  for (const course of sorted) {
    const overlap = course.modules.filter((m) => installedModules.has(m)).length
    const overlapRatio = course.modules.length === 0 ? 0 : overlap / course.modules.length
    const standalone = resultByCourseId[course.id]
    const incrementalInitialOku =
      standalone.standaloneInitialOku *
      Math.max(MIN_INCREMENTAL_RATIO, 1 - REUSE_DISCOUNT_INITIAL * overlapRatio)
    const incrementalMaintenanceOku =
      standalone.standaloneMaintenanceOku *
      Math.max(MIN_INCREMENTAL_RATIO, 1 - REUSE_DISCOUNT_MAINT * overlapRatio)

    incrementals.push({
      course,
      overlapRatio,
      incrementalInitialOku,
      incrementalMaintenanceOku,
      suppressedBySupersedes: false,
    })

    for (const m of course.modules) installedModules.add(m)
  }

  for (const c of selectedCourses) {
    const supBy = suppressedByMap[c.id]
    if (supBy) {
      incrementals.push({
        course: c,
        overlapRatio: 1,
        incrementalInitialOku: 0,
        incrementalMaintenanceOku: 0,
        suppressedBySupersedes: true,
        supersededBy: supBy,
      })
    }
  }

  return incrementals
}

export function aggregateImpactsWithDiminishingReturns(
  results: CourseSimulationResult[],
): AggregatedImpact {
  const byGroupSales: Record<string, number[]> = {}
  const byGroupOp: Record<string, number[]> = {}
  for (const r of results) {
    const g = r.course.group
    if (!byGroupSales[g]) byGroupSales[g] = []
    if (!byGroupOp[g]) byGroupOp[g] = []
    byGroupSales[g].push(r.standaloneSalesIncreaseOku)
    byGroupOp[g].push(r.standaloneOpProfitIncreaseOku)
  }

  const rawSalesByGroup: Record<string, number> = {}
  const rawOpProfitByGroup: Record<string, number> = {}

  function diminish(values: number[]): number {
    const sorted = [...values].sort((a, b) => Math.abs(b) - Math.abs(a))
    let sum = 0
    for (let i = 0; i < sorted.length; i++) {
      const weight = GROUP_CONTRIBUTION_WEIGHTS[Math.min(i, GROUP_CONTRIBUTION_WEIGHTS.length - 1)]
      sum += sorted[i] * weight
    }
    return sum
  }

  let grossSales = 0
  let grossOp = 0
  for (const g of Object.keys(byGroupSales)) {
    const s = diminish(byGroupSales[g])
    const o = diminish(byGroupOp[g])
    rawSalesByGroup[g] = s
    rawOpProfitByGroup[g] = o
    grossSales += s
    grossOp += o
  }

  return {
    grossSalesIncreaseOku: grossSales,
    grossOpProfitIncreaseOku: grossOp,
    rawSalesByGroup,
    rawOpProfitByGroup,
  }
}

export function calculatePortfolio(inputs: SimulationInputs): PortfolioSimulationResult {
  const selectedCourses = getSelectedCourses(inputs)

  const suppressedByMap: Record<string, string> = {}
  for (const c of selectedCourses) {
    if (!c.supersedes || c.supersedes.length === 0) continue
    for (const sId of c.supersedes) {
      if (selectedCourses.some((sc) => sc.id === sId)) {
        suppressedByMap[sId] = c.id
      }
    }
  }
  const suppressedCourseIds = Object.keys(suppressedByMap)
  const effectiveCourses = selectedCourses.filter((c) => !suppressedByMap[c.id])

  const courseResultsEffective = effectiveCourses.map((c) => calculateStandaloneCourse(c, inputs))
  const resultByCourseId = Object.fromEntries(courseResultsEffective.map((r) => [r.course.id, r]))

  const courseResults = selectedCourses.map((c) =>
    resultByCourseId[c.id] ?? calculateStandaloneCourse(c, inputs),
  )

  const incrementals = calculateIncrementalCosts(
    effectiveCourses,
    resultByCourseId,
    suppressedByMap,
    selectedCourses,
  )

  const portfolioInitialCostOku = incrementals
    .filter((i) => !i.suppressedBySupersedes)
    .reduce((acc, i) => acc + i.incrementalInitialOku, 0)
  const portfolioAnnualMaintenanceOku = incrementals
    .filter((i) => !i.suppressedBySupersedes)
    .reduce((acc, i) => acc + i.incrementalMaintenanceOku, 0)

  const naiveInitialSumOku = selectedCourses.reduce(
    (acc, c) => acc + (resultByCourseId[c.id]?.standaloneInitialOku ?? calculateStandaloneCourse(c, inputs).standaloneInitialOku),
    0,
  )
  const naiveMaintenanceSumOku = selectedCourses.reduce(
    (acc, c) =>
      acc +
      (resultByCourseId[c.id]?.standaloneMaintenanceOku ??
        calculateStandaloneCourse(c, inputs).standaloneMaintenanceOku),
    0,
  )
  const initialSavingsOku = Math.max(0, naiveInitialSumOku - portfolioInitialCostOku)
  const maintenanceSavingsOku = Math.max(0, naiveMaintenanceSumOku - portfolioAnnualMaintenanceOku)
  const initialSavingsRatio = naiveInitialSumOku > 0 ? initialSavingsOku / naiveInitialSumOku : 0
  const maintenanceSavingsRatio =
    naiveMaintenanceSumOku > 0 ? maintenanceSavingsOku / naiveMaintenanceSumOku : 0

  const rawAggregated = aggregateImpactsWithDiminishingReturns(courseResultsEffective)

  const maxOp = inputs.annualSalesOku * (MAX_OP_PROFIT_IMPROVEMENT_PCT_OF_SALES / 100)
  const maxSales = inputs.annualSalesOku * (MAX_SALES_INCREASE_PCT / 100)

  const adjustedGrossOpProfitIncreaseOku = Math.min(rawAggregated.grossOpProfitIncreaseOku, maxOp)
  const adjustedSalesIncreaseOku = Math.min(rawAggregated.grossSalesIncreaseOku, maxSales)

  const netAnnualOpProfitIncreaseOku =
    adjustedGrossOpProfitIncreaseOku - portfolioAnnualMaintenanceOku

  const paybackYears =
    netAnnualOpProfitIncreaseOku > 0 && portfolioInitialCostOku > 0
      ? portfolioInitialCostOku / netAnnualOpProfitIncreaseOku
      : null

  const capexRatio = clamp(inputs.capexRatio, 0, 1)
  const amortYears = clamp(inputs.amortizationYears, 3, 7)
  const capitalizedCostOku = portfolioInitialCostOku * capexRatio
  const expenseAtStartOku = portfolioInitialCostOku * (1 - capexRatio)
  const annualAmortizationOku = amortYears > 0 ? capitalizedCostOku / amortYears : 0
  const plAfterMaintenanceAndAmortizationOku =
    adjustedGrossOpProfitIncreaseOku - portfolioAnnualMaintenanceOku - annualAmortizationOku

  const missingSystemIds = Array.from(
    new Set(
      effectiveCourses.flatMap((c) => c.requiredSystems.filter((s) => !inputs.selectedSystemIds.includes(s))),
    ),
  )

  const installedModuleIds = Array.from(
    new Set(effectiveCourses.flatMap((c) => c.modules)),
  )

  const opProfitIncreasePctOfCurrentProfit =
    inputs.operatingProfitOku > 0
      ? (adjustedGrossOpProfitIncreaseOku / inputs.operatingProfitOku) * 100
      : null

  return {
    courseResults,
    incrementals,
    portfolioInitialCostOku,
    portfolioAnnualMaintenanceOku,
    naiveInitialSumOku,
    naiveMaintenanceSumOku,
    initialSavingsOku,
    maintenanceSavingsOku,
    initialSavingsRatio,
    maintenanceSavingsRatio,
    rawAggregated,
    adjustedSalesIncreaseOku,
    adjustedGrossOpProfitIncreaseOku,
    netAnnualOpProfitIncreaseOku,
    paybackYears,
    capitalizedCostOku,
    expenseAtStartOku,
    annualAmortizationOku,
    plAfterMaintenanceAndAmortizationOku,
    missingSystemIds,
    suppressedCourseIds,
    installedModuleIds,
    opProfitIncreasePctOfCurrentProfit,
  }
}

export function findMissingSystemsForCourses(
  selectedCourses: Course[],
  selectedSystems: string[],
): string[] {
  const set = new Set<string>()
  for (const c of selectedCourses) {
    for (const s of c.requiredSystems) {
      if (!selectedSystems.includes(s)) set.add(s)
    }
  }
  return Array.from(set)
}

export const ALL_COURSES = COURSES
