"use client";

import React, { useMemo } from 'react';
import { Brain, Tag, Layers, CheckCircle2, Globe, MessageSquare, Users, Sparkles, ShieldCheck, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useCountUp, useInView, useReducedMotion } from '@/lib/hooks';

export interface AnalysisData {
  summary: string;
  key_claims: Array<{ claim: string; source_chunk_ids: string[] }>;
  entities: string[];
  detected_domain: string;
  suggested_tone: string;
  suggested_audience: string;
}

interface AnalysisViewProps {
  analysis: AnalysisData | null;
  isLoading?: boolean;
  onChunkClick?: (chunkId: string, sourceElement?: HTMLElement) => void;
}

// Categorize entities heuristically on client-side
interface CategorizedEntity {
  name: string;
  category: 'technical' | 'organization' | 'metric' | 'general';
}

function categorizeEntity(entity: string): CategorizedEntity['category'] {
  const e = entity.toLowerCase();
  if (/cve-\d+|vulnerability|0x[0-9a-f]+|hash|sha256|api|ip|cisa|exploit|botnet|malware/i.test(entity)) {
    return 'technical';
  }
  if (/inc|corp|ltd|gov|ministry|agency|department|google|gemini|microsoft|aws|sih|team|organization|center|institute/i.test(entity) || /^[A-Z][a-z]+ [A-Z][a-z]+/.test(entity)) {
    return 'organization';
  }
  if (/\d+%|\$|\b(percent|rate|level|metric|score|year|cost|growth|index)\b/i.test(e)) {
    return 'metric';
  }
  return 'general';
}

const CATEGORY_STYLES = {
  technical: {
    bg: 'bg-rose-50 text-rose-800 border-rose-200 hover:border-rose-300',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    label: 'Technical / Threat / CVE',
    color: '#f43f5e'
  },
  organization: {
    bg: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:border-indigo-300',
    badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    label: 'Organization / Actor',
    color: '#6366f1'
  },
  metric: {
    bg: 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-300',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Metric / Claim',
    color: '#f59e0b'
  },
  general: {
    bg: 'bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300',
    badge: 'bg-slate-200 text-slate-700 border-slate-300',
    label: 'General Entity',
    color: '#64748b'
  }
};

function AnimatedMetric({ value, suffix = '' }: { value: number; suffix?: string }) {
  const { ref, value: displayValue } = useCountUp(value);

  return (
    <div ref={ref} className="analysis-stat-number" aria-label={`${value}${suffix}`}>
      {displayValue}{suffix}
    </div>
  );
}

