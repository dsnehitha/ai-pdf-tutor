import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
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
    
    const { chatId } = await params;
    
    // Fetch chat with messages
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: user.id
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }
    
    const formattedMessages = chat.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt
    }));
    
    return Response.json({
      chatId: chat.id,
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
