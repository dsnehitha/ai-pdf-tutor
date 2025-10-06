import { streamText, generateText} from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { findRelevantChunks } from '@/lib/similarity-search';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return new Response('User not found', { status: 404 });
    }
    
    const { messages, documentId, chatId: providedChatId } = await req.json();
    
    // Validate document ownership
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id
      }
    });
    
    if (!document) {
      return new Response('Document not found', { status: 404 });
    }
    
    // Get or create chat
    let chat;
    if (providedChatId) {
      chat = await prisma.chat.findUnique({
        where: { id: providedChatId },
        include: { messages: true }
      });
    }
    
    if (!chat) {
      // Create new chat
      const lastUserMessage = messages[messages.length - 1];
      const title = lastUserMessage?.content?.slice(0, 50) || 'New Chat';
      
      chat = await prisma.chat.create({
        data: {
          userId: user.id,
          documentId,
          title
        },
        include: { messages: true }
      });
    }
    
    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    
    // Find relevant chunks using pgvector similarity search
    const relevantChunks = await findRelevantChunks(
      lastMessage.content,
      documentId,
      5 // Get top 5 most relevant chunks
    );
    
    console.log('Chat API - Processing with RAG:', {
      query: lastMessage.content,
      documentId,
      chunksFound: relevantChunks.length,
      chunks: relevantChunks.map(c => ({
        page: c.pageNumber,
        similarity: c.similarity.toFixed(4),
        preview: c.content.substring(0, 50) + '...'
      }))
    });
    
    // Build context from relevant chunks
    const context = relevantChunks
      .map(chunk => `[Page ${chunk.pageNumber}] ${chunk.content}`)
      .join('\n\n');
    
    // Save user message to database
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: lastMessage.content
      }
    });

    // Add metadata about the relevant pages to the response
    const pageMetadata = {
      primaryPage: relevantChunks[0]?.pageNumber || 1,
      relevantPages: [...new Set(relevantChunks.map(c => c.pageNumber))],
      chunks: relevantChunks.map(chunk => ({
        page: chunk.pageNumber,
        snippet: chunk.content.substring(0, 100),
        similarity: chunk.similarity
      }))
    };
    
    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages,
      system: `You are an AI tutor helping students understand the PDF document "${document.filename}".
        
        Use the following relevant excerpts from the document to answer questions:
        ${context}
        
        Guidelines:
        - Provide comprehensive, educational answers to the user's questions
        - ALWAYS cite page numbers when referencing information (e.g., "On page 3...")
        - Quote directly from the provided context when relevant
        - Be specific and accurate in your explanations
        - The most relevant content is on pages: ${[...new Set(relevantChunks.map(c => c.pageNumber))].join(', ')}
        
        At the end of your response, include metadata in this format:
        [PAGE: X] - to indicate the primary page being discussed
        [HIGHLIGHT: page X, "text to highlight"] - to indicate important text to highlight`,
      onFinish: async (result) => {
        // Save assistant message to database
        const { text } = result;
        
        await prisma.message.create({
          data: {
            chatId: chat.id,
            role: 'assistant',
            content: text || '',
            metadata: pageMetadata // Store page metadata for reference
          }
        });
      },
      maxTokens: 1000,
      temperature: 0.4,
      maxRetries: 2
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return new Response('OpenAI API key not configured', { status: 500 });
      }
      if (error.message.includes('rate limit')) {
        return new Response('API rate limit exceeded. Please try again later.', { status: 429 });
      }
    }
    
    return new Response('Internal server error', { status: 500 });
  }
}