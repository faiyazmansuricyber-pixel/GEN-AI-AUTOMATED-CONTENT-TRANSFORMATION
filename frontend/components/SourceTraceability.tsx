"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenCheck, Layers, Search, ShieldCheck, X } from 'lucide-react';

export interface SourceChunk {
  id: string;
  text: string;
}

interface SourceClaim {
  claim: string;
  source_chunk_ids?: string[];
}

interface SourceAnalysis {
  key_claims?: SourceClaim[];
  entities?: string[];
}

interface SourceTraceabilityProps {
  chunks: SourceChunk[];
  analysis?: SourceAnalysis | null;
  highlightedChunkId: string | null;
  glowingChunkId?: string | null;
  onClearHighlight: () => void;
  onChunkClick: (chunkId: string, sourceElement?: HTMLElement) => void;
  rawText?: string;
}

export default function SourceTraceability({
  chunks,
  analysis,
  highlightedChunkId,
  glowingChunkId,
  onClearHighlight,
  onChunkClick
}: SourceTraceabilityProps) {
  const [claimSearch, setClaimSearch] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [activeClaimIndex, setActiveClaimIndex] = useState<number | null>(null);
  const [activeChunkId, setActiveChunkId] = useState<string | null>(highlightedChunkId);
  const chunkRefs = useRef<Record<string, HTMLElement | null>>({});
  const claims = analysis?.key_claims || [];
  const entities = analysis?.entities || [];
  const chunkIds = useMemo(() => new Set(chunks.map((chunk) => chunk.id)), [chunks]);

  useEffect(() => {
    setActiveChunkId(highlightedChunkId);
  }, [highlightedChunkId]);

  useEffect(() => {
    if (!activeChunkId) return;
    chunkRefs.current[activeChunkId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }, [activeChunkId]);

  const filteredClaims = claims
    .map((claim, index) => ({ claim, index }))
    .filter(({ claim }) => !claimSearch.trim() || claim.claim.toLowerCase().includes(claimSearch.trim().toLowerCase()));
  const filteredChunks = chunks.filter((chunk) => {
    const query = sourceSearch.trim().toLowerCase();
    return !query || chunk.id.toLowerCase().includes(query) || chunk.text.toLowerCase().includes(query);
  });
  const activeClaim = activeClaimIndex === null ? null : claims[activeClaimIndex] || null;
  const activeChunk = chunks.find((chunk) => chunk.id === activeChunkId) || null;
  const sourcedClaimsCount = claims.filter((claim) =>
    (claim.source_chunk_ids || []).some((id) => chunkIds.has(id))
  ).length;

  const selectClaim = (claim: SourceClaim, index: number, element: HTMLElement) => {
    setActiveClaimIndex(index);
    const sourceId = (claim.source_chunk_ids || []).find((id) => chunkIds.has(id));
    if (!sourceId) {
      setActiveChunkId(null);
      return;
    }
    setActiveChunkId(sourceId);
    onChunkClick(sourceId, element);
  };

  const selectEntity = (entity: string, element: HTMLElement) => {
    const matchingChunk = chunks.find((chunk) => chunk.text.toLowerCase().includes(entity.toLowerCase()));
    if (!matchingChunk) return;
    setSourceSearch(entity);
    setActiveChunkId(matchingChunk.id);
    onChunkClick(matchingChunk.id, element);
  };

  if (!chunks.length) {
    return (
      <section className="mb-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
        <Layers className="mx-auto mb-3 h-6 w-6 text-slate-400" />
        <h3 className="text-sm font-bold text-slate-800">Evidence appears after source ingestion</h3>
        <p className="mt-1 text-xs text-slate-500">Source chunks and claim provenance will be available here.</p>
      </section>
    );
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-[linear-gradient(110deg,#f3f0ff,#f7fbff_58%,#fff5ee)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-violet-200 bg-white p-2 text-violet-700 shadow-sm">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-slate-900">Evidence Explorer</h3>
            <p className="text-xs text-slate-600">Claims link to source chunks; provenance is chunk-level, not sentence-level.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="rounded-full border border-violet-200 bg-white/80 px-2.5 py-1 text-violet-800">
            {sourcedClaimsCount} / {claims.length} claims linked
          </span>
          {highlightedChunkId && (
            <button
              type="button"
              onClick={() => {
                setActiveChunkId(null);
                onClearHighlight();
              }}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-800 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Focus: {highlightedChunkId}<X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="grid min-h-[420px] grid-cols-1 divide-y divide-slate-200 lg:grid-cols-[minmax(220px,0.85fr)_minmax(320px,1.4fr)_minmax(190px,0.75fr)] lg:divide-x lg:divide-y-0">
        <div className="min-w-0 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Extracted claims</h4>
            <span className="text-[10px] text-slate-500">{filteredClaims.length} shown</span>
          </div>
          <label className="relative mb-3 block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={claimSearch}
              onChange={(event) => setClaimSearch(event.target.value)}
              placeholder="Search claims"
              aria-label="Search extracted claims"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-xs text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {!claims.length && (
              <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                Analysis has not returned extracted claims for this source.
              </p>
            )}
            {claims.length > 0 && !filteredClaims.length && (
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">No claims match this search.</p>
            )}
            {filteredClaims.map(({ claim, index }) => {
              const validIds = (claim.source_chunk_ids || []).filter((id) => chunkIds.has(id));
              const selected = index === activeClaimIndex;
              return (
                <button
                  key={`${index}-${claim.claim}`}
                  type="button"
                  onClick={(event) => selectClaim(claim, index, event.currentTarget)}
                  aria-pressed={selected}
                  className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    selected
                      ? 'border-violet-300 bg-violet-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50'
                  }`}
                >
                  <span className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Claim {index + 1}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                      validIds.length ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                    }`}>
                      {validIds.length ? `${validIds.length} source${validIds.length === 1 ? '' : 's'}` : 'No source link'}
                    </span>
                  </span>
                  <span className="block text-xs leading-relaxed text-slate-800">{claim.claim}</span>
                  {validIds.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1">
                      {validIds.map((id) => (
                        <span key={id} className="rounded bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-600 ring-1 ring-slate-200">{id}</span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Source passages</h4>
            <label className="relative block w-44 max-w-[55%]">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={sourceSearch}
                onChange={(event) => setSourceSearch(event.target.value)}
                placeholder="Find in source"
                aria-label="Search source chunks"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-[11px] text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>
          {activeClaim && (
            <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Selected claim</span>
              <p className="mt-1 text-xs leading-relaxed text-slate-800">{activeClaim.claim}</p>
              {!((activeClaim.source_chunk_ids || []).some((id) => chunkIds.has(id))) && (
                <p className="mt-2 text-[11px] font-medium text-amber-800">The analysis did not provide a matching source chunk for this claim.</p>
              )}
            </div>
          )}
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {filteredChunks.map((chunk) => {
              const selected = activeChunkId === chunk.id;
              return (
                <article
                  key={chunk.id}
                  ref={(element) => { chunkRefs.current[chunk.id] = element; }}
                  data-chunk-id={chunk.id}
                  className={`${glowingChunkId === chunk.id ? 'evidence-glow ' : ''}rounded-xl border p-3 transition ${
                    selected ? 'border-sky-300 bg-sky-50/80 shadow-sm' : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        setActiveChunkId(chunk.id);
                        onChunkClick(chunk.id, event.currentTarget);
                      }}
                      className="rounded-md bg-white px-2 py-1 font-mono text-[10px] font-bold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                      {chunk.id}
                    </button>
                    <span className="text-[10px] text-slate-500">{chunk.text.trim().split(/\s+/).length} words</span>
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700" dir="auto">
                    {chunk.text}
                  </p>
                </article>
              );
            })}
            {!filteredChunks.length && (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                No source chunks match this search.
              </p>
            )}
          </div>
        </div>

        <aside className="min-w-0 bg-slate-50/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Extracted entities</h4>
          </div>
          <p className="mb-3 text-[10px] leading-relaxed text-slate-500">
            Entity-to-claim relationships are not returned by the current API. Select an entity to find literal mentions in source chunks.
          </p>
          <div className="flex max-h-[360px] flex-wrap content-start gap-1.5 overflow-y-auto">
            {entities.map((entity, index) => {
              const hasSourceMention = chunks.some((chunk) => chunk.text.toLowerCase().includes(entity.toLowerCase()));
              return (
                <button
                  key={`${entity}-${index}`}
                  type="button"
                  disabled={!hasSourceMention}
                  onClick={(event) => selectEntity(entity, event.currentTarget)}
                  title={hasSourceMention ? `Find "${entity}" in source chunks` : 'No literal source-chunk match'}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    hasSourceMention
                      ? 'border-emerald-200 bg-white text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50'
                      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  }`}
                >
                  {entity}
                </button>
              );
            })}
            {!entities.length && (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">
                No entities were returned for this submission.
              </p>
            )}
          </div>
          {activeChunk && (
            <p className="mt-4 border-t border-slate-200 pt-3 text-[10px] text-slate-500">
              Viewing source chunk <span className="font-mono font-bold text-slate-700">{activeChunk.id}</span>
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
