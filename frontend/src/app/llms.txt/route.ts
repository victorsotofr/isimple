import { absoluteUrl } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
  const body = `# isimple

isimple is an AI-native property management workspace for French rental agencies and managers.

## What the product does
- Centralizes tenant and landlord messages, documents, properties, tenants, tickets, and agency actions.
- Processes rental documents such as leases, guarantees, inventories, payment certificates, CAF documents, IDs, invoices, mandates, insurance certificates, and RIBs.
- Extracts structured fields, proposes document categorization, matches existing entities, and suggests new properties or tenants when no reliable match exists.
- Keeps human review in the loop before documents become confirmed records or are sent to tenants, landlords, providers, or other channels.
- Uses a workspace-scoped knowledge base for retrieval-augmented generation so agents answer with the right agency and tenant context.
- Tracks operational tickets, due dates, responsibility, providers, compliance items, and agenda/analytics views so managers see what needs action next.

## Important public URLs
- Home: ${absoluteUrl('/')}
- App login: ${absoluteUrl('/login')}
- App signup: ${absoluteUrl('/signup')}
- Sitemap: ${absoluteUrl('/sitemap.xml')}
- Robots policy: ${absoluteUrl('/robots.txt')}
- Agent action manifest: ${absoluteUrl('/.well-known/ai-actions')}
- MCP discovery manifest: ${absoluteUrl('/.well-known/mcp')}
- OpenAPI descriptor: ${absoluteUrl('/api/openapi')}
- Extended agent brief: ${absoluteUrl('/llms-full.txt')}

## Agent policy
- Public crawlers may read the marketing site, llms.txt, sitemap, OpenAPI descriptor, and agent action manifest.
- Authenticated app data is private and must not be crawled.
- Agents must authenticate as a workspace user before reading messages, Gmail threads, documents, tenants, properties, creating drafts, or sending email.
- Email and document actions are review-first by default. Gmail can create drafts or send directly only from an authenticated manager action.

## Data model hints
- Organization/workspace is the first routing boundary.
- User identity and workspace membership decide which documents, tenants, messages, Gmail accounts, and vector stores an agent may use.
- Documents are linked to workspace, optional property, optional tenant, processing status, extracted fields, storage path, and external vector file records.
- Gmail is linked per workspace user with OAuth scopes for read-only mailbox access, compose, draft creation, attachments, and manager-triggered sending.
- Tickets can be linked to properties, tenants, providers, source records, due dates, AI summaries, and event history.
- Compliance items and notifications are workspace-scoped records for missing documents, review queues, and operational reminders.

## Preferred agent workflow
1. Identify the actor and workspace.
2. Resolve the tenant, landlord, property, conversation, or document context.
3. Retrieve relevant confirmed documents and recent messages.
4. Produce an answer, draft, or proposed action with citations/links to internal records.
5. Require manager confirmation for outbound communication or irreversible changes.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
