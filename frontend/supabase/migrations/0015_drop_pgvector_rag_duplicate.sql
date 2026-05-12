-- Retrieval is centralized on OpenAI Vector Stores.
-- Supabase remains the relational source of truth and provider registry.

drop function if exists search_document_chunks(
  uuid,
  text,
  extensions.vector,
  integer,
  uuid,
  uuid,
  boolean,
  double precision,
  double precision,
  integer
);

drop table if exists document_chunks cascade;
