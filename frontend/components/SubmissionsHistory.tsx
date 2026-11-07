"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { History, X, Clock, ArrowRight, Loader2, Database } from 'lucide-react';

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

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/submissions");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full p-6 overflow-y-auto flex flex-col justify-between shadow-2xl">
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Past Submissions</h3>
                <p className="text-[11px] text-slate-500">Stored transformation history</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16 text-slate-500 text-xs gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span>Fetching history from SQLite...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-4">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && items.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-xs">
              No historical submissions stored yet.
            </div>
          )}

          {/* Submissions List */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectSubmission(item.id);
                  onClose();
                }}
                className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer transition group shadow-2xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <span className="flex items-center gap-1 font-mono font-medium text-slate-600">
                    <Clock className="h-3 w-3 text-indigo-600" />
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              </div>
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

