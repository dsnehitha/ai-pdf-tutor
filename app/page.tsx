import Link from 'next/link';
import { BookOpen, MessageSquare, Mic, FileText, Highlighter, Navigation } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-500 p-4 rounded-full">
              <BookOpen className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI PDF Tutor
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your intelligent study companion for understanding PDF documents
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth/signin"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-blue-600"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-16">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="bg-blue-100 p-3 rounded-lg w-fit mb-4">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Interactive Chat</h3>
            <p className="text-gray-600">
              Ask questions about your PDF and get instant, context-aware responses from AI
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="bg-green-100 p-3 rounded-lg w-fit mb-4">
              <Mic className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Voice Interaction</h3>
            <p className="text-gray-600">
              Speak your questions and hear responses with voice input and output support
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="bg-purple-100 p-3 rounded-lg w-fit mb-4">
              <Highlighter className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Annotations</h3>
            <p className="text-gray-600">
              AI highlights and annotates important sections in your PDF automatically
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="bg-orange-100 p-3 rounded-lg w-fit mb-4">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">PDF Management</h3>
            <p className="text-gray-600">
              Upload, organize, and access all your study documents in one place
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="bg-red-100 p-3 rounded-lg w-fit mb-4">
              <Navigation className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Navigation</h3>
            <p className="text-gray-600">
              AI navigates to relevant pages as you discuss different topics
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="bg-indigo-100 p-3 rounded-lg w-fit mb-4">
              <BookOpen className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Study History</h3>
            <p className="text-gray-600">
              All your chats and annotations are saved for future reference
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to enhance your learning?</h2>
          <p className="text-gray-600 mb-6">
            Join students who are already studying smarter with AI assistance
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Learning Now
          </Link>
        </div>
      </div>
    </div>
  );
}