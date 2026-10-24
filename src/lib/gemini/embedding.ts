import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Generates an embedding for a single text query (768 dimensions for pgvector).
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: query,
    config: { outputDimensionality: 768 },
  });
  return response.embeddings?.[0]?.values || [];
}

/**
 * Generates embeddings for multiple chunks of text simultaneously (768 dimensions for pgvector).
 */
export async function generateDocumentEmbeddings(chunks: string[]): Promise<number[][]> {
  const responses = await Promise.all(
    chunks.map((chunk) =>
      ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: chunk,
        config: { outputDimensionality: 768 },
      })
    )
  );
  return responses.map((res) => res.embeddings?.[0]?.values || []);
}
