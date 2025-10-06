'use client';

import { useChat } from 'ai/react';
import { use, useState, useEffect, useRef, Suspense } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useSession } from 'next-auth/react';
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
  const [pdfUrl, setPdfUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chunkMetadata, setChunkMetadata] = useState<any[]>([]);
  const [lastQueryChunks, setLastQueryChunks] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const lastMessageCountRef = useRef(0);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, setMessages } = useChat({
    api: '/api/chat',
    body: { documentId, chatId },
    initialMessages: initialMessages,
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: async (message) => {
      // After message is complete, fetch the metadata for the last query
      try {
        const response = await fetch(`/api/documents/${documentId}/chunks?query=${encodeURIComponent(input)}`);
        if (response.ok) {
          const data = await response.json();
          setLastQueryChunks(data.chunks || []);
        }
      } catch (error) {
        console.error('Failed to fetch chunk metadata:', error);
      }

      // Auto-play response in voice mode
      if (voiceMode && message.role === 'assistant') {
        setTimeout(() => {
          speakMessage(message.id, message.content, true);
        }, 300);
      }
    }
  });

  // Custom handler to clear highlights when user submits a new question
  const handleFormSubmit = (e: React.FormEvent) => {
    setAnnotations([]);
    
    if (isSpeaking) {
      synthRef.current?.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
    
    handleSubmit(e);
  };

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
          setCurrentPage(pageNum);
        }
      }
      
      // Extract highlights - simplified to just extract text
      const highlightRegex = /\[HIGHLIGHT:\s*page\s*(\d+),\s*"([^"]+)"\]/g;
      const newAnnotations: any[] = [];
      let match;
      
      while ((match = highlightRegex.exec(content)) !== null) {
        const page = parseInt(match[1]);
        const highlightText = match[2];
        
        // Create highlight annotation with just the text
        // The PDFHighlighter component will find the actual position
        newAnnotations.push({
          id: `anno-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          page,
          type: 'highlight',
          text: highlightText, // Keep original text for accurate searching
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          color: 'yellow',
          messageId: latestAssistantMessage.id // Track which message created this highlight
        });
      }
      
      // Always clear all previous highlights and set only the new ones
      setAnnotations(newAnnotations);
    } else {
      // If there's no assistant message or content, clear all annotations
      setAnnotations([]);
    }
  }, [messages]); // Remove other dependencies to ensure it only runs when messages change

  useEffect(() => {
    const loadDocumentAndChat = async () => {
      try {
        setIsLoadingHistory(true);
        
        // Fetch document details and set proper PDF URL
        const docResponse = await fetch(`/api/documents/${documentId}`);
        const docData = await docResponse.json();
        
        if (docData.url) {
          setPdfUrl(docData.url);
          if (docData.metadata) {
            const metadata = JSON.parse(docData.metadata);
            setTotalPages(metadata.pageCount || 0);
          }
        }
        
        // Load or create chat
        if (docData.chatId) {
          setChatId(docData.chatId);
          
          // Fetch chat history
          const chatResponse = await fetch(`/api/chat/${docData.chatId}`);
          if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            if (chatData.messages && chatData.messages.length > 0) {
              setInitialMessages(chatData.messages);
              // Also set messages directly in useChat
              setMessages(chatData.messages);
            }
          }
        }
      } catch (err) {
        console.error('Error loading document:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadDocumentAndChat();
  }, [documentId, setMessages]);

  // Initialize speech recognition (STT)
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

  // Initialize speech synthesis (TTS)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      // Load voices
      const loadVoices = () => {
        if (synthRef.current) {
          synthRef.current.getVoices();
        }
      };
      
      loadVoices();
      if (synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = loadVoices;
      }
    }

    // Cleanup on unmount
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Stop speaking when user starts typing or listening
  useEffect(() => {
    if (input && isSpeaking) {
      synthRef.current?.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  }, [input, isSpeaking]);

  useEffect(() => {
    if (isListening && isSpeaking) {
      synthRef.current?.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  }, [isListening, isSpeaking]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoiceMode(false);
    } else {
      // Stop any speaking when starting to listen
      if (isSpeaking) {
        synthRef.current?.cancel();
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      }
      recognitionRef.current?.start();
      setIsListening(true);
      setVoiceMode(true);
    }
  };

  const speakMessage = (messageId: string, text: string, autoMode = false) => {
    if (!synthRef.current) return;

    // If currently speaking this message, stop it
    if (isSpeaking && speakingMessageId === messageId) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }

    // Stop any current speech
    synthRef.current.cancel();

    // Clean the text (remove metadata tags)
    const cleanText = text
      .replace(/\[PAGE:\s*\d+\]/g, '')
      .replace(/\[HIGHLIGHT:[^\]]+\]/g, '')
      .trim();

    if (!cleanText) return;

    // Get best available voice (prefer natural-sounding ones)
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && (
        v.name.includes('Natural') || 
        v.name.includes('Premium') ||
        v.name.includes('Enhanced') ||
        v.name.includes('Google')
      )
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    // Create and configure speech
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      
      // In voice mode, automatically start listening again after AI response
      if (autoMode && voiceMode && !isListening) {
        setTimeout(() => {
          recognitionRef.current?.start();
          setIsListening(true);
        }, 500);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    synthRef.current.speak(utterance);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          {/* Show loading indicator for chat history */}
          {isLoadingHistory && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading chat history...</div>
            </div>
          )}
          
          {!isLoadingHistory && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Start a conversation by asking a question about the PDF</div>
            </div>
          )}
          
          {messages.map(m => (
            <div
              key={m.id}
              className={`${
                m.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              {/* Only render if there's content to show */}
              {m.content && (
                <div className={`${m.role === 'user' ? 'flex justify-end' : 'flex justify-start'} items-start gap-2`}>
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
                  
                  {/* Text-to-Speech button for assistant messages */}
                  {m.role === 'assistant' && (
                    <button
                      onClick={() => speakMessage(m.id, m.content)}
                      className={`p-2 rounded-lg transition-colors ${
                        speakingMessageId === m.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                      title={speakingMessageId === m.id ? 'Stop speaking' : 'Read aloud'}
                    >
                      {speakingMessageId === m.id ? (
                        <VolumeX size={18} />
                      ) : (
                        <Volume2 size={18} />
                      )}
                    </button>
                  )}
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
          
          {/* Invisible div for auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleFormSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder={voiceMode ? "Voice mode active - speak or type..." : "Ask about the PDF..."}
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