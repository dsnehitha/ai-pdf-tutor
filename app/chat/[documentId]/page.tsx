'use client';

import { useChat } from 'ai/react';
import { use, useState, useEffect, useRef, Suspense } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(() => import('@/components/PDFViewer'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="text-gray-500">Loading PDF viewer...</div></div>
});

export default function ChatPage({ 
  params 
}: { 
  params: Promise<{ documentId: string }> 
}) {
  const { documentId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: '/api/chat',
    body: { documentId, chatId },
    initialMessages: [],
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  // Process messages to extract metadata and control PDF viewer
  useEffect(() => {
    const latestAssistantMessage = messages
      .filter(m => m.role === 'assistant')
      .pop();
    
    if (latestAssistantMessage?.content) {
      // Parse metadata from the message
      const content = latestAssistantMessage.content;
      
      // Extract page navigation
      const pageMatch = content.match(/\[PAGE:\s*(\d+)\]/);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1]);
        if (pageNum !== currentPage && pageNum > 0) {
          console.log('Navigating to page', pageNum);
          setCurrentPage(pageNum);
        }
      }
      
      // Extract highlights
      const highlightRegex = /\[HIGHLIGHT:\s*page\s*(\d+),\s*"([^"]+)"\]/g;
      const newAnnotations: any[] = [];
      let match;
      
      while ((match = highlightRegex.exec(content)) !== null) {
        const page = parseInt(match[1]);
        const text = match[2];
        
        newAnnotations.push({
          id: `anno-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          page,
          type: 'highlight',
          text,
          x: 10,
          y: 20,
          width: 80,
          height: 15,
          color: 'yellow'
        });
      }
      
      if (newAnnotations.length > 0) {
        console.log('Adding annotations:', newAnnotations);
        setAnnotations(prev => [...prev, ...newAnnotations]);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    // Fetch document details and set proper PDF URL
    fetch(`/api/documents/${documentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          setPdfUrl(data.url);
          if (data.metadata) {
            const metadata = JSON.parse(data.metadata);
            setTotalPages(metadata.pageCount || 0);
          }
        }
        // Load or create chat
        if (data.chatId) {
          setChatId(data.chatId);
        }
      })
      .catch(err => console.error('Error loading document:', err));
  }, [documentId, session, router]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [setInput]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex h-screen">
      {/* PDF Viewer */}
      <div className="w-1/2 bg-gray-100 p-4 relative">
        {pdfUrl ? (
          <PDFViewer
            url={pdfUrl}
            currentPage={currentPage}
            annotations={annotations}
            onPageChange={handlePageChange}
            onLoadSuccess={setTotalPages}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading PDF...</div>
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <div className="w-1/2 flex flex-col bg-white">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold text-gray-800">AI Tutor Chat</h2>
        </div>
        
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={`${
                m.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              {/* Only render if there's content to show */}
              {m.content && (
                <div
                  className={`inline-block p-3 rounded-lg max-w-[80%] ${
                    m.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {/* Remove metadata tags from displayed content */}
                  {m.role === 'assistant' 
                    ? m.content.replace(/\[PAGE:\s*\d+\]/g, '').replace(/\[HIGHLIGHT:[^\]]+\]/g, '').trim()
                    : m.content}
                </div>
              )}
            </div>
          ))}
          
          {/* Show loading indicator */}
          {isLoading && (
            <div className="text-left">
              <div className="inline-block p-3 rounded-lg bg-gray-200 text-gray-800">
                <span className="animate-pulse">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about the PDF..."
              className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={toggleListening}
              className={`px-4 py-2 rounded-lg ${
                isListening ? 'bg-red-500' : 'bg-gray-500'
              } text-white`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}