/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Headers for PWA / SW scope
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest-:role.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ]
  },
}

// Conditionally wrap with Sentry. We avoid a hard dependency so the build still
// works when @sentry/nextjs is not installed (DSN-less environments).
let exported = nextConfig
try {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { withSentryConfig } = require("@sentry/nextjs")
    exported = withSentryConfig(
      nextConfig,
      {
        silent: true,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
      {
        widenClientFileUpload: true,
        hideSourceMaps: true,
        disableLogger: true,
        automaticVercelMonitors: false,
      },
    )
  }
} catch {
  // @sentry/nextjs not installed — keep base config
}

module.exports = exported
