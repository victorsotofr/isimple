import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/llms.txt', '/api/openapi', '/.well-known/ai-actions'],
        disallow: ['/api/', '/_next/', '/inbox', '/documents', '/lots', '/tenants', '/tickets', '/settings'],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot'],
        allow: ['/', '/llms.txt', '/api/openapi', '/.well-known/ai-actions'],
        disallow: ['/api/', '/_next/', '/inbox', '/documents', '/lots', '/tenants', '/tickets', '/settings'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
