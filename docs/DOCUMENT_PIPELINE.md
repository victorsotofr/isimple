# Document Intake Pipeline

isimple should treat every uploaded file as a source document first, then derive structured data and agent context from it.

## Current MVP

1. Upload PDF/image to Supabase Storage bucket `documents`.
2. Store metadata in `documents`.
3. Extract fields with the current AI parser.
4. Match or create lots and tenants.
5. Save pending associations for human review.
6. Confirmed documents become trusted data in the product.

## Scalable Target

The upload entry point must stay the same from every UI surface:

- Documents vault
- Property creation
- Property detail
- Tenant detail
- Inbox/message thread

The backend should evolve into explicit stages:

1. `uploaded`: raw file stored, immutable source of truth.
2. `parsed`: OCR/markdown/text/tables extracted by a parser provider.
3. `extracted`: schema-specific JSON extracted by an LLM or extraction model.
4. `matched`: candidate lot/tenant/document type associations proposed.
5. `reviewed`: user confirmed or corrected the data.
6. `indexed`: confirmed text representation synced to the workspace OpenAI Vector Store.

## Provider Boundary

Do not bind the product to one parsing vendor. Use an internal adapter:

```ts
type ParsedDocument = {
  text: string;
  markdown?: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    blocks?: Array<{ text: string; bbox?: number[]; confidence?: number }>;
  }>;
  tables?: unknown[];
};

interface DocumentParser {
  parse(file: Blob): Promise<ParsedDocument>;
}
```

Candidates such as Reducto or LandingAI should implement this adapter. OpenAI/Anthropic should remain reasoning and extraction providers, not the storage/source-of-truth layer.

## Agent Context

Agents should not load every PDF into the prompt. They should retrieve context through:

- `documents`: source file, status, type, property, tenants.
- `extracted_data`: structured fields and review flags.
- `workspace_vector_stores` and `document_external_files`: OpenAI Vector Store/file IDs for retrieval.
- relational data: lots, tenants, leases, conversations.

Confirmed documents should be high-trust context. Pending documents should be shown with warnings and cited as unconfirmed.

## Implemented Foundation

- `document_processing_jobs` records extraction/indexing stages, provider, model, output, and failures.
- `document_deliveries` records prepared/sent document actions with recipient, channel, signed URL, and audit data.
- `workspace_vector_stores` records OpenAI Vector Store IDs by workspace/tenant/lot scope.
- `document_external_files` records OpenAI file sync status for each indexed document.
- Confirming a document triggers backend indexing through the agent service.
- Agent chat and draft graphs retrieve tenant-scoped document context before generating responses.

## Vector Store Strategy

Use OpenAI Vector Stores as the only unstructured RAG retrieval index. Supabase remains the source of truth
for workspace membership, identity resolution, document metadata, review status, delivery audit, and the
provider registry. Use one OpenAI Vector Store per workspace/agency by default. Do not create one store per
tenant by default; resolve the tenant first, then filter the workspace vector store by allowed document IDs.

The backend supports separate OpenAI projects: `OPENAI_API_KEY` is used for model calls, while
`OPENAI_VECTOR_STORE_API_KEY` is used for OpenAI Vector Store sync/search. If the vector-store key is not
set, the backend falls back to `OPENAI_API_KEY`.

Create tenant- or lot-scoped stores only for exceptional large customers with materially different data
isolation, deletion, or performance requirements. Pinecone should remain behind the provider registry until
we have evidence that OpenAI Vector Store latency, filter expressiveness, portability, or cost is the bottleneck.

## Agent Flow

1. Identify `workspace_id`.
2. Resolve WHO deterministically from `tenant_id`, `conversation_id`, sender email, or sender phone.
3. Load relational context for the tenant, lease, and lot from Supabase.
4. Compute the set of documents the tenant/lot is allowed to use.
5. Search the workspace OpenAI Vector Store with a document-ID filter.
6. Generate the answer/draft with retrieved citations and relational context.
7. For side-effect actions, require an explicit product action and audit row.

## Operational Notes

- Keep raw files private and use signed URLs for previews.
- Never log file contents or API keys.
- Store provider, model, latency, and errors per processing stage.
- Use background jobs for large batches; Vercel/Next API routes should only enqueue work once volume increases.
- Keep uploads idempotent with content hashes before enabling bulk imports at scale.
