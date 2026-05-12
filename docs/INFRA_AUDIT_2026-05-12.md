# Infra Audit - 2026-05-12

## Decisions Applied

- OpenAI Vector Stores are the single RAG retrieval index.
- Supabase pgvector `document_chunks` and `search_document_chunks` were removed as duplicate retrieval infrastructure.
- Supabase remains the source of truth for workspaces, members, tenants, lots, leases, conversations, documents, processing jobs, deliveries, and vector-store registry rows.
- Default retrieval scope is one vector store per workspace/agency.
- Tenant and lot scoping happens by deterministic identity resolution plus document-ID filtering inside the workspace vector store.
- OpenAI vector-store file sync is required for a document to reach `processing_status = indexed`.

## Current Runtime Flow

1. A document is uploaded to Supabase Storage.
2. The upload route extracts structured fields and `retrieval_text`.
3. The document is saved as `pending` with proposed lot/tenant associations.
4. A user reviews and confirms the document.
5. The frontend calls the agent `/api/documents/index` endpoint.
6. The agent builds a text representation from metadata, extracted data, and linked tenants.
7. The text file is uploaded into the workspace OpenAI Vector Store with attributes:
   `workspace_id`, `document_id`, `doc_type`, `status`, `visibility`, `lot_id`, `tenant_id`, `content_hash`.
8. Supabase records sync state in `document_external_files`.
9. Future agent calls resolve WHO, fetch relational context, search OpenAI Vector Stores with filters, then generate.

## Identity Flow

The agent resolves the tenant in this order:

1. provided `tenant_id`
2. `conversation_id -> conversations.tenant_id`
3. exact `sender_email -> tenants.email`
4. normalized `sender_phone -> tenants.phone`
5. unresolved

If unresolved, the agent can still answer general agency/workspace questions but should not claim tenant-specific facts.

## Vector Store Scope

Use one vector store per workspace by default.

Do not create one vector store per tenant for the MVP because it duplicates shared agency/property documents, complicates document lifecycle, and makes cross-tenant/property questions harder. Use tenant-level stores only if a customer has exceptional isolation, deletion, or scale requirements.

## Remaining Tech Debt

- LangGraph graphs are still simple request/response chains with no durable checkpointer. That is acceptable for classification/drafts, but any action-taking or human-in-the-loop workflow should add a Postgres checkpointer.
- LangSmith tracing is configured by env but not enabled locally by default. Set `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY` for staging/production observability.
- Document processing still runs synchronously from Next/FastAPI. Move indexing and delivery to a real job queue before large batch imports.
- Document parsing is still a native Anthropic prompt in a Next route. A parser adapter boundary exists in the docs but not as code.
- Deleting documents now calls unindex, but failures are logged rather than blocking deletion. A periodic reconciliation job should compare Supabase rows to OpenAI vector-store files.
- `AUDIT.md` is stale and should be regenerated or replaced before relying on it.
- Supabase migration history contains older timestamped remote migrations plus local numeric migrations. Continue using CLI carefully and avoid blind `db push --include-all`.

## Provider Posture

- OpenAI Vector Stores: primary RAG index.
- Supabase: source of truth, permissions, relational filtering, audit, storage.
- Pinecone: keep as a future provider behind `workspace_vector_stores` only if OpenAI Vector Stores become limiting on latency, filter expressiveness, portability, or cost.
