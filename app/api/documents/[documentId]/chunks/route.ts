import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { findRelevantChunks } from '@/lib/similarity-search';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const { documentId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('query');
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return new Response('User not found', { status: 404 });
    }
    
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
    
    if (query) {
      // Find relevant chunks for the query
      const chunks = await findRelevantChunks(query, documentId, 5);
      return Response.json({ chunks });
    } else {
      // Return all chunks for the document
      const chunks = await prisma.chunk.findMany({
        where: { documentId },
        orderBy: [
          { pageNumber: 'asc' },
          { startIndex: 'asc' }
        ],
        select: {
          id: true,
          content: true,
          pageNumber: true,
          metadata: true,
          startIndex: true,
          endIndex: true
        }
      });
      
      return Response.json({ chunks });
    }
  } catch (error) {
    console.error('Chunks API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}