export default function AnalysisView({ analysis, isLoading, onChunkClick }: AnalysisViewProps) {
  const reducedMotion = useReducedMotion();
  const { ref: chartRef, inView: chartInView } = useInView<HTMLDivElement>(0.25);

  // Categorize entities
  const categorizedEntities = useMemo(() => {
    return (analysis?.entities || []).map(ent => ({
      name: ent,
      category: categorizeEntity(ent)
    }));
  }, [analysis?.entities]);

  // Compute entity counts per category for the donut chart
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {
      technical: 0,
      organization: 0,
      metric: 0,
      general: 0
    };
    categorizedEntities.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });
    return [
      { name: 'Technical', category: 'technical', count: counts.technical, color: CATEGORY_STYLES.technical.color },
      { name: 'Organization', category: 'organization', count: counts.organization, color: CATEGORY_STYLES.organization.color },
      { name: 'Metric', category: 'metric', count: counts.metric, color: CATEGORY_STYLES.metric.color },
      { name: 'General', category: 'general', count: counts.general, color: CATEGORY_STYLES.general.color }
    ].filter(c => c.count > 0);
  }, [categorizedEntities]);

  // Skeleton Loading State
  if (isLoading && !analysis) {
    return (
      <div className="analysis-intelligence-view w-full bg-white rounded-2xl p-6 lg:p-7 shadow-lg mb-8 border border-purple-200/80 relative overflow-hidden animate-fade-in-up">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500" />
        
        {/* Skeleton Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-64 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-cyan-100 rounded-full animate-pulse" />
            <div className="h-6 w-20 bg-purple-100 rounded-full animate-pulse" />
            <div className="h-6 w-24 bg-amber-100 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Skeleton Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 animate-pulse space-y-2">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-6 w-12 bg-slate-300 rounded" />
            </div>
          ))}
        </div>

        {/* Skeleton Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="space-y-2">
              <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-24 bg-slate-100 rounded-xl border border-slate-200 animate-pulse p-4 space-y-2">
                <div className="h-3 w-full bg-slate-200 rounded" />
                <div className="h-3 w-5/6 bg-slate-200 rounded" />
                <div className="h-3 w-4/6 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-44 bg-slate-200 rounded animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 bg-slate-50 border border-slate-200 rounded-xl animate-pulse p-3" />
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="h-3 w-32 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="h-48 bg-slate-50 rounded-xl border border-slate-200 animate-pulse p-4 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <div key={k} className="h-7 w-20 bg-slate-200 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <section className="mb-8 rounded-2xl border border-dashed border-violet-200 bg-[linear-gradient(120deg,#f6f2ff,#f7fbff_65%,#fff8f1)] px-6 py-8 shadow-sm">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 shadow-sm">
            <Brain className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Intelligence appears after source analysis</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Submit a source to the backend to extract its synthesis, claims, entities, and suggested audience. Nothing is fabricated for this empty state.
          </p>
          <a
            href="#workspace"
            className="mt-4 inline-flex rounded-lg bg-violet-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            Add a source
          </a>
        </div>
      </section>
    );
  }

  // Extract stats
  const totalClaims = analysis.key_claims?.length || 0;
  const sourcedClaims = analysis.key_claims?.filter((claim) => claim.source_chunk_ids?.length > 0).length || 0;
  const totalEntities = analysis.entities?.length || 0;
  const uniqueChunks = Array.from(
    new Set(analysis.key_claims?.flatMap(c => c.source_chunk_ids || []) || [])
  ).length;

  // Unique categories present
  const categoriesPresent = Array.from(new Set(categorizedEntities.map(e => e.category)));

  return (
    <div className="w-full bg-white rounded-2xl p-6 lg:p-7 shadow-lg mb-8 border border-purple-200/80 relative overflow-hidden animate-fade-in-up">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500" />

      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100/70 text-purple-700 border border-purple-200 shrink-0">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Structured Intelligence Analysis</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                Gemini 3 Flash
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated domain classification, executive synthesis, and claim provenance verification
            </p>
          </div>
        </div>

        {/* Categorization Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 text-xs font-bold border border-cyan-200 shadow-xs">
            <Globe className="h-3.5 w-3.5 text-cyan-600" />
            <span>Domain: <strong>{analysis.detected_domain || 'General'}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200 shadow-xs">
            <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
            <span>Tone: <strong>{analysis.suggested_tone || 'Formal'}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200 shadow-xs">
            <Users className="h-3.5 w-3.5 text-amber-600" />
            <span>Audience: <strong>{analysis.suggested_audience || 'Executive'}</strong></span>
          </span>
        </div>
      </div>

      {/* KEY STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="analysis-stat-card analysis-stat-purple p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center gap-3">
          <div className="p-2 bg-purple-600 text-white rounded-lg shadow-xs">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <AnimatedMetric value={totalClaims} />
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Extracted Claims</div>
          </div>
        </div>

        <div className="analysis-stat-card analysis-stat-indigo p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <AnimatedMetric value={totalEntities} />
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Key Entities</div>
          </div>
        </div>

        <div className="analysis-stat-card analysis-stat-cyan p-3 rounded-xl bg-cyan-50/70 border border-cyan-100 flex items-center gap-3">
          <div className="p-2 bg-cyan-600 text-white rounded-lg shadow-xs">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <AnimatedMetric value={uniqueChunks} />
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Source Chunks Linked</div>
          </div>
        </div>

        <div className="analysis-stat-card analysis-stat-emerald p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <AnimatedMetric value={sourcedClaims} suffix={`/${totalClaims}`} />
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Claims linked to sources</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary & Key Claims */}
        <div className="lg:col-span-2 space-y-5">
          {/* Executive Summary */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>Core Executive Synthesis</span>
            </h4>
            <div className="bg-slate-50/70 p-4 lg:p-5 rounded-xl border border-slate-200 text-xs lg:text-sm text-slate-800 leading-relaxed font-sans shadow-xs" dir="auto">
              {analysis.summary}
            </div>
          </div>

          {/* Key Claims with Provenance Tags */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Extracted Claims & Source Provenance</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">Click chunk tag to inspect source</span>
            </h4>

            <div className="space-y-2.5">
              {analysis.key_claims?.map((item, idx) => (
                <div key={idx} className="analysis-claim-card bg-white p-3.5 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs hover:border-slate-300 transition interactive-hover">
                  <p className="text-slate-800 font-medium leading-relaxed flex-1" dir="auto">
                    <span className="font-bold text-purple-700 font-mono mr-1.5">{idx + 1}.</span>
                    {item.claim}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Source:</span>
                    <span className="analysis-claim-source-count">
                      {item.source_chunk_ids?.length || 0} {item.source_chunk_ids?.length === 1 ? 'source' : 'sources'}
                    </span>
                    {item.source_chunk_ids?.map((cid) => (
                      <button
                        key={cid}
                        onClick={(event) => onChunkClick?.(cid, event.currentTarget)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-mono font-bold border border-indigo-200 transition cursor-pointer shadow-xs hover:scale-105"
                        title={`Click to highlight source chunk ${cid} in Audit panel`}
                      >
                        {cid}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Color-Coded Categorized Entities & Donut Chart */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-indigo-600" />
            <span>Extracted Entities ({totalEntities})</span>
          </h4>

          {/* Category Legend */}
          <div className="mb-2 flex flex-wrap gap-1.5 text-[10px]">
            {categoriesPresent.map((catKey) => {
              const style = CATEGORY_STYLES[catKey];
              return (
                <span key={catKey} className={`px-2 py-0.5 rounded-md border font-semibold ${style.badge}`}>
                  {style.label}
                </span>
              );
            })}
          </div>

          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 shadow-xs h-full flex flex-col gap-3">
            {/* Entity Breakdown Donut Chart */}
            {categoryChartData.length > 0 && (
              <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col items-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 w-full text-left flex items-center gap-1.5">
                  <PieChartIcon className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Category Breakdown</span>
                </div>
                <div ref={chartRef} className="analysis-chart-wrap w-full h-[170px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={62}
                        paddingAngle={4}
                        isAnimationActive={!reducedMotion && chartInView}
                        animationDuration={850}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '11px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value, name) => [`${value} entities`, String(name)]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="analysis-chart-legend" aria-label="Entity category counts">
                  {categoryChartData.map((entry) => (
                    <div key={entry.category}>
                      <i style={{ backgroundColor: entry.color }} />
                      <span>{entry.name}</span>
                      <strong>{entry.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entity Chip List */}
            <div className="flex flex-wrap gap-1.5">
              {categorizedEntities.map((item, i) => {
                const style = CATEGORY_STYLES[item.category];
                return (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border shadow-2xs transition ${style.bg}`}
                    title={`Category: ${style.label}`}
                  >
                    {item.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
