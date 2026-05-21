export const siteConfig = {
  name: 'isimple',
  legalName: 'isimple',
  defaultUrl: 'http://localhost:3000',
  description:
    'Plateforme de gestion locative IA pour centraliser messages, documents, biens, locataires, tickets, prestataires et actions de suivi.',
  locale: 'fr_FR',
  keywords: [
    'gestion locative',
    'property management',
    'assistant IA immobilier',
    'documents locatifs',
    'RAG immobilier',
    'agent immobilier IA',
    'inbox locataire',
    'ticketing immobilier',
    'prestataires maintenance',
    'conformité locative',
  ],
  publicRoutes: ['/', '/login', '/signup'],
  appRoutes: [
    '/inbox',
    '/documents',
    '/documents/upload',
    '/lots',
    '/tenants',
    '/tickets',
    '/prestataires',
    '/agenda',
    '/analytics',
    '/settings',
  ],
  agentRoutes: ['/llms.txt', '/llms-full.txt', '/.well-known/ai-actions', '/.well-known/mcp', '/api/openapi'],
} as const;

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || siteConfig.defaultUrl).replace(/\/$/, '');
}

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
