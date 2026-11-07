"use client";

import React from 'react';
import { AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  error: { error: string; message: string } | null;
  onDismiss: () => void;
}

export default function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="w-full mb-6 p-4.5 rounded-2xl bg-rose-50/90 border border-rose-200/90 text-rose-900 shadow-md flex items-start justify-between gap-4 animate-fadeIn">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 mt-0.5 border border-rose-200 shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-rose-900 flex items-center gap-2">
            <span>{error.error || 'System Execution Error'}</span>
          </h4>
          <p className="text-xs text-rose-900/90 mt-1.5 leading-relaxed font-mono bg-white/70 p-3 rounded-xl border border-rose-200/80 break-all shadow-2xs">
            {error.message}
          </p>
          <div className="mt-2 text-[11px] text-rose-700 flex items-center gap-1.5 font-semibold">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-600" />
            <span>Verify your inputs or backend service connection before retrying.</span>
          </div>
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition cursor-pointer shrink-0"
        title="Dismiss error notification"
      >
        <XCircle className="h-5 w-5" />
      </button>
    </div>
  );
}

