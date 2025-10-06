# AI PDF Tutor

An interactive AI tutor that helps students understand PDF documents through a split-screen interface with real-time chat, voice interaction, and PDF annotation capabilities.

![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.16.3-purple)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-green)

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/your-username/ai-pdf-tutor.git
cd ai-pdf-tutor

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Setup database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

For detailed setup guide, deployment, and documentation, see [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)

## ✨ Features

### Core Functionality
- 🔐 **Secure Authentication** - Email/password with JWT sessions
- 📄 **PDF Management** - Upload, store, and organize documents
- 💬 **AI Chat** - Context-aware responses using GPT-4
- 🎯 **Smart Annotations** - AI highlights relevant PDF sections
- 🎤 **Voice Interaction** - Speech-to-text and text-to-speech
- 📊 **Chat History** - Persistent conversation storage

### Technical Highlights
- Split-screen interface with responsive design
- Real-time streaming responses
- Vector similarity search with pgvector
- Automatic PDF text extraction and chunking
- Page navigation controlled by AI
- Vercel Blob storage for PDFs

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS |
| **Backend** | Next.js API Routes, Prisma ORM |
| **Database** | PostgreSQL with pgvector |
| **AI/ML** | OpenAI GPT-4, Embeddings API |
| **Storage** | Vercel Blob |
| **Auth** | NextAuth.js |

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL with pgvector
- OpenAI API key
- Vercel account (for Blob storage)

## 🔧 Environment Variables

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
BLOB_READ_WRITE_TOKEN="vercel_blob_..."
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Connect Blob storage
5. Deploy

See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for detailed steps.

### Database Options

- **Local**: PostgreSQL with pgvector extension
- **Hosted**: Supabase, Neon, or Vercel Postgres

## 📁 Project Structure

```
├── app/           # Next.js App Router
├── components/    # React components
├── lib/          # Utilities & services
├── prisma/       # Database schema
├── public/       # Static assets
└── scripts/      # Setup scripts
```

## 🔐 Security

- Password hashing with bcrypt
- JWT session management
- User data isolation
- Input validation with Zod
- File type validation

## 📝 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | User registration |
| `/api/auth/[...nextauth]` | * | Auth handlers |
| `/api/documents` | GET | List documents |
| `/api/upload` | POST | Upload PDF |
| `/api/chat` | POST | Send message |
