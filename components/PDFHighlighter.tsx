'use client';

import { useEffect, useRef, useState } from 'react';

interface TextMatch {
  text: string;
  pageIndex: number;
  rects: DOMRect[];
}

interface PDFHighlighterProps {
  searchTexts: string[];
  currentPage: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function PDFHighlighter({ searchTexts, currentPage, containerRef }: PDFHighlighterProps) {
  const [highlights, setHighlights] = useState<TextMatch[]>([]);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);

  // Clear highlights when searchTexts becomes empty
  useEffect(() => {
    if (searchTexts.length === 0) {
      setHighlights([]);
    }
  }, [searchTexts]);

  useEffect(() => {
    retryCountRef.current = 0;
    
    const findTextInPDF = () => {
      if (!containerRef.current) {
        return;
      }

      const textLayer = containerRef.current.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) {
        // Retry up to 10 times with increasing delays
        if (retryCountRef.current < 10) {
          retryCountRef.current++;
          setTimeout(findTextInPDF, 100 * retryCountRef.current);
        }
        return;
      }

      const newHighlights: TextMatch[] = [];
      const textSpans = textLayer.querySelectorAll('span');
      
      if (textSpans.length === 0) {
        return;
      }
      
      searchTexts.forEach(searchText => {
        if (!searchText || searchText.trim() === '') return;
        
        // Try different search strategies
        const searchVariants = [
          searchText.trim(), // Original
          searchText.toLowerCase().trim(), // Lowercase
          searchText.replace(/['']/g, "'").trim(), // Normalize quotes
          searchText.replace(/\s+/g, ' ').trim(), // Normalize whitespace
        ];
        
        // Build full text and track span positions with spaces between spans
        let fullText = '';
        const spanInfos: { span: Element; start: number; end: number; text: string }[] = [];
        
        textSpans.forEach((span, index) => {
          const start = fullText.length;
          const text = span.textContent || '';
          fullText += text;
          // Add space between spans to handle word boundaries
          if (index < textSpans.length - 1) {
            fullText += ' ';
          }
          const end = fullText.length;
          spanInfos.push({ span, start, end, text });
        });
        
        // Try each search variant
        let foundMatch = false;
        for (const searchVariant of searchVariants) {
          if (foundMatch) break;
          
          // Search for the text (case insensitive)
          const fullTextLower = fullText.toLowerCase();
          const searchLower = searchVariant.toLowerCase();
          
          // Try to find partial matches if full text not found
          let searchIndex = fullTextLower.indexOf(searchLower);
          
          // If not found, try searching for first few words
          if (searchIndex === -1 && searchLower.length > 20) {
            const words = searchLower.split(' ');
            const partialSearch = words.slice(0, Math.min(5, words.length)).join(' ');
            searchIndex = fullTextLower.indexOf(partialSearch);
          }
          
          if (searchIndex !== -1) {
            foundMatch = true;
            const matchEnd = searchIndex + searchLower.length;
            const matchRects: DOMRect[] = [];
            
            // Find all spans that contain parts of the match
            spanInfos.forEach(({ span, start, end }) => {
              // Check if this span overlaps with our match
              if (end > searchIndex && start < matchEnd) {
                const rect = span.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  matchRects.push(rect);
                }
              }
            });
            
            if (matchRects.length > 0) {
              newHighlights.push({
                text: searchText,
                pageIndex: currentPage - 1,
                rects: matchRects
              });
            }
          }
        }
      });
      
      setHighlights(newHighlights);
    };

    // Run search after a delay to ensure PDF is rendered
    const timer = setTimeout(findTextInPDF, 500);
    return () => clearTimeout(timer);
  }, [searchTexts, currentPage, containerRef]);

  // Render highlights
  useEffect(() => {
    if (!highlightLayerRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Clear previous highlights
    highlightLayerRef.current.innerHTML = '';
    
    highlights.forEach(match => {
      match.rects.forEach((rect) => {
        const highlight = document.createElement('div');
        highlight.className = 'pdf-highlight';
        highlight.style.position = 'absolute';
        
        // Calculate position relative to the container
        const left = rect.left - containerRect.left;
        const top = rect.top - containerRect.top;
        
        highlight.style.left = `${left}px`;
        highlight.style.top = `${top}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
        highlight.style.backgroundColor = 'rgba(255, 235, 59, 0.5)';
        highlight.style.mixBlendMode = 'multiply';
        highlight.style.pointerEvents = 'none';
        highlight.style.borderRadius = '2px';
        highlight.style.transition = 'opacity 0.3s ease';
        highlight.title = match.text;
        
        highlightLayerRef.current?.appendChild(highlight);
      });
    });
  }, [highlights, containerRef]);

  return (
    <div
      ref={highlightLayerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    />
  );
}