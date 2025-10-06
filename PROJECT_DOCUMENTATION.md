# AI PDF Tutor - Complete Project Documentation & Setup Guide

## Project Overview

This is an AI-powered PDF tutor application built for the StudyFetch technical assignment. It provides an interactive split-screen interface where students can upload PDF documents and engage with an AI tutor through text and voice chat. The AI can highlight, annotate, and navigate through the PDF in real-time while providing context-aware responses.

## Core Features Implemented

### ✅ 1. Authentication System
- **Email/Password Authentication**: Secure signup and login using NextAuth.js
- **Session Management**: JWT-based session handling with persistent user sessions
- **User Isolation**: Each user can only access their own documents and chats
- **Implementation Files**:
  - `/app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
  - `/app/api/auth/signup/route.ts` - User registration endpoint
  - `/app/auth/signin/page.tsx` - Login page
  - `/app/auth/signup/page.tsx` - Registration page

### ✅ 2. PDF Viewer & Management
- **Split-Screen Layout**: PDF viewer on left, chat interface on right
- **PDF Upload**: Support for PDF file uploads with Vercel Blob storage
- **PDF Navigation**: Page turning, zoom controls, and AI-controlled navigation
- **Text Extraction**: Automatic text extraction and chunking for AI context
- **Implementation Files**:
  - `/components/PDFViewer.tsx` - Main PDF viewer component
  - `/components/PDFHighlighter.tsx` - Annotation overlay component
  - `/app/api/upload/route.ts` - PDF upload handler
  - `/lib/pdf-processor.ts` - PDF text extraction and chunking

### ✅ 3. AI Tutor Integration
- **Real-time Chat**: Stream-based chat responses using Vercel AI SDK
- **Context-Aware Responses**: AI uses PDF content for accurate answers
- **Page References**: AI can reference specific pages and content
- **PDF Control**: AI can navigate to relevant pages automatically
- **Highlighting**: AI highlights relevant text passages in the PDF
- **Implementation Files**:
  - `/app/api/chat/route.ts` - Main chat endpoint
  - `/app/chat/[documentId]/page.tsx` - Chat interface
  - `/lib/similarity-search.ts` - Vector similarity search

### ✅ 4. Voice Interaction
- **Speech-to-Text**: Browser Web Speech API for voice input
- **Text-to-Speech**: Speech synthesis for AI responses
- **Voice Mode Toggle**: Seamless switching between text and voice
- **Auto-play Responses**: Automatic TTS for AI responses in voice mode

### ✅ 5. Database & Storage
- **User Data**: Secure storage of user accounts
- **Chat History**: Persistent conversation storage
- **Document Management**: PDF metadata and ownership tracking
- **Vector Embeddings**: pgvector for semantic search
- **Blob Storage**: Vercel Blob for PDF file storage

## Technical Architecture

### Technology Stack
```
Frontend:
├── Next.js 15.5.4 (App Router)
├── React 19.1.0
├── Tailwind CSS 4.0
├── react-pdf 10.1.0
└── pdfjs-dist 4.5.136

Backend:
├── Next.js API Routes
├── Prisma ORM 6.16.3
├── PostgreSQL + pgvector
└── Vercel Blob Storage

AI/ML:
├── OpenAI GPT-4 (chat)
├── text-embedding-ada-002 (embeddings)
├── Vercel AI SDK 4.0
└── Vector similarity search

Authentication:
├── NextAuth.js 4.24.11
├── bcryptjs 3.0.2
└── JWT sessions
```

### Database Schema

```prisma
User
├── id (cuid)
├── email (unique)
├── password (hashed)
├── name (optional)
├── documents (relation)
├── chats (relation)
└── createdAt

Document
├── id (cuid)
├── userId (foreign key)
├── filename
├── url (Blob storage URL)
├── chunks (relation)
├── chats (relation)
├── metadata (JSON)
└── createdAt

Chunk
├── id (cuid)
├── documentId (foreign key)
├── content (text)
├── pageNumber
├── embedding (vector[1536])
├── metadata (JSON)
├── startIndex
├── endIndex
└── createdAt

Chat
├── id (cuid)
├── userId (foreign key)
├── documentId (foreign key)
├── title
├── messages (relation)
├── createdAt
└── updatedAt

Message
├── id (cuid)
├── chatId (foreign key)
├── role (user/assistant)
├── content (text)
├── metadata (JSON)
└── createdAt
```

## Complete Setup Guide

### Prerequisites

1. **System Requirements**:
   - Node.js 18.0 or higher
   - npm 9.0 or higher
   - Git
   - PostgreSQL 14+ with pgvector extension

2. **Required Accounts**:
   - OpenAI API account (for GPT-4 access)
   - Vercel account (for deployment and Blob storage)
   - PostgreSQL database (local or hosted)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/ai-pdf-tutor.git
cd ai-pdf-tutor

# Install dependencies
npm install
```

### Step 2: PostgreSQL Setup

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL (if not installed)
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-14 postgresql-contrib

# Create database
createdb ai_pdf_tutor

# Install pgvector extension
# macOS
brew install pgvector

