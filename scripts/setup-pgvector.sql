-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create function for similarity search if needed
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  doc_id text,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id text,
  content text,
  "pageNumber" int,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    "Chunk".id,
    "Chunk".content,
    "Chunk"."pageNumber",
    "Chunk".metadata,
    1 - ("Chunk".embedding <=> query_embedding) as similarity
  FROM "Chunk"
  WHERE "Chunk"."documentId" = doc_id
    AND 1 - ("Chunk".embedding <=> query_embedding) > match_threshold
    AND "Chunk".embedding IS NOT NULL
  ORDER BY "Chunk".embedding <=> query_embedding
  LIMIT match_count;
$$;