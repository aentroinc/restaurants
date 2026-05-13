export type StartRank = "A" | "B" | "C" | "D"

export type CourseGroup =
  | "diagnosis"
  | "foundation"
  | "demand"
  | "cogs"
  | "menu"
  | "labor"
  | "ops"
  | "growth"
  | "scm"
  | "risk"
  | "advanced"
  | "control"

export interface Course {
  id: string
  name: string
  category: string
  level: number
  group: CourseGroup
  modules: string[]
  requiredSystems: string[]
  prerequisiteCourses: string[]
  startRank: StartRank
  personMonthsLow: number
  personMonthsHigh: number
  initialCostOkuLow: number
  initialCostOkuHigh: number
  annualMaintOkuLow: number
  annualMaintOkuHigh: number
  salesImpactPctLow: number
  salesImpactPctHigh: number
  opProfitImpactPctOfSalesLow: number
  opProfitImpactPctOfSalesHigh: number
  supersedes?: string[]
}

export interface ModuleDef {
  id: string
  name: string
}

export interface SystemDef {
  id: string
  name: string
  description: string
}

export type ConfidenceLevel = "conservative" | "standard" | "aggressive"

export interface SimulationInputs {
  companyName: string
  annualSalesOku: number
  operatingProfitOku: number
  storeCount: number
  selectedCourseIds: string[]
  selectedSystemIds: string[]
  rolloutRate: number
  adoptionRate: number
  confidenceLevel: ConfidenceLevel
  dataReadinessOverride: number | null
  capexRatio: number
  amortizationYears: number
  includeAccountingView: boolean
}

export interface CourseSimulationResult {
  course: Course
  initialMedianOku: number
  maintenanceMedianOku: number
  salesImpactMedianPct: number
  opProfitImpactMedianPctOfSales: number
  standaloneInitialOku: number
  standaloneMaintenanceOku: number
  standaloneSalesIncreaseOku: number
  standaloneOpProfitIncreaseOku: number
  readinessScore: number
  readinessMultiplier: number
  missingSystems: string[]
}

export interface IncrementalCostBreakdown {
  course: Course
  overlapRatio: number
  incrementalInitialOku: number
  incrementalMaintenanceOku: number
  suppressedBySupersedes: boolean
  supersededBy?: string
}

export interface AggregatedImpact {
  grossSalesIncreaseOku: number
  grossOpProfitIncreaseOku: number
  rawSalesByGroup: Record<string, number>
  rawOpProfitByGroup: Record<string, number>
}

export interface PortfolioSimulationResult {
  courseResults: CourseSimulationResult[]
  incrementals: IncrementalCostBreakdown[]
  portfolioInitialCostOku: number
  portfolioAnnualMaintenanceOku: number
  naiveInitialSumOku: number
  naiveMaintenanceSumOku: number
  initialSavingsOku: number
  maintenanceSavingsOku: number
  initialSavingsRatio: number
  maintenanceSavingsRatio: number
  rawAggregated: AggregatedImpact
  adjustedSalesIncreaseOku: number
  adjustedGrossOpProfitIncreaseOku: number
  netAnnualOpProfitIncreaseOku: number
  paybackYears: number | null
  capitalizedCostOku: number
  expenseAtStartOku: number
  annualAmortizationOku: number
  plAfterMaintenanceAndAmortizationOku: number
  missingSystemIds: string[]
  suppressedCourseIds: string[]
  installedModuleIds: string[]
  opProfitIncreasePctOfCurrentProfit: number | null
}
