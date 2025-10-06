import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { prisma } from '@/lib/prisma';

const embeddingModel = openai.embedding('text-embedding-ada-002');

interface ChunkMetadata {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
}

interface TextChunk {
  content: string;
  pageNumber: number;
  startIndex: number;
  endIndex: number;
  metadata: ChunkMetadata;
}

// Extract text from PDF using pdfjs-dist
async function extractTextFromPDF(buffer: Buffer): Promise<{ pages: Array<{ text: string; width: number; height: number }> }> {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = getDocument({
    data: uint8Array,
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  
  const pages = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Extract text with proper spacing
    const textItems = textContent.items as any[];
    const pageText = textItems
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    pages.push({
      text: pageText,
      width: viewport.width,
      height: viewport.height
    });
  }
  
  return { pages };
}

// Create overlapping chunks for better context preservation
function createOverlappingChunks(
  text: string,
  pageNumber: number,
  pageWidth: number,
  pageHeight: number,
  chunkSize: number = 400,
  overlap: number = 100
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return [];
  
  let currentPosition = 0;
  
  while (currentPosition < words.length) {
    const chunkWords = words.slice(
      currentPosition,
      Math.min(currentPosition + chunkSize, words.length)
    );
    
    const chunkText = chunkWords.join(' ');
    
    if (chunkText.length > 50) { // Minimum chunk length
      chunks.push({
        content: chunkText,
        pageNumber,
        startIndex: currentPosition,
        endIndex: Math.min(currentPosition + chunkSize, words.length),
        metadata: {
          pageNumber,
          x: 0,
          y: (currentPosition / words.length) * pageHeight,
          width: pageWidth,
          height: (chunkSize / words.length) * pageHeight,
          pageWidth,
          pageHeight
        }
      });
    }
    
    // Move forward with overlap
    currentPosition += (chunkSize - overlap);
  }
  
  return chunks;
}

export async function processPDF(buffer: Buffer, documentId: string) {
  console.log('Starting PDF processing for document:', documentId);
  
  try {
    // Extract text from PDF
    const { pages } = await extractTextFromPDF(buffer);
    console.log(`Extracted text from ${pages.length} pages`);
    
    // Get basic metadata using pdf-lib
    const pdfDoc = await PDFDocument.load(buffer);
    const pdfPages = pdfDoc.getPages();
    
    // Create chunks with overlap for all pages
    const allChunks: TextChunk[] = [];
    
    pages.forEach((page, pageIndex) => {
      const pageChunks = createOverlappingChunks(
        page.text,
        pageIndex + 1,
        page.width,
        page.height
      );
      allChunks.push(...pageChunks);
    });
    
    console.log(`Created ${allChunks.length} chunks from PDF`);
    
    // If no chunks created, create at least one
    if (allChunks.length === 0) {
      allChunks.push({
        content: 'Empty PDF document',
        pageNumber: 1,
        startIndex: 0,
        endIndex: 0,
        metadata: {
          pageNumber: 1,
          x: 0,
          y: 0,
          width: 612,
          height: 792,
          pageWidth: 612,
          pageHeight: 792
        }
      });
    }
    
    // Generate embeddings in batches for efficiency
    const batchSize = 20;
    const embeddings: number[][] = [];
    
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const { embeddings: batchEmbeddings } = await embedMany({
        model: embeddingModel,
        values: batch.map(c => c.content)
      });
      embeddings.push(...batchEmbeddings);
      console.log(`Generated embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allChunks.length / batchSize)}`);
    }
    
    // Store chunks with embeddings using raw SQL for vector type
    const storedChunks = [];
    for (let i = 0; i < allChunks.length; i++) {
      const chunk = allChunks[i];
      const embedding = embeddings[i];
      
      // Store using Prisma with raw SQL for vector
      const result = await prisma.$queryRaw`
        INSERT INTO "Chunk" (
          id, 
          "documentId", 
          content, 
          "pageNumber", 
          embedding, 
          metadata,
          "startIndex",
          "endIndex",
          "createdAt"
        )
        VALUES (
          ${`chunk_${Date.now()}_${i}`},
          ${documentId},
          ${chunk.content},
          ${chunk.pageNumber},
          ${embedding}::vector,
          ${JSON.stringify(chunk.metadata)}::jsonb,
          ${chunk.startIndex},
          ${chunk.endIndex},
          ${new Date()}
        )
        RETURNING id
      `;
      storedChunks.push(result);
    }
    
    console.log(`Stored ${storedChunks.length} chunks in database`);
    
    // Store document metadata
    const metadata = {
      pageCount: pages.length,
      chunkCount: allChunks.length,
      dimensions: pages.map(p => ({ width: p.width, height: p.height }))
    };
    
    return metadata;
  } catch (error) {
    console.error('PDF processing error:', error);
    throw error;
  }
}