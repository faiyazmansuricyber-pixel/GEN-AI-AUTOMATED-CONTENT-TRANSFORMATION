"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Database, FileText, Layers, Cpu } from 'lucide-react';

interface StatsStripProps {
  refreshTrigger?: number;
}

const API_BASE = "http://127.0.0.1:8000/api";

export default function StatsStrip({ refreshTrigger = 0 }: StatsStripProps) {
  const [stats, setStats] = useState<{
    totalSubmissions: number;
    totalOutputs: number;
    totalChunks: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAggregateStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/submissions`);
      if (!res.ok) {
        setStats(null);
        return;
      }
      const submissionsList: Array<{ id: string; output_types?: string[] }> = await res.json();
      
      if (!submissionsList || submissionsList.length === 0) {
        setStats(null);
        return;
      }

      const totalSubmissions = submissionsList.length;
      const totalOutputs = submissionsList.reduce(
        (acc, item) => acc + (item.output_types?.length || 0),
        0
      );

      // Fetch details for chunk counts across submissions
      const details = await Promise.all(
        submissionsList.map(async (item) => {
          try {
            const detailRes = await fetch(`${API_BASE}/submissions/${item.id}`);
            if (detailRes.ok) {
              const data = await detailRes.json();
              return data.chunks?.length || 0;
            }
          } catch {
            return 0;
          }
          return 0;
        })
      );

      const totalChunks = details.reduce((acc, count) => acc + count, 0);

      setStats({
        totalSubmissions,
        totalOutputs,
        totalChunks
      });
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAggregateStats();
  }, [fetchAggregateStats, refreshTrigger]);

  if (loading || !stats || stats.totalSubmissions === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white/90 backdrop-blur-xs rounded-2xl p-4 lg:p-5 shadow-sm border border-slate-200/90 mb-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Database className="h-4 w-4 text-indigo-600" />
          <span>Platform Activity & Historical Insights</span>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full sm:w-auto">
          {/* Stat 1: Submissions */}
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base lg:text-lg font-extrabold text-slate-900 leading-none">
                {stats.totalSubmissions}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5 whitespace-nowrap">
                Submissions
              </div>
            </div>
          </div>

          {/* Stat 2: Outputs Generated */}
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-purple-50/70 border border-purple-100">
            <div className="p-2 rounded-lg bg-purple-600 text-white shadow-xs">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base lg:text-lg font-extrabold text-slate-900 leading-none">
                {stats.totalOutputs}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5 whitespace-nowrap">
                Outputs Generated
              </div>
            </div>
          </div>

          {/* Stat 3: Chunks Analyzed */}
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-cyan-50/70 border border-cyan-100">
            <div className="p-2 rounded-lg bg-cyan-600 text-white shadow-xs">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base lg:text-lg font-extrabold text-slate-900 leading-none">
                {stats.totalChunks}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5 whitespace-nowrap">
                Chunks Analyzed
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
