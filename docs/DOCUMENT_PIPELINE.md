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
6. `indexed`: confirmed text chunks embedded for retrieval.

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
- future `document_chunks`: text chunks with page/source metadata and embeddings.
- relational data: lots, tenants, leases, conversations.

Confirmed documents should be high-trust context. Pending documents should be shown with warnings and cited as unconfirmed.

## Operational Notes

- Keep raw files private and use signed URLs for previews.
- Never log file contents or API keys.
- Store provider, model, latency, and errors per processing stage.
- Use background jobs for large batches; Vercel/Next API routes should only enqueue work once volume increases.
- Keep uploads idempotent with content hashes before enabling bulk imports at scale.
