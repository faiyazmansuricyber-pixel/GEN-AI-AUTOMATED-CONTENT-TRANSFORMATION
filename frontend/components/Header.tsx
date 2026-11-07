"use client";

import React from 'react';
import Image from 'next/image';
import { History, Cpu, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
  backendStatus: boolean;
  modelName: string;
}

export default function Header({ onOpenHistory, backendStatus, modelName }: HeaderProps) {
  return (
    <header className="header-aurora sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-4 lg:px-8 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        {/* Brand & Title */}
        <div className="flex items-center gap-3.5">
          {/* Logo Mark */}
          <div className="relative h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/20 shrink-0">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Content Transformation Platform Logo"
                width={44}
                height={44}
                className="h-full w-full object-cover rounded-[10px]"
                priority
              />
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center">
              <ShieldCheck className="h-2.5 w-2.5 text-white" />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg lg:text-xl font-extrabold tracking-tight text-slate-900">
                Content Transformation Platform
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200/80 shadow-xs">
                SIH 2026 | PS 26154 | Team Cyphers
              </span>
            </div>
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
              <span className="font-medium text-slate-600">Secure Multimodal Content Transformation</span>
              <span className="hidden md:inline-block w-1 h-1 rounded-full bg-slate-300" />
              <span className="inline-flex items-center gap-1 text-cyan-700 font-mono text-[11px] font-semibold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                <Cpu className="h-3 w-3 text-cyan-600" /> {modelName}
              </span>
            </p>
          </div>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Backend Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${backendStatus ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${backendStatus ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </span>
            <span className={backendStatus ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
              {backendStatus ? 'API Connected' : 'API Offline'}
            </span>
          </div>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 shadow-xs text-slate-700 hover:text-indigo-900 text-xs font-semibold transition cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-indigo-600" />
            <span>Past Submissions</span>
          </button>
        </div>
      </div>
      <div className="aurora-layer header-aurora-glow" aria-hidden="true" />
    </header>
  );
}
