"use client"

import { useEffect, useState, useCallback } from "react"

export type OnboardingStep = {
  target: string // CSS selector or "*" for centered overlay
  title: string
  body: string
  placement?: "top" | "bottom" | "left" | "right" | "center"
}

export type OnboardingRole = "staff" | "manager" | "sv"

export const ONBOARDING_STEPS: Record<OnboardingRole, OnboardingStep[]> = {
  staff: [
    { target: '[data-onboarding="staff-clock"]', title: "打刻ボタン", body: "出勤・退勤・休憩はこのボタンから。位置情報と顔認証で本人確認します。", placement: "bottom" },
    { target: '[data-onboarding="staff-checklist"]', title: "Line Check", body: "開店前・閉店後・4時間ごとの衛生チェックを写真付きで記録します。", placement: "bottom" },
    { target: '[data-onboarding="staff-loss"]', title: "ロス報告", body: "落とした・割れた・廃棄を 30 秒で報告。写真撮影で原価が自動計算されます。", placement: "bottom" },
    { target: '[data-onboarding="staff-emergency"]', title: "緊急マニュアル", body: "火災・お客様の怪我・救急搬送など、緊急時の手順をすぐ確認できます。", placement: "bottom" },
    { target: '[data-onboarding="staff-settings"]', title: "設定", body: "PIN 変更・通知設定・ヘルプはここから。困ったらサポートへ連絡できます。", placement: "bottom" },
  ],
  manager: [
    { target: '[data-onboarding="manager-kpi"]', title: "ホーム KPI", body: "売上・客数・FL 率・廃棄率を一画面で。色つきセルが要対応です。", placement: "bottom" },
    { target: '[data-onboarding="manager-daily-report"]', title: "日報", body: "日次の売上総括・特記事項・翌日予測。AI が下書きを提案します。", placement: "bottom" },
    { target: '[data-onboarding="manager-waste"]', title: "廃棄", body: "廃棄ログを時系列で確認・新規入力。原価インパクトが集計されます。", placement: "bottom" },
    { target: '[data-onboarding="manager-shift"]', title: "シフト", body: "翌週シフトの承認・差し替え。労基チェックで違反を自動検出します。", placement: "bottom" },
    { target: '[data-onboarding="manager-settings"]', title: "設定", body: "店舗設定・通知・ヘルプ。サポート問い合わせもこちらから。", placement: "bottom" },
  ],
  sv: [
    { target: '[data-onboarding="sv-heatmap"]', title: "エリアヒートマップ", body: "担当 12 店舗を地図で。色は KPI ヘルススコアです。", placement: "right" },
    { target: '[data-onboarding="sv-plan"]', title: "訪問計画", body: "1 週間の訪問ルートを最適化。AI が優先度の高い店舗を推奨します。", placement: "bottom" },
    { target: '[data-onboarding="sv-visit"]', title: "訪問実行", body: "店舗到着で自動チェックイン。QSC 監査・店長 1on1・改善宿題を発行できます。", placement: "bottom" },
    { target: '[data-onboarding="sv-ai-prep"]', title: "AI 訪問前ブリーフ", body: "訪問前 5 分で読める要約。注力テーマと過去課題を AI が整理します。", placement: "bottom" },
    { target: '[data-onboarding="sv-coaching"]', title: "店長コーチ", body: "店長別のスキルマップ・1on1 履歴。次回コーチングテーマを提案します。", placement: "bottom" },
  ],
}

export function useOnboarding(role: OnboardingRole) {
  const key = `onboarding_${role}_done`
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    const done = window.localStorage.getItem(key)
    if (!done) {
      // Slight delay so target elements have mounted
      const t = setTimeout(() => setActive(true), 600)
      return () => clearTimeout(t)
    }
  }, [key])

  const next = useCallback(() => {
    setStepIndex((i) => {
      const max = ONBOARDING_STEPS[role].length - 1
      if (i >= max) {
        finish()
        return i
      }
      return i + 1
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  const skip = useCallback(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, "1")
    }
    setActive(false)
    setStepIndex(0)
  }, [key])

  const restart = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key)
    }
    setStepIndex(0)
    setActive(true)
  }, [key])

  return {
    active,
    stepIndex,
    steps: ONBOARDING_STEPS[role],
    currentStep: ONBOARDING_STEPS[role][stepIndex],
    next,
    skip,
    finish,
    restart,
  }
}

export function resetOnboarding(role: OnboardingRole) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(`onboarding_${role}_done`)
}
