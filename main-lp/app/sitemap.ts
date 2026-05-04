import type { MetadataRoute } from "next"

const SITE = "https://aentroinc.com/restaurants"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${SITE}`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/value`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/security`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/poc`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/vs`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/demo`, lastModified: now, changeFrequency: "monthly", priority: 1.0 },
  ]
}
