-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing legal documents (PDFs, etc.)
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  document_type TEXT DEFAULT 'rules', -- 'rules', 'regulations', 'precedents', etc.
  jurisdiction TEXT DEFAULT 'ghana',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing document chunks with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient search
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_legal_documents_type ON legal_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_legal_documents_jurisdiction ON legal_documents(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_legal_documents_active ON legal_documents(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for legal_documents
DO $$ BEGIN
  CREATE POLICY "Anyone can view active documents"
    ON legal_documents FOR SELECT
    USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload documents"
    ON legal_documents FOR INSERT
    WITH CHECK (auth.uid() = uploaded_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Document owners can update their documents"
    ON legal_documents FOR UPDATE
    USING (auth.uid() = uploaded_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Document owners can delete their documents"
    ON legal_documents FOR DELETE
    USING (auth.uid() = uploaded_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS policies for document_chunks
DO $$ BEGIN
  CREATE POLICY "Anyone can view chunks from active documents"
    ON document_chunks FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM legal_documents
        WHERE legal_documents.id = document_chunks.document_id
        AND legal_documents.is_active = TRUE
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert chunks"
    ON document_chunks FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM legal_documents
        WHERE legal_documents.id = document_chunks.document_id
        AND legal_documents.uploaded_by = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DO $$ BEGIN
  CREATE TRIGGER update_legal_documents_updated_at
    BEFORE UPDATE ON legal_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Function for semantic search using cosine similarity
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 5,
  document_type_filter TEXT DEFAULT NULL,
  jurisdiction_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title TEXT,
  chunk_index INTEGER,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id as chunk_id,
    dc.document_id,
    ld.title as document_title,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN legal_documents ld ON dc.document_id = ld.id
  WHERE
    1 - (dc.embedding <=> query_embedding) > match_threshold
    AND ld.is_active = TRUE
    AND (document_type_filter IS NULL OR ld.document_type = document_type_filter)
    AND (jurisdiction_filter IS NULL OR ld.jurisdiction = jurisdiction_filter)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
