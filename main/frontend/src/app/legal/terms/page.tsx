export const metadata = {
  title: "利用規約 - AENTRO Restaurant OS",
}

export default function TermsPage() {
  return (
    <article className="min-h-screen bg-[#0a0e14] text-white/85 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-white">利用規約</h1>
          <p className="text-sm text-white/50">最終更新日: 2026年5月2日</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">第1条（適用）</h2>
          <p>本規約は、AENTRO Restaurant OS（以下「本サービス」）の利用条件を定めるものです。利用者は本規約に同意の上、本サービスを利用するものとします。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">第2条（利用登録）</h2>
          <p>本サービスの利用は、運営事業者（雇用主）から ID を発行された者に限ります。SSO による認証を経て利用するものとします。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">第3条（禁止事項）</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>他者になりすまして打刻を行う行為</li>
            <li>顔認証データを不正に取得・複製する行為</li>
            <li>本サービスの脆弱性を意図的に悪用する行為</li>
            <li>関連法令、本規約、運営事業者の社内規程に違反する行為</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">第4条（個人情報の取り扱い）</h2>
          <p>本サービスにおける個人情報の取り扱いは、別途定める<a href="/legal/privacy-policy" className="text-emerald-300 underline">プライバシーポリシー</a>に従うものとします。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">第5条（労務コンプライアンス）</h2>
          <p>本サービスは、労働基準法に基づき以下の制御を自動実施します。</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>未成年（18歳未満）の22:00-05:00 打刻禁止（第61条）</li>
            <li>6時間超労働時の休憩取得義務（第34条）</li>
            <li>打刻記録の3年間保管（第109条）</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">第6条（データ削除）</h2>
          <p>利用者は、設定画面の「データ削除を申請する」からいつでも個人データの削除を請求できます。ただし、労働基準法上保管義務のある打刻記録については、法定保管期間（3年）経過後に削除されます。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">第7条（免責）</h2>
          <p>運営事業者は、利用者が本サービスを利用したことによって生じた損害について、運営事業者の故意または重過失に基づく場合を除き、責任を負いません。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">第8条（規約の変更）</h2>
          <p>運営事業者は、必要と判断した場合、利用者への通知の上、本規約を変更することができます。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">第9条（準拠法・裁判管轄）</h2>
          <p>本規約は日本法に準拠し、本サービスに関する一切の紛争については、運営事業者の本店所在地を管轄する裁判所を専属的合意管轄とします。</p>
        </section>
      </div>
    </article>
  )
}
