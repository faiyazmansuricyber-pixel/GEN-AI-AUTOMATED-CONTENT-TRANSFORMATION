"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Database, FileText, Layers, Cpu } from 'lucide-react';
import { useCountUp, useMouseSpotlight, useTilt } from '@/lib/hooks';
import { API_BASE } from '@/lib/api';

interface StatsStripProps {
  refreshTrigger?: number;
}

function StatCard({
  icon: Icon,
  iconClass,
  cardClass,
  value,
  label
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  cardClass: string;
  value: number;
  label: string;
}) {
  const spotlightRef = useMouseSpotlight<HTMLDivElement>();
  const tiltRef = useTilt<HTMLDivElement>();
  const { ref: countRef, value: count } = useCountUp(value);

  return (
    <div
      ref={(element) => {
        spotlightRef.current = element;
        tiltRef.current = element;
        countRef.current = element;
      }}
      className={`spotlight-card tilt-card relative flex items-center gap-3 px-3.5 py-2 rounded-xl border ${cardClass}`}
    >
      <div className={`brand-icon-lift p-2 rounded-lg text-white shadow-xs ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-base lg:text-lg font-extrabold text-slate-900 leading-none">
          {count}
        </div>
        <div className="text-[11px] font-semibold text-slate-500 mt-0.5 whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}

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
          <StatCard
            icon={FileText}
            iconClass="bg-indigo-600"
            cardClass="bg-indigo-50/70 border-indigo-100"
            value={stats.totalSubmissions}
            label="Submissions"
          />
          <StatCard
            icon={Cpu}
            iconClass="bg-purple-600"
            cardClass="bg-purple-50/70 border-purple-100"
            value={stats.totalOutputs}
            label="Outputs Generated"
          />
          <StatCard
            icon={Layers}
            iconClass="bg-cyan-600"
            cardClass="bg-cyan-50/70 border-cyan-100"
            value={stats.totalChunks}
            label="Chunks Analyzed"
          />
        </div>
      </div>
    </div>
  );
}
