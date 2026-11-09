"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { History, X, Clock, ArrowRight, Loader2, Database, Search, RotateCw } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export interface HistoryItem {
  id: string;
  created_at: string;
  preview: string;
  detected_domain: string;
  output_types: string[];
}

interface SubmissionsHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSubmission: (submissionId: string) => void;
}

export default function SubmissionsHistory({
  isOpen,
  onClose,
  onSelectSubmission
}: SubmissionsHistoryProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/submissions`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load past submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSubmissions();
    }
  }, [isOpen, fetchSubmissions]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const query = searchTerm.trim().toLowerCase();
  const filteredItems = items.filter((item) =>
    !query || [
      item.id,
      item.preview,
      item.detected_domain,
      ...(item.output_types || [])
    ].some((value) => value?.toLowerCase().includes(query))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[2px] animate-fadeIn"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="history-drawer flex h-full w-full max-w-md flex-col justify-between overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
      >
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h3 id="history-title" className="text-base font-extrabold text-slate-900">Past Submissions</h3>
                <p className="text-[11px] text-slate-500">Stored transformation history</p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close past submissions"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <label className="relative mb-4 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search past submissions"
              aria-label="Search past submissions"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500" role="status" aria-live="polite">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span>Loading saved submissions…</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchSubmissions}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-bold text-rose-800 transition hover:bg-rose-100"
              >
                <RotateCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && items.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-xs">
              No historical submissions stored yet.
            </div>
          )}

          {!loading && !error && items.length > 0 && filteredItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-xs text-slate-500">
              <p className="font-semibold text-slate-700">No submissions match “{searchTerm}”</p>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mt-2 font-semibold text-indigo-700 hover:text-indigo-900"
              >
                Clear search
              </button>
            </div>
          )}

          {/* Submissions List */}
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSubmission(item.id);
                  onClose();
                }}
                className="group w-full rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-left shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md focus-visible:outline-none"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <span className="flex items-center gap-1 font-mono font-medium text-slate-600">
                    <Clock className="h-3 w-3 text-indigo-600" />
                    <time dateTime={item.created_at}>
                      {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200/70">
                    {item.detected_domain}
                  </span>
                </div>

                <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed mb-3">
                  {item.preview || 'No raw text snippet.'}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2.5 border-t border-slate-200/80">
                  <div className="flex flex-wrap gap-1">
                    {item.output_types?.slice(0, 3).map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-white text-indigo-800 font-mono font-semibold border border-slate-200">
                        {t.replace('_', ' ')}
                      </span>
                    ))}
                    {item.output_types?.length > 3 && (
                      <span className="text-slate-400 font-medium self-center">+{item.output_types.length - 3}</span>
                    )}
                  </div>

                  <span className="text-indigo-600 group-hover:translate-x-1 transition flex items-center gap-1 font-bold text-xs">
                    Load <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 font-mono">
          <Database className="h-3.5 w-3.5 text-slate-400" />
          <span>Persisted in SQLite database (`sih_platform.db`)</span>
        </div>
      </div>
    </div>
  );
}
