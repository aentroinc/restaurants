export const metadata = {
  title: "プライバシーポリシー - AENTRO Restaurant OS",
}

export default function PrivacyPolicyPage() {
  return (
    <article className="min-h-screen bg-[#0a0e14] text-white/85 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6 prose prose-invert prose-sm">
        <header className="space-y-1 not-prose">
          <h1 className="text-3xl font-bold text-white">プライバシーポリシー</h1>
          <p className="text-sm text-white/50">最終更新日: 2026年5月2日</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">1. 取得する個人情報</h2>
          <p>本サービス（以下「本サービス」）は、飲食店オペレーション支援を目的として、以下の個人情報を取得します。</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>従業員基本情報: 氏名、メールアドレス、電話番号、生年月日、所属店舗</li>
            <li>顔特徴量（embedding ベクトル）: 出退勤打刻の本人認証目的（顔写真そのものは保存しません）</li>
            <li>位置情報（GPS 緯度・経度）: 打刻時のジオフェンス検証目的（打刻時のみ取得）</li>
            <li>打刻記録: 出退勤・休憩開始/終了時刻、店舗ID、認証方式</li>
            <li>面談・評価記録: 店長・SVとの面談メモ、人事評価、AI要約</li>
            <li>操作ログ: アクセス時刻、IPアドレス、ユーザーエージェント</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">2. 利用目的</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>出退勤管理・賃金計算・労働基準監督署対応</li>
            <li>本人認証（顔・PIN・QR）</li>
            <li>労務コンプライアンス（未成年深夜禁止、休憩取得義務等）の監視</li>
            <li>店舗オペレーション改善のためのKPI分析</li>
            <li>人事評価・育成計画の策定</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">3. 個人情報の保管期間</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>顔特徴量: 退職または同意撤回まで（撤回後は即時削除）</li>
            <li>打刻記録: 労働基準法第109条に基づき<strong>3年間</strong>保管（法定）</li>
            <li>個人情報（氏名等）: 在職中。退職後は匿名化（氏名→「削除済」、生年月日→null）</li>
            <li>面談・評価: 在職中。退職後は匿名化</li>
            <li>監査ログ: 個人情報保護法等の法令に基づき必要な期間保管</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">4. 第三者提供</h2>
          <p>法令に基づく場合を除き、ご本人の同意なく第三者に提供することはありません。AI モデルの学習データとしてテナント外部に提供することもありません。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">5. 安全管理措置</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>テナント分離（Row-Level Security 相当）</li>
            <li>Foundry スタイルの marking-based ACL による列単位アクセス制御</li>
            <li>顔特徴量・位置情報・生年月日には <code>pii.biometric</code> / <code>pii.location</code> / <code>pii.sensitive</code> マーキングを付与</li>
            <li>監査ログ（AuditLog）による全アクセスの追跡</li>
            <li>SSO + MFA 認証による不正アクセス防止</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">6. ご本人の権利</h2>
          <p>個人情報保護法（2022改正）に基づき、ご本人は以下の権利を有します。</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>開示請求権（第28条）</li>
            <li>訂正・追加・削除請求権（第29条）</li>
            <li>利用停止・消去等請求権（第30条）</li>
            <li>第三者提供記録の開示請求権（第28条第5項）</li>
          </ul>
          <p>
            アプリ内の <strong>設定 → データ削除を申請する</strong> から、いつでも削除リクエストを送信できます。管理者承認後、原則7日以内に処理されます。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">7. お問い合わせ窓口</h2>
          <p>個人情報の取り扱いに関するお問い合わせは、以下までお願いいたします。</p>
          <p>AENTRO Restaurant OS 個人情報保護管理者<br />Email: privacy@aentro.example</p>
        </section>
      </div>
    </article>
  )
}
