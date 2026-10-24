-- Enable Row Level Security for RAG tables
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Policies for knowledge_documents
CREATE POLICY "Allow authenticated users to read knowledge documents" 
ON public.knowledge_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert knowledge documents" 
ON public.knowledge_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update knowledge documents" 
ON public.knowledge_documents FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete knowledge documents" 
ON public.knowledge_documents FOR DELETE TO authenticated USING (true);

-- Policies for document_chunks
CREATE POLICY "Allow authenticated users to read document chunks" 
ON public.document_chunks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert document chunks" 
ON public.document_chunks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update document chunks" 
ON public.document_chunks FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete document chunks" 
ON public.document_chunks FOR DELETE TO authenticated USING (true);
