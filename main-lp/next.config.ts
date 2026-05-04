import type { NextConfig } from "next"

const config: NextConfig = {
  basePath: "/restaurants",
  assetPrefix: "/restaurants",
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
  // basePath の外（ルート `/`）にアクセスされた場合 /restaurants へ自動リダイレクト
  async redirects() {
    return [
      {
        source: "/",
        destination: "/restaurants",
        permanent: false,
        basePath: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
}

export default config
