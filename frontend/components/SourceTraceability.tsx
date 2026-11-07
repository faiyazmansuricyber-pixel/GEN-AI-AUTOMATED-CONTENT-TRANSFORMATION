"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Layers, X, Search } from 'lucide-react';

export interface SourceChunk {
  id: string;
  text: string;
}

interface SourceTraceabilityProps {
  chunks: SourceChunk[];
  highlightedChunkId: string | null;
  onClearHighlight: () => void;
  rawText?: string;
}

export default function SourceTraceability({
  chunks,
  highlightedChunkId,
  onClearHighlight
}: SourceTraceabilityProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const chunkRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (highlightedChunkId && chunkRefs.current[highlightedChunkId]) {
      chunkRefs.current[highlightedChunkId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [highlightedChunkId]);

  if (!chunks || chunks.length === 0) return null;

  // Filter chunks based on search term
  const filteredChunks = chunks.filter((chunk) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      chunk.id.toLowerCase().includes(query) ||
      chunk.text.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full bg-white rounded-2xl p-6 lg:p-7 shadow-lg border border-slate-200/90 mb-8 relative overflow-hidden animate-fade-in-up">
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600" />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-100/70 text-cyan-700 border border-cyan-200 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Source Chunk Traceability & Audit Panel</span>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {filteredChunks.length} of {chunks.length} chunks
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Source text segmentation for claim provenance, verification, and auditability
            </p>
          </div>
        </div>

        {/* Right Header Controls: Search Filter & Highlight Badge */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search chunk text or ID..."
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-800 placeholder-slate-400 shadow-2xs transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Focused Highlight Badge */}
          {highlightedChunkId && (
            <div className="flex items-center gap-2 bg-cyan-50 px-3.5 py-1.5 rounded-xl border border-cyan-200 text-xs shadow-xs animate-fade-in-up">
              <span className="text-cyan-900 font-medium">
                Focused Chunk: <strong className="font-mono text-cyan-700 font-bold">{highlightedChunkId}</strong>
              </span>
              <button 
                onClick={onClearHighlight} 
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-cyan-100 rounded-lg transition cursor-pointer"
                title="Clear highlight"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Chunks or No Matches State */}
      {filteredChunks.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">No matching chunks found for &ldquo;{searchTerm}&rdquo;</p>
          <p className="text-[11px] text-slate-400">Try searching for a different keyword or clear the search filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[440px] overflow-y-auto pr-2">
          {filteredChunks.map((chunk) => {
            const isHighlighted = highlightedChunkId === chunk.id;
            const wordCount = chunk.text.trim() ? chunk.text.trim().split(/\s+/).length : 0;
            return (
              <div
                key={chunk.id}
                ref={(el) => { chunkRefs.current[chunk.id] = el; }}
                className={`p-4 rounded-xl border text-xs chunk-card-transition relative ${
                  isHighlighted
                    ? 'chunk-highlighted border-cyan-500 bg-cyan-50/80 text-slate-900 shadow-md ring-2 ring-cyan-200 scale-[1.01]'
                    : 'bg-slate-50/60 border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-white shadow-2xs interactive-hover'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                    isHighlighted 
                      ? 'bg-cyan-600 text-white shadow-xs' 
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                    {chunk.id}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {wordCount} words
                  </span>
                </div>
                <p className="leading-relaxed font-sans text-slate-800 line-clamp-6">{chunk.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
