
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://toolsab.com',
      lastModified: new Date('2026-11-18'),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
