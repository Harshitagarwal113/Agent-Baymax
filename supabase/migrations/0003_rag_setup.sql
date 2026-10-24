-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to track uploaded documents
create table public.knowledge_documents (
  id uuid primary key default uuid_generate_v4(),
  filename text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for the document chunks and their vector embeddings
create table public.document_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.knowledge_documents(id) on delete cascade not null,
  content text not null,
  embedding vector(768) not null, -- Gemini text-embedding-004 outputs 768 dimensions
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a generic HNSW index for fast vector similarity search
create index on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Create a function to similarity search for document chunks
create or replace function match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;
