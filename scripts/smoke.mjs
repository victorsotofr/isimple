const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const agentHealthUrl = process.env.AGENT_HEALTH_URL ?? 'http://127.0.0.1:8000/health';

const checks = [
  { name: 'home', url: `${appUrl}/`, statuses: [200] },
  { name: 'login', url: `${appUrl}/login`, statuses: [200] },
  { name: 'signup', url: `${appUrl}/signup`, statuses: [200, 302, 307, 308] },
  { name: 'robots', url: `${appUrl}/robots.txt`, statuses: [200] },
  { name: 'sitemap', url: `${appUrl}/sitemap.xml`, statuses: [200] },
  { name: 'llms', url: `${appUrl}/llms.txt`, statuses: [200] },
  { name: 'llms-full', url: `${appUrl}/llms-full.txt`, statuses: [200] },
  { name: 'ai-actions', url: `${appUrl}/.well-known/ai-actions`, statuses: [200] },
  { name: 'mcp-manifest', url: `${appUrl}/.well-known/mcp`, statuses: [200] },
  { name: 'openapi', url: `${appUrl}/api/openapi`, statuses: [200] },
  { name: 'tickets-auth', url: `${appUrl}/tickets`, statuses: [200, 302, 307, 308] },
  { name: 'documents-auth', url: `${appUrl}/documents`, statuses: [200, 302, 307, 308] },
  { name: 'agenda-auth', url: `${appUrl}/agenda`, statuses: [200, 302, 307, 308] },
  { name: 'analytics-auth', url: `${appUrl}/analytics`, statuses: [200, 302, 307, 308] },
  { name: 'agent-health', url: agentHealthUrl, statuses: [200] },
];

let failures = 0;

for (const check of checks) {
  try {
    const res = await fetch(check.url, { redirect: 'manual' });
    if (!check.statuses.includes(res.status)) {
      failures += 1;
      console.error(`[fail] ${check.name}: expected ${check.statuses.join('/')} got ${res.status}`);
      continue;
    }
    console.log(`[ok] ${check.name}: ${res.status}`);
  } catch (error) {
    failures += 1;
    console.error(`[fail] ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures > 0) {
  process.exit(1);
}
