import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
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
  textBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

interface TextChunk {
  content: string;
  pageNumber: number;
  startIndex: number;
  endIndex: number;
  metadata: ChunkMetadata;
}

// Extract text from PDF using pdfjs-dist with bounding boxes
async function extractTextFromPDF(buffer: Buffer): Promise<{ 
  pages: Array<{ 
    text: string; 
    width: number; 
    height: number;
    textItems: Array<{
      str: string;
      x: number;
      y: number;
      width: number;
      height: number;
      transform: number[];
    }>;
  }> 
}> {
  // Dynamic worker import for Vercel serverless compatibility
  // @ts-ignore
  await import('pdfjs-dist/build/pdf.worker.min.mjs');
  
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  
  const pages = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Extract text items with position data
    const textItems = textContent.items as any[];
    const processedItems = textItems.map(item => {
      // Get bounding box from transform matrix
      const tx = item.transform[4];
      const ty = item.transform[5];
      const fontSize = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]);
      
      return {
        str: item.str,
        x: tx,
        y: viewport.height - ty - fontSize, // Convert from PDF coords (bottom-left) to top-left
        width: item.width || (item.str.length * fontSize * 0.5),
        height: item.height || fontSize,
        transform: item.transform
      };
    });
    
    const pageText = textItems
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    pages.push({
      text: pageText,
      width: viewport.width,
      height: viewport.height,
      textItems: processedItems
    });
  }
  
  return { pages };
}

// Create overlapping chunks with text position tracking
function createOverlappingChunks(
  text: string,
  pageNumber: number,
  pageWidth: number,
  pageHeight: number,
  textItems: Array<{
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>,
  chunkSize: number = 400,
  overlap: number = 100
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return [];
  
  // Map words to their text items for position tracking
  const wordToTextItem = new Map<string, typeof textItems[0]>();
  let textItemIndex = 0;
  for (const word of words) {
    // Find corresponding text item
    while (textItemIndex < textItems.length) {
      const item = textItems[textItemIndex];
      if (item.str.includes(word)) {
        wordToTextItem.set(word, item);
        break;
      }
      textItemIndex++;
    }
  }
  
  let currentPosition = 0;
  
  while (currentPosition < words.length) {
    const chunkWords = words.slice(
      currentPosition,
      Math.min(currentPosition + chunkSize, words.length)
    );
    
    const chunkText = chunkWords.join(' ');
    
    if (chunkText.length > 50) { // Minimum chunk length
      // Calculate bounding box for this chunk
      let minX = pageWidth, minY = pageHeight, maxX = 0, maxY = 0;
      const textBounds: any[] = [];
      
      for (const word of chunkWords) {
        const item = wordToTextItem.get(word);
        if (item) {
          minX = Math.min(minX, item.x);
          minY = Math.min(minY, item.y);
          maxX = Math.max(maxX, item.x + item.width);
          maxY = Math.max(maxY, item.y + item.height);
          
          textBounds.push({
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height
          });
        }
      }
      
      // If we couldn't find positions, use estimates
      if (minX === pageWidth) {
        minX = 0;
        minY = (currentPosition / words.length) * pageHeight;
        maxX = pageWidth;
        maxY = minY + ((chunkSize / words.length) * pageHeight);
      }
      
      chunks.push({
        content: chunkText,
        pageNumber,
        startIndex: currentPosition,
        endIndex: Math.min(currentPosition + chunkSize, words.length),
        metadata: {
          pageNumber,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          pageWidth,
          pageHeight,
          textBounds: textBounds.length > 0 ? textBounds : undefined
        }
      });
    }
    
    // Move forward with overlap
    currentPosition += (chunkSize - overlap);
  }
  
  return chunks;
}

export async function processPDF(buffer: Buffer, documentId: string) {
  
  try {
    // Extract text from PDF with position data
    const { pages } = await extractTextFromPDF(buffer);
    
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
        page.height,
        page.textItems
      );
      allChunks.push(...pageChunks);
    });
    
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