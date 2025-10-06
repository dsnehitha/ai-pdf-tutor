import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await context.params;
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch document with user validation
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id
      }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if there's an existing chat for this document
    const existingChat = await prisma.chat.findFirst({
      where: {
        documentId,
        userId: user.id
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return NextResponse.json({
      id: document.id,
      filename: document.filename,
      url: document.url,
      metadata: document.metadata,
      chatId: existingChat?.id,
      messages: existingChat?.messages || []
    });
  } catch (error) {
    console.error('Document fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}