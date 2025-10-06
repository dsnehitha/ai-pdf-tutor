import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { processPDF } from '@/lib/pdf-processor';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    
    const fileName = `${Date.now()}.pdf`;
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Create document record with user association
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        filename: file.name,
        url: `/uploads/${fileName}`
      }
    });

    // Process PDF and create chunks with embeddings
    try {
      const metadata = await processPDF(buffer, document.id);
      // Update document with metadata
      await prisma.document.update({
        where: { id: document.id },
        data: { metadata: JSON.stringify(metadata) }
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
    }

    return NextResponse.json({ 
      id: document.id,
      url: `/uploads/${fileName}`
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}