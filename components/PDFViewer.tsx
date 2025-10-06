'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Annotation {
  id: string;
  page: number;
  type: 'highlight' | 'circle' | 'underline';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface PDFViewerProps {
  url: string;
  currentPage: number;
  annotations?: Annotation[];
  onPageChange: (page: number) => void;
  onLoadSuccess?: (numPages: number) => void;
}

export default function PDFViewer({ url, currentPage, annotations = [], onPageChange, onLoadSuccess }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(600);
  const [pageHeight, setPageHeight] = useState<number>(800);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    if (onLoadSuccess) {
      onLoadSuccess(numPages);
    }
  }

  function onPageLoadSuccess(page: any) {
    const viewport = page.getViewport({ scale: 1 });
    setPageHeight(viewport.height * (pageWidth / viewport.width));
  }

  // Filter annotations for current page
  const currentAnnotations = annotations.filter(a => a.page === currentPage);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto bg-gray-50 flex justify-center relative">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-gray-500">Loading PDF...</div>}
        >
          <div className="relative">
            <Page 
              pageNumber={currentPage} 
              width={pageWidth}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              onLoadSuccess={onPageLoadSuccess}
            />
            
            {/* Render annotations overlay */}
            {currentAnnotations.map(annotation => (
              <div
                key={annotation.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${(annotation.x / 100) * pageWidth}px`,
                  top: `${(annotation.y / 100) * pageHeight}px`,
                  width: `${(annotation.width / 100) * pageWidth}px`,
                  height: `${(annotation.height / 100) * pageHeight}px`,
                  backgroundColor: annotation.type === 'highlight' 
                    ? 'rgba(255, 255, 0, 0.3)' 
                    : 'transparent',
                  border: annotation.type === 'circle' 
                    ? '3px solid red' 
                    : annotation.type === 'underline' 
                    ? 'none' 
                    : 'none',
                  borderBottom: annotation.type === 'underline' 
                    ? '3px solid red' 
                    : 'none',
                  borderRadius: annotation.type === 'circle' ? '50%' : '0',
                  zIndex: 10
                }}
                title={annotation.text}
              />
            ))}
          </div>
        </Document>
      </div>
      
      <div className="mt-2 flex items-center justify-center gap-4 bg-white p-2 rounded border">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1 bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-gray-700 font-medium">
          Page {currentPage} of {numPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= numPages}
          className="px-3 py-1 bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}