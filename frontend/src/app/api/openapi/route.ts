import { absoluteUrl } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    {
      openapi: '3.1.0',
      info: {
        title: 'isimple Agent Surface',
        version: '0.1.0',
        description:
          'Machine-readable description of agent-relevant isimple capabilities. Authenticated endpoints require a signed-in workspace user and enforce workspace membership.',
      },
      servers: [{ url: absoluteUrl('/') }],
      security: [{ cookieSession: [] }],
      components: {
        securitySchemes: {
          cookieSession: {
            type: 'apiKey',
            in: 'cookie',
            name: 'sb-auth-token',
            description: 'Supabase-authenticated browser session.',
          },
        },
        schemas: {
          GmailThread: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              thread_id: { type: 'string' },
              subject: { type: 'string' },
              from_email: { type: 'string' },
              from_name: { type: 'string' },
              snippet: { type: 'string' },
              body_text: { type: 'string' },
              received_at: { type: 'string', format: 'date-time' },
              labels: { type: 'array', items: { type: 'string' } },
              unread: { type: 'boolean' },
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    message_id: { type: 'string' },
                    direction: { type: 'string', enum: ['incoming', 'outgoing'] },
                    from_email: { type: 'string' },
                    from_name: { type: 'string' },
                    to_emails: { type: 'array', items: { type: 'string' } },
                    subject: { type: 'string' },
                    body_text: { type: 'string' },
                    received_at: { type: 'string', format: 'date-time' },
                    unread: { type: 'boolean' },
                  },
                },
              },
            },
          },
          DocumentUploadResponse: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              status: { type: 'string' },
              review_url: { type: 'string' },
            },
          },
        },
      },
      paths: {
        '/llms.txt': {
          get: {
            summary: 'Agent-oriented product summary',
            security: [],
            responses: { '200': { description: 'Plain-text agent guide' } },
          },
        },
        '/.well-known/ai-actions': {
          get: {
            summary: 'Agent capability manifest',
            security: [],
            responses: { '200': { description: 'Agent action metadata' } },
          },
        },
        '/api/documents/upload': {
          post: {
            summary: 'Upload a document for processing and human review',
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    required: ['workspace_id', 'file'],
                    properties: {
                      workspace_id: { type: 'string', format: 'uuid' },
                      file: { type: 'string', format: 'binary' },
                      lot_id: { type: 'string', format: 'uuid' },
                      tenant_id: { type: 'string', format: 'uuid' },
                      conversation_id: { type: 'string', format: 'uuid' },
                      source: { type: 'string', enum: ['documents', 'lot_intake', 'tenant_intake', 'inbox'] },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Document queued for review',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/DocumentUploadResponse' },
                  },
                },
              },
            },
          },
        },
        '/api/gmail/connect': {
          get: {
            summary: 'Start Gmail OAuth connection for the current workspace user',
            parameters: [
              { name: 'workspace_id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: { '302': { description: 'Redirects to Google OAuth' } },
          },
        },
        '/api/gmail/connections': {
          get: {
            summary: 'List Gmail accounts connected by the current user for a workspace',
            parameters: [
              { name: 'workspace_id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: { '200': { description: 'Connected Gmail accounts' } },
          },
        },
        '/api/gmail/threads': {
          get: {
            summary: 'List Gmail threads for a connected account',
            parameters: [
              { name: 'workspace_id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
              { name: 'connection_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
              { name: 'q', in: 'query', required: false, schema: { type: 'string' } },
            ],
            responses: {
              '200': {
                description: 'Gmail thread summaries',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        threads: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/GmailThread' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/gmail/drafts': {
          post: {
            summary: 'Create a reviewed Gmail draft, optionally with attachments.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['workspace_id', 'connection_id', 'to', 'subject', 'body'],
                    properties: {
                      workspace_id: { type: 'string', format: 'uuid' },
                      connection_id: { type: 'string', format: 'uuid' },
                      to: { type: 'string' },
                      subject: { type: 'string' },
                      body: { type: 'string' },
                      thread_id: { type: 'string' },
                    },
                  },
                },
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    required: ['workspace_id', 'connection_id', 'to', 'subject', 'body'],
                    properties: {
                      workspace_id: { type: 'string', format: 'uuid' },
                      connection_id: { type: 'string', format: 'uuid' },
                      to: { type: 'string' },
                      subject: { type: 'string' },
                      body: { type: 'string' },
                      thread_id: { type: 'string' },
                      attachments: { type: 'array', items: { type: 'string', format: 'binary' } },
                    },
                  },
                },
              },
            },
            responses: { '200': { description: 'Draft created in Gmail' } },
          },
        },
        '/api/gmail/send': {
          post: {
            summary: 'Send a Gmail message from an authenticated manager action.',
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    required: ['workspace_id', 'connection_id', 'to', 'subject', 'body'],
                    properties: {
                      workspace_id: { type: 'string', format: 'uuid' },
                      connection_id: { type: 'string', format: 'uuid' },
                      to: { type: 'string' },
                      subject: { type: 'string' },
                      body: { type: 'string' },
                      thread_id: { type: 'string' },
                      attachments: { type: 'array', items: { type: 'string', format: 'binary' } },
                    },
                  },
                },
              },
            },
            responses: { '200': { description: 'Message sent through Gmail' } },
          },
        },
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
