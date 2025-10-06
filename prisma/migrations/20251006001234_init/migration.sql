-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "embedding" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Chat_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Chunk_documentId_idx" ON "Chunk"("documentId");

-- CreateIndex
CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");

-- CreateIndex
CREATE INDEX "Chat_documentId_idx" ON "Chat"("documentId");

-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");
