'use server';

import { createClient } from '@/lib/supabase/server';
import { generateDocumentEmbeddings, generateQueryEmbedding } from '@/lib/gemini/embedding';
import { chunkText } from '@/lib/rag/chunker';

import { revalidatePath } from 'next/cache';
import { checkRateLimit, expensiveRateLimiter } from '@/lib/ratelimit';

/**
 * Uploads a PDF, parses it, chunks it, generates embeddings, and saves to pgvector.
 */
export async function uploadKnowledgeDocument(formData: FormData) {
  const pdfParse = (await import('pdf-parse') as unknown as { default: (dataBuffer: Buffer) => Promise<{ text: string }> }).default;
  const supabase = await createClient();
  // In a real app, verify admin role here
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Rate Limiting by User ID to prevent spamming expensive embeddings
  const isAllowed = await checkRateLimit(`rl_knowledge_${user.id}`, expensiveRateLimiter);
  if (!isAllowed) {
    throw new Error('Too many requests. Please wait a minute before uploading another document.');
  }

  const file = formData.get('file') as File;
  if (!file || file.type !== 'application/pdf') {
    throw new Error('Please upload a valid PDF file.');
  }

  // Restrict PDF file size to a maximum of 10MB to prevent DoS/out-of-memory issues
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the maximum limit of 10MB.');
  }

  // 1. Read PDF
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const pdfData = await pdfParse(buffer);
  
  if (!pdfData.text || pdfData.text.trim() === '') {
    throw new Error('Could not extract text from PDF.');
  }

  // 2. Save Document Record
  const { data: docData, error: docError } = await supabase
    .from('knowledge_documents')
    .insert({
      filename: file.name,
      content_type: file.type,
      size_bytes: file.size
    })
    .select('id')
    .single();

  if (docError || !docData) {
    throw new Error('Failed to create document record: ' + docError?.message);
  }

  // 3. Chunk the Text
  const chunks = chunkText(pdfData.text, 1000, 200);

  // 4. Generate Embeddings (batch)
  const embeddings = await generateDocumentEmbeddings(chunks);

  // 5. Insert Chunks with Vectors
  const chunkRows = chunks.map((chunk, index) => ({
    document_id: docData.id,
    content: chunk,
    embedding: JSON.stringify(embeddings[index]) // pgvector accepts array formatted as string "[0.1, ...]" or direct array if client supports it
  }));

  // Perform a batch insert
  const { error: chunkError } = await supabase
    .from('document_chunks')
    .insert(chunkRows);

  if (chunkError) {
    // Rollback document
    await supabase.from('knowledge_documents').delete().eq('id', docData.id);
    throw new Error('Failed to save document chunks: ' + chunkError.message);
  }

  revalidatePath('/dashboard/admin/knowledge');
  return { success: true, chunkCount: chunks.length };
}

/**
 * Searches the knowledge base for relevant context.
 */
export async function retrieveRelevantKnowledge(query: string, matchCount = 3) {
  const supabase = await createClient();
  
  try {
    // 1. Embed query
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // 2. Perform vector similarity search via RPC
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: JSON.stringify(queryEmbedding), // Pass as string array format for pgvector
      match_threshold: 0.7, // Only matches with high similarity
      match_count: matchCount
    });

    if (error) {
      console.error('Vector search error:', error);
      return [];
    }

    return data as { content: string; similarity: number }[];
  } catch (error) {
    console.error('Error retrieving knowledge:', error);
    return []; // Return empty array so chat doesn't crash
  }
}

/**
 * Fetches all uploaded knowledge documents.
 */
export async function getKnowledgeDocuments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('knowledge_documents')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}
