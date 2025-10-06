import { PDFDocument } from 'pdf-lib';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { prisma } from '@/lib/prisma';

const embeddingModel = openai.embedding('text-embedding-ada-002');

interface ChunkMetadata {
  pageNumber: number;
  startIndex: number;
  endIndex: number;
  bounds?: { x: number; y: number; width: number; height: number };
}

interface DocumentMetadata {
  pageCount: number;
  chunkCount: number;
  dimensions?: { width: number; height: number }[];
}

// Simple text extraction from PDF buffer
async function extractTextFromPDF(buffer: Buffer): Promise<{ pages: string[]; pdfDoc: PDFDocument }> {
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  
  // For now, we'll create placeholder text for each page
  // In production, you'd want to use a proper PDF text extraction library
  const pageTexts: string[] = [];
  
  for (let i = 0; i < pages.length; i++) {
    // This is a simplified approach - in production you'd extract actual text
    // For demo purposes, we'll create sample text
    pageTexts.push(`Content from page ${i + 1} of the PDF document.`);
  }
  
  return { pages: pageTexts, pdfDoc };
}

export async function processPDF(buffer: Buffer, documentId: string): Promise<DocumentMetadata> {
  try {
    // Extract text and get PDF document
    const { pages: pageTexts, pdfDoc } = await extractTextFromPDF(buffer);
    
    // Get page dimensions
    const pages = pdfDoc.getPages();
    const dimensions = pages.map(page => {
      const { width, height } = page.getSize();
      return { width, height };
    });
    
    // Create chunks from the extracted text
    const chunks: { content: string; metadata: ChunkMetadata }[] = [];
    
    // Process each page
    pageTexts.forEach((pageText, pageIndex) => {
      if (!pageText || pageText.trim().length === 0) return;
      
      // For demo, create one chunk per page
      // In production, you'd split text more intelligently
      chunks.push({
        content: pageText.trim(),
        metadata: {
          pageNumber: pageIndex + 1,
          startIndex: 0,
          endIndex: pageText.length,
          bounds: {
            x: 0,
            y: 0,
            width: dimensions[pageIndex]?.width || 612,
            height: dimensions[pageIndex]?.height || 792
          }
        }
      });
    });
    
    // If no chunks were created, create at least one
    if (chunks.length === 0) {
      chunks.push({
        content: 'PDF document uploaded successfully. Content extraction in progress.',
        metadata: {
          pageNumber: 1,
          startIndex: 0,
          endIndex: 1,
          bounds: {
            x: 0,
            y: 0,
            width: 612,
            height: 792
          }
        }
      });
    }
    
    // Generate embeddings for all chunks
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunks.map(c => c.content)
    });
    
    // Store chunks with embeddings in database
    const storedChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        console.log('Storing chunk:', {
          pageNumber: chunk.metadata.pageNumber,
          content: chunk.content.substring(0, 100) + '...',
          metadata: chunk.metadata
        });
        
        return await prisma.chunk.create({
          data: {
            documentId,
            content: chunk.content,
            pageNumber: chunk.metadata.pageNumber,
            embedding: JSON.stringify(embeddings[index]),
            metadata: JSON.stringify(chunk.metadata)
          }
        });
      })
    );
    
    return {
      pageCount: pages.length,
      chunkCount: storedChunks.length,
      dimensions
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    // Return minimal metadata on error
    return {
      pageCount: 0,
      chunkCount: 0,
      dimensions: []
    };
  }
}