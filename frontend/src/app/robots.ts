import type { MetadataRoute } from 'next';
import { absoluteUrl, siteConfig } from '@/lib/site';

const privateAppRoutes = [
  ...siteConfig.appRoutes,
  '/profile',
  '/create-workspace',
  '/invite',
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', ...siteConfig.agentRoutes],
        disallow: ['/api/', '/_next/', ...privateAppRoutes],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot'],
        allow: ['/', ...siteConfig.agentRoutes],
        disallow: ['/api/', '/_next/', ...privateAppRoutes],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
