import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { prisma } from '@/lib/prisma';

const embeddingModel = openai.embedding('text-embedding-ada-002');

interface RelevantChunk {
  content: string;
  pageNumber: number;
  similarity: number;
  metadata: any;
}

export async function findRelevantChunks(
  query: string, 
  documentId: string, 
  limit = 5
): Promise<RelevantChunk[]> {
  try {
    console.log('Searching for relevant chunks:', { query, documentId, limit });
    
    // Generate embedding for the query
    const { embedding: queryEmbedding } = await embed({
      model: embeddingModel,
      value: query
    });
    
    // Use pgvector's cosine similarity search with raw SQL
    const results = await prisma.$queryRaw<Array<{
      id: string;
      content: string;
      pageNumber: number;
      metadata: any;
      similarity: number;
    }>>`
      SELECT 
        id,
        content,
        "pageNumber",
        metadata,
        1 - (embedding <=> ${queryEmbedding}::vector) as similarity
      FROM "Chunk"
      WHERE "documentId" = ${documentId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit}
    `;
    
    console.log(`Found ${results.length} relevant chunks with pgvector`);
    
    // Log the results for debugging
    results.forEach((chunk, index) => {
      console.log(`Chunk ${index + 1}:`, {
        page: chunk.pageNumber,
        similarity: chunk.similarity.toFixed(4),
        preview: chunk.content.substring(0, 100) + '...'
      });
    });
    
    return results.map(chunk => ({
      content: chunk.content,
      pageNumber: chunk.pageNumber,
      similarity: chunk.similarity,
      metadata: chunk.metadata
    }));
  } catch (error) {
    console.error('Error in findRelevantChunks:', error);
    return [];
  }
}