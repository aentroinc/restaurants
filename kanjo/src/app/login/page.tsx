"use client";

import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-orange-50 to-white">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-orange-600 tracking-tight">Kanjo</h1>
          <p className="text-sm text-gray-500 mt-1">外食の経営パートナー</p>
        </div>

        {/* LINE Login - primary */}
        <Link href="/">
          <button className="w-full bg-[#06C755] text-white py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-[#05b34d] transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINEでログイン
          </button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">または</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email Login */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">メールアドレス</label>
              <input
                type="email"
                placeholder="mail@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">パスワード</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <Link href="/">
              <button className="w-full bg-orange-500 text-white py-2.5 rounded-lg text-sm font-bold mt-2">
                ログイン
              </button>
            </Link>
            <p className="text-xs text-gray-400 text-center">
              パスワードをわすれた方は<span className="text-orange-600">こちら</span>
            </p>
          </CardContent>
        </Card>

        {/* Demo Role Selection */}
        <Card className="border border-dashed border-orange-300 shadow-none bg-orange-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-orange-700 font-bold mb-2">🎮 デモモード</p>
            <p className="text-xs text-gray-500 mb-3">ロールを選んでお試しできます</p>
            <div className="space-y-2">
              <Link href="/">
                <button className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-orange-400 transition-colors">
                  <p className="text-sm font-bold">👔 社長・本部</p>
                  <p className="text-xs text-gray-400">全店舗の数字・P/L・ロス管理</p>
                </button>
              </Link>
              <Link href="/">
                <button className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-orange-400 transition-colors mt-2">
                  <p className="text-sm font-bold">📋 エリアマネージャー</p>
                  <p className="text-xs text-gray-400">エリアの店舗くらべ・シフト</p>
                </button>
              </Link>
              <Link href="/">
                <button className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-orange-400 transition-colors mt-2">
                  <p className="text-sm font-bold">🏪 店長</p>
                  <p className="text-xs text-gray-400">今日の売上・仕入れ・シフト</p>
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-gray-400 text-center">
          © 2026 Kanjo by Aentro Inc.
        </p>
      </div>
    </div>
  );
}
