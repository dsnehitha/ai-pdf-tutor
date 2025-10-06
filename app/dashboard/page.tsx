'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, MessageSquare, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface Document {
  id: string;
  filename: string;
  url: string;
  createdAt: string;
  _count?: {
    chats: number;
  };
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchDocuments();
    }
  }, [status, router]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/chat/${data.id}`);
      } else {
        const error = await res.text();
        alert(`Upload failed: ${error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (status === 'loading') {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">AI PDF Tutor Dashboard</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {session?.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <label className="block mb-6">
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer transition-colors">
                {uploading ? (
                  <div className="text-gray-600">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2">Processing PDF...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Click to upload a PDF document</p>
                    <p className="text-xs text-gray-500">PDF files only, max 10MB</p>
                  </>
                )}
              </div>
            </label>

            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Documents</h2>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload a PDF to start learning with AI
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/chat/${doc.id}`)}
                    >
                      <FileText className="h-8 w-8 text-blue-500 mb-2" />
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {doc.filename}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                      {doc._count?.chats !== undefined && (
                        <div className="flex items-center mt-2 text-xs text-gray-600">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {doc._count.chats} chat{doc._count.chats !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}