# Ubuntu/Debian
sudo apt install postgresql-14-pgvector

# Enable pgvector
psql -d ai_pdf_tutor -c "CREATE EXTENSION vector;"

# Run setup script
psql -d ai_pdf_tutor < scripts/setup-pgvector.sql
```

#### Option B: Hosted PostgreSQL
Use a service that supports pgvector:
- **Supabase** (recommended): https://supabase.com
- **Neon**: https://neon.tech
- **Vercel Postgres**: https://vercel.com/storage/postgres

### Step 3: Environment Configuration

1. **Copy the example environment file**:
```bash
cp .env.example .env
```

2. **Configure environment variables**:
```env
# Database URL (adjust based on your setup)
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_pdf_tutor?schema=public"

# NextAuth Configuration
# Generate secret with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI API Key
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-..."

# Vercel Blob Storage Token (see Step 4)
BLOB_READ_WRITE_TOKEN="vercel_blob_..."
```

### Step 4: Vercel Blob Storage Setup

1. **Create Vercel Account**:
   - Go to https://vercel.com/signup
   - Sign up with GitHub/GitLab/Bitbucket or email

2. **Create Blob Store**:
   - Navigate to Dashboard → Storage
   - Click "Create Store"
   - Select "Blob"
   - Choose a name (e.g., "pdf-storage")
   - Select region closest to your users

3. **Get Token for Local Development**:
   - In your Blob store, go to "Quickstart" tab
   - Copy the `BLOB_READ_WRITE_TOKEN`
   - Add to your `.env` file

### Step 5: Database Initialization

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) View database in Prisma Studio
npx prisma studio
```

### Step 6: Run Development Server

```bash
# Start the development server
npm run dev

# Server will be available at http://localhost:3000
```

## Vercel Deployment Guide

### Step 1: Prepare for Deployment

1. **Push to GitHub**:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Deploy to Vercel

1. **Import Project**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select the ai-pdf-tutor repository

2. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: (leave default)
   - Install Command: `npm install`

3. **Environment Variables**:
   Add all production environment variables:
   ```
   DATABASE_URL=your-production-database-url
   NEXTAUTH_SECRET=your-production-secret
   NEXTAUTH_URL=https://your-app.vercel.app
   OPENAI_API_KEY=your-openai-key
   ```
   
   Note: `BLOB_READ_WRITE_TOKEN` will be automatically added when you connect Blob storage

4. **Connect Blob Storage**:
   - In project settings → Storage
   - Click "Connect Store"
   - Select your Blob store or create new one
   - Token will be automatically injected

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

### Step 3: Post-Deployment Setup

1. **Verify Deployment**:
   - Visit your deployed URL
   - Test signup/login
   - Upload a test PDF
   - Verify chat functionality

## Usage Guide

### 1. User Registration
- Navigate to `/auth/signup`
- Enter email and password
- Click "Sign Up"
- Automatically redirected to dashboard

### 2. PDF Upload
- From dashboard, click "Upload PDF"
- Select a PDF file (max 10MB recommended)
- Wait for processing (text extraction)
- Document appears in your library

### 3. Starting a Chat
- Click on a document from dashboard
- Split-screen interface opens
- PDF on left, chat on right
- Start asking questions

### 4. Using Voice Features
- Click microphone icon to enable voice input
- Speak your question
- AI response plays automatically in voice mode
- Click speaker icon to replay responses

### 5. PDF Navigation & Highlights
- AI automatically navigates to relevant pages
- Highlights appear as yellow overlays
- Manual navigation with page controls
- Zoom in/out for better viewing

### Performance Optimization

1. **PDF Processing**:
   - Limit PDF size to 10MB
   - Use compression before upload
   - Cache processed chunks

2. **Database**:
   - Add proper indexes (already in schema)
   - Use connection pooling
   - Regular vacuum/analyze

3. **Frontend**:
   - Lazy load PDF viewer
   - Implement virtual scrolling for long chats
   - Use React.memo for components

## Project Structure

```
ai-pdf-tutor/
├── app/                      # Next.js App Router
│   ├── api/                  # API endpoints
│   │   ├── auth/            # Authentication
│   │   ├── chat/            # Chat AI
│   │   ├── documents/       # Document management
│   │   └── upload/          # File upload
│   ├── auth/                # Auth pages
│   ├── chat/                # Chat interface
│   ├── dashboard/           # User dashboard
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── PDFViewer.tsx       # PDF display
│   └── PDFHighlighter.tsx  # Annotation overlay
├── lib/                     # Utilities
│   ├── pdf-processor.ts    # PDF text extraction
│   ├── similarity-search.ts # Vector search
│   └── prisma.ts           # Database client
├── prisma/                  # Database
│   └── schema.prisma       # Schema definition
├── public/                  # Static assets
├── scripts/                 # Setup scripts
│   └── setup-pgvector.sql  # Database setup
└── package.json            # Dependencies

Key Configuration Files:
- next.config.ts            # Next.js configuration
- tsconfig.json            # TypeScript config
- tailwind.config.ts       # Tailwind CSS
- .env.example             # Environment template
```
