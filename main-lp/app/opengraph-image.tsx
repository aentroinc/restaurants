import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "AENTRO — 外食チェーン向け AI 経営支援"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0e14",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "system-ui",
          position: "relative",
        }}
      >
        {/* gradient bg */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "60%",
            height: "100%",
            background: "radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.15), transparent 60%)",
          }}
        />

        {/* logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "60px" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "2px solid #3b82f6",
              transform: "rotate(45deg)",
              borderRadius: "8px",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.16em" }}>
              AENTRO
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.10em" }}>
              Restaurant OS
            </div>
          </div>
        </div>

        {/* title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div>外食チェーンの「もったいない」を、</div>
          <div style={{ color: "#10b981" }}>AI が毎日見つけて教えます。</div>
        </div>

        {/* sub */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.65)",
            marginTop: 32,
            lineHeight: 1.5,
          }}
        >
外食チェーン専用 AI · 今のシステムは触らない · 5 社で実証済み
        </div>

        {/* stats */}
        <div style={{ display: "flex", gap: 60, marginTop: 60 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>32 億円</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>これまで減らしたロス（年）</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>9,240</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>導入店舗数</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>5 社</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>導入企業</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>100%</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>本契約転換率</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
