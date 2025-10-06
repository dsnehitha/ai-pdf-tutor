'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import PDFHighlighter from './PDFHighlighter';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Annotation {
  id: string;
  page: number;
  type: 'highlight' | 'circle' | 'underline';
  text: string;
  x: number; // Percentage of page width
  y: number; // Percentage of page height
  width: number; // Percentage of page width
  height: number; // Percentage of page height
  color: string;
  metadata?: any; // Original chunk metadata
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
  const [scale, setScale] = useState<number>(1);
  const pageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    if (onLoadSuccess) {
      onLoadSuccess(numPages);
    }
  }

  function onPageLoadSuccess(page: any) {
    const viewport = page.getViewport({ scale: 1 });
    const calculatedScale = pageWidth / viewport.width;
    setScale(calculatedScale);
    setPageHeight(viewport.height * calculatedScale);
  }

  // Filter annotations for current page
  const currentAnnotations = annotations.filter(a => a.page === currentPage);
  
  // Extract texts to highlight from annotations
  const highlightTexts = currentAnnotations
    .filter(a => a.type === 'highlight')
    .map(a => a.text);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto bg-gray-50 flex justify-center" ref={containerRef}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-gray-500">Loading PDF...</div>}
        >
          <div className="relative inline-block" ref={pageRef}>
            <Page 
              pageNumber={currentPage} 
              width={pageWidth}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              onLoadSuccess={onPageLoadSuccess}
            />
            
            {/* Text-based highlighting - render after page loads */}
            {highlightTexts.length > 0 && (
              <PDFHighlighter
                searchTexts={highlightTexts}
                currentPage={currentPage}
                containerRef={pageRef}
              />
            )}
            
            {/* Render other annotations (circles, underlines) */}
            {currentAnnotations
              .filter(a => a.type !== 'highlight')
              .map(annotation => {
                // Use percentages for responsive positioning
                const left = annotation.x;
                const top = annotation.y;
                const width = annotation.width;
                const height = annotation.height;
                
                return (
                  <div
                    key={annotation.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      backgroundColor: 'transparent',
                      border: annotation.type === 'circle' 
                        ? '3px solid #FF5722' 
                        : 'none',
                      borderBottom: annotation.type === 'underline' 
                        ? '3px solid #FF5722' 
                        : 'none',
                      borderRadius: annotation.type === 'circle' ? '50%' : '2px',
                      zIndex: 10,
                      transition: 'all 0.3s ease'
                    }}
                    title={annotation.text}
                  />
                );
              })}
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