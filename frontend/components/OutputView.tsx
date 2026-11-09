"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useMouseSpotlight } from '@/lib/hooks';
import MagneticButton from '@/components/MagneticButton';
import { API_BASE } from '@/lib/api';
import { 
  FileCheck, FileOutput, Presentation, 
  BarChart3, Video, Copy, Check, ChevronLeft, ChevronRight, 
  MessageSquare, Sparkles, Layers, FileText, Eye,
  Download, Archive, Loader2, AlertCircle, Maximize2, Minimize2,
  Pencil, Save, X, RotateCcw
} from 'lucide-react';

interface OutputViewProps {
  outputs: Record<string, any>;
  errors: Record<string, string>;
  selectedOutputs?: string[];
  isLoading?: boolean;
  onChunkClick?: (chunkId: string, sourceElement?: HTMLElement) => void;
  submissionId?: string;
  chunks?: any[];
  onRegenerate?: (outputType: string) => void;
  regeneratingOutput?: string | null;
  canRegenerate?: boolean;
  editContextKey?: number;
}

function GroundingBadge({ claimsUsed, validChunkIds }: { claimsUsed?: string[]; validChunkIds?: Set<string> }) {
  if (!claimsUsed || !Array.isArray(claimsUsed) || claimsUsed.length === 0) return null;

  const validCount = claimsUsed.filter(cid =>
    validChunkIds && validChunkIds.size > 0 ? validChunkIds.has(cid) : Boolean(cid && typeof cid === 'string' && cid.trim())
  ).length;

  const totalCount = claimsUsed.length;
  const scorePercent = Math.round((validCount / totalCount) * 100);
  const is100 = scorePercent === 100;
  const circumference = 2 * Math.PI * 14;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border shadow-2xs transition ${
        is100
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
      title={`${validCount} of ${totalCount} referenced source chunk IDs exist in this submission (${scorePercent}% matched)`}
    >
      <svg className="h-8 w-8 shrink-0" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200" />
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - scorePercent / 100)}
          transform="rotate(-90 18 18)"
          className={`grounding-ring ${is100 ? 'text-emerald-500' : 'text-amber-500'}`}
        />
      </svg>
      <span>{validCount}/{totalCount} chunk refs matched</span>
    </div>
  );
}

// Brand color maps for deliverable tabs
const BRAND_META: Record<string, { label: string; icon: React.FC; activeClass: string; badgeBg: string }> = {
  linkedin_post: {
    label: 'LinkedIn Post',
    icon: function LinkedinIcon() {
      return (
        <svg className="h-4 w-4 fill-current text-white" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
        </svg>
      );
    },
    activeClass: 'bg-[#0A66C2] text-white shadow-md shadow-blue-600/30',
    badgeBg: 'bg-[#0A66C2]'
  },
  twitter_thread: {
    label: 'Twitter / X Thread',
    icon: function XIcon() {
      return (
        <svg className="h-3.5 w-3.5 fill-current text-white" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    },
    activeClass: 'bg-slate-900 text-white shadow-md shadow-slate-900/30',
    badgeBg: 'bg-slate-900'
  },
  advisory: {
    label: 'Advisory Doc',
    icon: function AdvIcon() { return <FileCheck className="h-4 w-4 text-white" />; },
    activeClass: 'bg-amber-600 text-white shadow-md shadow-amber-600/30',
    badgeBg: 'bg-amber-600'
  },
  executive_summary: {
    label: 'Executive Summary',
    icon: function ExecIcon() { return <FileOutput className="h-4 w-4 text-white" />; },
    activeClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30',
    badgeBg: 'bg-emerald-600'
  },
  presentation: {
    label: 'Presentation Slides',
    icon: function SlideIcon() { return <Presentation className="h-4 w-4 text-white" />; },
    activeClass: 'bg-purple-600 text-white shadow-md shadow-purple-600/30',
    badgeBg: 'bg-purple-600'
  },
  infographic: {
    label: 'Infographic Layout',
    icon: function InfoIcon() { return <BarChart3 className="h-4 w-4 text-white" />; },
    activeClass: 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30',
    badgeBg: 'bg-cyan-600'
  },
  video_package: {
    label: 'Video Package',
    icon: function VidIcon() { return <Video className="h-4 w-4 text-white" />; },
    activeClass: 'bg-rose-600 text-white shadow-md shadow-rose-600/30',
    badgeBg: 'bg-rose-600'
  }
};

export default function OutputView({
  outputs,
  errors,
  selectedOutputs = [],
  isLoading,
  onChunkClick,
  submissionId,
  chunks,
  onRegenerate,
  regeneratingOutput,
  canRegenerate = false,
  editContextKey
}: OutputViewProps) {
  const validChunkIds = React.useMemo(() => {
    return new Set((chunks || []).map((c: any) => (typeof c === 'string' ? c : c.id)));
  }, [chunks]);

  const outputKeys = Object.keys(outputs);
  const errorKeys = Object.keys(errors);
  
  // When selectedOutputs is specified (active generation run), strictly show selectedOutputs.
  // Otherwise (e.g. past submission loaded), show saved output keys.
  const baseKeys = selectedOutputs.length > 0 ? selectedOutputs : outputKeys;
  const allTabs = Array.from(new Set([...baseKeys, ...errorKeys]));

  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const activeTab = (selectedTab && allTabs.includes(selectedTab)) ? selectedTab : (allTabs[0] || 'linkedin_post');
  const [tabDirection, setTabDirection] = useState<'next' | 'previous'>('next');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [linkedinExpanded, setLinkedinExpanded] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [localEdits, setLocalEdits] = useState<Record<string, unknown>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const downloadTimerRef = useRef<number | null>(null);
  const outputSpotlightRef = useMouseSpotlight<HTMLDivElement>();

  const selectTab = (nextTab: string) => {
    setTabDirection(allTabs.indexOf(nextTab) >= allTabs.indexOf(activeTab) ? 'next' : 'previous');
    setSelectedTab(nextTab);
    setCurrentSlide(0);
  };

  useEffect(() => {
    if (!previewExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewExpanded(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [previewExpanded]);

  useEffect(() => () => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    if (downloadTimerRef.current !== null) window.clearTimeout(downloadTimerRef.current);
  }, []);

  useEffect(() => {
    setLocalEdits({});
    setIsEditing(false);
    setEditError(null);
  }, [submissionId, editContextKey]);

  const copyToClipboard = async (text: string, key: string) => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setCopyError('Clipboard access is unavailable. Select the text and copy it manually.');
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopyError(null), 5000);
    }
  };

  const triggerDownload = async (outputType: string, isZip = false) => {
    if (!submissionId) return;
    const key = isZip ? '__all__' : outputType;
    setDownloadingKey(key);
    setDownloadError(null);
    try {
      const url = isZip
        ? `${API_BASE}/export/${submissionId}/all`
        : `${API_BASE}/export/${submissionId}/${outputType}`;
      const method = isZip ? 'GET' : 'POST';
      const res = await fetch(url, { method });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.detail || `Download failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const nameMatch = disposition.match(/filename="?([^"]+)"?/);
      const defaultExt = outputType === 'presentation' ? 'pptx' : 'docx';
      const filename = nameMatch ? nameMatch[1] : (isZip ? 'all_outputs.zip' : `${outputType}.${defaultExt}`);
      const anchor = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setDownloadNotice(`Download started: ${filename}`);
      if (downloadTimerRef.current !== null) window.clearTimeout(downloadTimerRef.current);
      downloadTimerRef.current = window.setTimeout(() => setDownloadNotice(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed. Please try again.';
      setDownloadError(message);
      setDownloadNotice(null);
      if (downloadTimerRef.current !== null) window.clearTimeout(downloadTimerRef.current);
      downloadTimerRef.current = window.setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setDownloadingKey(null);
    }
  };

  const hasLocalEdit = Object.prototype.hasOwnProperty.call(localEdits, activeTab);
  const activeOutputData = outputs[activeTab]
    ? { ...outputs[activeTab], ...(hasLocalEdit ? { content: localEdits[activeTab] } : {}) }
    : undefined;
  const executiveSummaryText = String(activeOutputData?.content ?? '');
  const activeError = errors[activeTab];
  const isTabPending = isLoading && !activeOutputData && !activeError;

  const beginEditing = () => {
    if (!activeOutputData) return;
    const content = activeOutputData.content;
    setEditDraft(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    setEditError(null);
    setIsEditing(true);
  };

  const saveLocalEdit = () => {
    const originalContent = outputs[activeTab]?.content;
    if (typeof originalContent === 'string') {
      setLocalEdits((previous) => ({ ...previous, [activeTab]: editDraft }));
      setEditError(null);
      setIsEditing(false);
      return;
    }

    try {
      const parsedContent: unknown = JSON.parse(editDraft);
      setLocalEdits((previous) => ({ ...previous, [activeTab]: parsedContent }));
      setEditError(null);
      setIsEditing(false);
    } catch {
      setEditError('This structured output must remain valid JSON. Correct the syntax or cancel your changes.');
    }
  };

  const regenerateActiveOutput = () => {
    if (!canRegenerate || !onRegenerate || regeneratingOutput) return;
    setIsEditing(false);
    setEditError(null);
    setLocalEdits((previous) => {
      const next = { ...previous };
      delete next[activeTab];
      return next;
    });
    onRegenerate(activeTab);
  };

  if (allTabs.length === 0 && !isLoading) {
    return (
      <div className="mb-8 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/55 px-5 py-8 text-center shadow-sm sm:px-8">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-indigo-600 shadow-sm">
          <Layers className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Your deliverables will appear here</h3>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-600">
          Add a source and choose one or more output formats to create your first transformation.
        </p>
        <a href="#workspace" className="mt-4 inline-flex rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700">
          Choose a source
        </a>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl p-6 lg:p-7 shadow-lg border border-slate-200/90 mb-8 relative overflow-hidden animate-fade-in-up">
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500" />

      {/* Download error toast */}
      {downloadError && (
        <div role="alert" className="absolute top-4 right-4 z-10 flex max-w-xs items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800 shadow-lg">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{downloadError}</span>
        </div>
      )}
      {copyError && (
        <div role="alert" className="absolute top-4 right-4 z-10 flex max-w-xs items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800 shadow-lg">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{copyError}</span>
        </div>
      )}
      {downloadNotice && !downloadError && (
        <div role="status" className="absolute top-4 right-4 z-10 flex max-w-xs items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 shadow-lg">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{downloadNotice}</span>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {copiedKey ? 'Content copied to clipboard.' : ''}
      </span>

      {/* Header & Output Deliverable Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <span>Generated Multi-Channel Deliverables</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a target platform below to review platform-specific outputs & chunk traceability
          </p>
        </div>

        {/* Tab Buttons with Brand Logos and Micro-interaction Hover */}
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Generated output formats">
          {allTabs.map((key) => {
            const isFailed = Boolean(errors[key]);
            const isDone = Boolean(outputs[key]);
            const meta = BRAND_META[key] || {
              label: key.replace('_', ' '),
              icon: () => <Sparkles className="h-4 w-4" />,
              activeClass: 'bg-indigo-600 text-white',
              badgeBg: 'bg-indigo-600'
            };
            const Icon = meta.icon;
            const isActive = activeTab === key;

            return (
              <button
                key={key}
                id={`output-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`output-panel-${key}`}
                tabIndex={isActive ? 0 : -1}
                disabled={isEditing}
                onClick={() => selectTab(key)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                  event.preventDefault();
                  const direction = event.key === 'ArrowRight' ? 1 : -1;
                  const currentIndex = allTabs.indexOf(key);
                  const nextTab = allTabs[(currentIndex + direction + allTabs.length) % allTabs.length];
                  selectTab(nextTab);
                  document.getElementById(`output-tab-${nextTab}`)?.focus();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer interactive-hover ${
                  isActive
                    ? isFailed ? 'bg-rose-600 text-white shadow-md' : meta.activeClass
                    : isFailed
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-slate-100/90 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className={`p-1 rounded-md ${isActive ? 'bg-white/20' : meta.badgeBg}`}>
                  <Icon />
                </div>
                <span>{meta.label}</span>
                {!isDone && !isFailed && isLoading && (
                  <Loader2 className="h-3 w-3 animate-spin text-slate-400 ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Download All button */}
        {submissionId && outputKeys.length > 0 && (
          <MagneticButton
            id="download-all-outputs-btn"
            onClick={() => triggerDownload('', true)}
            disabled={downloadingKey === '__all__'}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm shadow-indigo-300/40 cursor-pointer interactive-hover"
          >
            {downloadingKey === '__all__' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            <span>{downloadingKey === '__all__' ? 'Preparing…' : 'Download All (.zip)'}</span>
          </MagneticButton>
        )}
      </div>

      {/* Error state for this specific tab */}
      {activeError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs animate-fade-in-up">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold">Failed to generate {activeTab.replace('_', ' ')}:</p>
              <p className="mt-1 font-mono text-rose-800">{activeError}</p>
            </div>
            {onRegenerate && (
              <button
                type="button"
                onClick={regenerateActiveOutput}
                disabled={!canRegenerate || Boolean(regeneratingOutput)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {regeneratingOutput === activeTab ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                {regeneratingOutput === activeTab ? 'Retrying…' : 'Retry this format'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* SKELETON LOADING STATE FOR TAB WHILE STILL GENERATING */}
      {isTabPending && (
        <div className="space-y-4 animate-pulse">
          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-slate-300" />
              <div className="h-4 w-40 bg-slate-300 rounded" />
            </div>
            <div className="h-8 w-24 bg-slate-200 rounded-lg" />
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-200 rounded" />
            <div className="h-4 w-5/6 bg-slate-200 rounded" />
            <div className="h-4 w-2/3 bg-slate-200 rounded" />
          </div>
        </div>
      )}

      {/* Render Active Output Content */}
      {activeOutputData && (
        <div
          ref={outputSpotlightRef}
          key={activeTab}
          id={`output-panel-${activeTab}`}
          data-tab-direction={tabDirection}
          role={previewExpanded ? 'dialog' : 'tabpanel'}
          tabIndex={0}
          aria-modal={previewExpanded || undefined}
          aria-label={previewExpanded ? `${BRAND_META[activeTab]?.label || activeTab} expanded preview` : undefined}
          aria-labelledby={previewExpanded ? undefined : `output-tab-${activeTab}`}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && previewExpanded) {
              event.stopPropagation();
              setPreviewExpanded(false);
              return;
            }
            if (event.key !== 'Tab' || !previewExpanded) return;
            const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
          className={`spotlight-card relative space-y-6 tab-content-transition${previewExpanded ? ' output-preview-expanded' : ''}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            {hasLocalEdit ? (
              <p className="max-w-2xl text-[11px] leading-relaxed text-amber-800" role="status">
                Edited in this session only. These changes are not saved to the backend; exports contain the last server-generated version.
              </p>
            ) : <span />}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {activeOutputData && (
                isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditError(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveLocalEdit}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <Save className="h-3.5 w-3.5" /> Save local edit
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={beginEditing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit content
                  </button>
                )
              )}
              {onRegenerate && (
                <button
                  type="button"
                  onClick={regenerateActiveOutput}
                  disabled={!canRegenerate || Boolean(regeneratingOutput) || isEditing}
                  title={canRegenerate ? 'Regenerate this format using the saved analysis and current generation settings' : 'Complete analysis before regenerating'}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {regeneratingOutput === activeTab
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RotateCcw className="h-3.5 w-3.5" />}
                  {regeneratingOutput === activeTab ? 'Regenerating…' : 'Regenerate'}
                </button>
              )}
            <button
              type="button"
              onClick={() => setPreviewExpanded((expanded) => !expanded)}
              aria-label={previewExpanded ? 'Exit expanded output preview' : 'Expand output preview'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-indigo-200 hover:text-indigo-700"
            >
              {previewExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {previewExpanded ? 'Exit expanded view' : 'Expand preview'}
            </button>
            </div>
          </div>
          {isEditing && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <label htmlFor="output-local-editor" className="mb-2 block text-xs font-bold text-violet-950">
                Edit generated content
                <span className="ml-2 font-normal text-violet-800">Changes stay in this browser session.</span>
              </label>
              <textarea
                id="output-local-editor"
                value={editDraft}
                onChange={(event) => {
                  setEditDraft(event.target.value);
                  setEditError(null);
                }}
                rows={10}
                spellCheck
                className="w-full resize-y rounded-lg border border-violet-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              {editError && <p className="mt-2 text-xs font-semibold text-rose-700" role="alert">{editError}</p>}
              <p className="mt-2 text-[10px] text-slate-600">
                Structured formats use JSON so their slide, thread, or document fields remain intact. The saved server output and downloads are unchanged.
              </p>
            </div>
          )}
          {/* 1. LINKEDIN POST */}
          {activeTab === 'linkedin_post' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                <span className="flex items-center gap-2 text-xs font-extrabold text-[#0A66C2] uppercase tracking-wider">
                  <div className="p-1.5 rounded-md bg-[#0A66C2] text-white">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                    </svg>
                  </div>
                  <span>LinkedIn Professional Post</span>
                </span>
                <div className="flex items-center gap-2">
                  <GroundingBadge claimsUsed={activeOutputData.claims_used} validChunkIds={validChunkIds} />
                  <button
                    onClick={() => copyToClipboard(typeof activeOutputData.content === 'string' ? activeOutputData.content : JSON.stringify(activeOutputData.content), 'linkedin')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer interactive-hover"
                  >
                    {copiedKey === 'linkedin' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy Post</span>
                      </>
                    )}
                  </button>
                  {submissionId && (
                    <MagneticButton
                      id="download-linkedin-btn"
                      onClick={() => triggerDownload('linkedin_post')}
                      disabled={downloadingKey === 'linkedin_post'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 interactive-hover"
                    >
                      {downloadingKey === 'linkedin_post' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-slate-500" />}
                      <span>{downloadingKey === 'linkedin_post' ? '…' : 'Download'}</span>
                    </MagneticButton>
                  )}
                </div>
              </div>

              <article className="linkedin-post-preview">
                <header className="linkedin-author">
                  <span className="linkedin-avatar" aria-hidden="true">AI</span>
                  <span className="linkedin-author-copy">
                    <strong>AI Content Intelligence Studio</strong>
                    <span>One source. Every channel.</span>
                    <span>Team Cyphers · Public</span>
                  </span>
                  <span className="linkedin-post-menu" aria-hidden="true">•••</span>
                </header>
                <p className={`linkedin-post-copy${linkedinExpanded ? ' is-expanded' : ''}`} dir="auto">
                  {activeOutputData.content}
                </p>
                <button
                  type="button"
                  className="linkedin-see-more"
                  onClick={() => setLinkedinExpanded((expanded) => !expanded)}
                  aria-expanded={linkedinExpanded}
                >
                  {linkedinExpanded ? 'See less' : 'See more'}
                </button>
                <div className="linkedin-reaction-summary" aria-hidden="true">
                  <span><i className="linkedin-reaction-dot">✓</i> Source-grounded content</span>
                  <span>·</span>
                  <span>{activeOutputData.claims_used?.length || 0} references</span>
                </div>
                <div className="linkedin-reaction-bar" aria-hidden="true">
                  <span><b>↑</b> Like</span>
                  <span><b>▢</b> Comment</span>
                  <span><b>↻</b> Repost</span>
                  <span><b>➤</b> Send</span>
                </div>
              </article>
            </div>
          )}

          {/* 2. TWITTER / X THREAD */}
          {activeTab === 'twitter_thread' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-100/80 p-3 rounded-xl border border-slate-200">
                <span className="flex items-center gap-2 text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  <div className="p-1.5 rounded-md bg-slate-900 text-white">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <span>Twitter / X Thread ({Array.isArray(activeOutputData.content) ? activeOutputData.content.length : 1} Posts)</span>
                </span>
                <div className="flex items-center gap-2">
                  <GroundingBadge claimsUsed={activeOutputData.claims_used} validChunkIds={validChunkIds} />
                  <button
                    onClick={() => copyToClipboard(
                      Array.isArray(activeOutputData.content) ? activeOutputData.content.join('\n\n---\n\n') : String(activeOutputData.content),
                      'twitter'
                    )}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer interactive-hover"
                  >
                    {copiedKey === 'twitter' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy Full Thread</span>
                      </>
                    )}
                  </button>
                  {submissionId && (
                    <MagneticButton
                      id="download-twitter-btn"
                      onClick={() => triggerDownload('twitter_thread')}
                      disabled={downloadingKey === 'twitter_thread'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 interactive-hover"
                    >
                      {downloadingKey === 'twitter_thread' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-slate-500" />}
                      <span>{downloadingKey === 'twitter_thread' ? '…' : 'Download'}</span>
                    </MagneticButton>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {Array.isArray(activeOutputData.content) ? (
                  activeOutputData.content.map((tweet: string, idx: number) => (
                    <div key={idx} style={{ animationDelay: `${Math.min(idx, 8) * 55}ms` }} className="x-post-preview result-reveal bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/90 text-xs text-slate-800 shadow-xs relative interactive-hover">
                      <div className="x-post-author">
                        <span className="x-post-avatar" aria-hidden="true">X</span>
                        <span className="x-post-author-copy">
                          <strong>AI Content Intelligence Studio</strong>
                          <span>@teamcyphers · Public</span>
                        </span>
                        <span className="x-post-more" aria-hidden="true">•••</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                          Post {idx + 1} / {activeOutputData.content.length}
                        </span>
                        <span className="x-character-count">
                          <svg viewBox="0 0 40 40" aria-label={`${tweet.length} of 280 characters`}>
                            <circle className="x-character-track" cx="20" cy="20" r="16" />
                            <circle
                              className={`x-character-progress${tweet.length > 280 ? ' is-over-limit' : ''}`}
                              cx="20"
                              cy="20"
                              r="16"
                              strokeDasharray={2 * Math.PI * 16}
                              strokeDashoffset={2 * Math.PI * 16 * (1 - Math.min(tweet.length / 280, 1))}
                            />
                          </svg>
                          <span>{tweet.length} / 280 characters</span>
                        </span>
                      </div>
                      <p className="x-post-copy leading-relaxed text-sm text-slate-800" dir="auto">{tweet}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-700" dir="auto">{String(activeOutputData.content)}</p>
                )}
              </div>
            </div>
          )}

          {/* 3. ADVISORY DOC */}
          {activeTab === 'advisory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                <span className="flex items-center gap-2 text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                  <div className="p-1.5 rounded-md bg-amber-600 text-white">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <span>Formal Executive Advisory Document</span>
                </span>
                <div className="flex items-center gap-2">
                  <GroundingBadge claimsUsed={activeOutputData.claims_used} validChunkIds={validChunkIds} />
                  {submissionId && (
                    <MagneticButton
                      id="download-advisory-btn"
                      onClick={() => triggerDownload('advisory')}
                      disabled={downloadingKey === 'advisory'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 interactive-hover"
                    >
                      {downloadingKey === 'advisory' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-slate-500" />}
                      <span>{downloadingKey === 'advisory' ? '…' : 'Download'}</span>
                    </MagneticButton>
                  )}
                </div>
              </div>

              <article className="advisory-document-page bg-white p-6 rounded-2xl border border-slate-200 space-y-6 text-xs lg:text-sm text-slate-800 shadow-xs">
                <header className="advisory-letterhead">
                  <span className="advisory-letterhead-mark"><FileCheck className="h-5 w-5" /></span>
                  <span>
                    <strong>AI Content Intelligence Studio</strong>
                    <small>FORMAL ADVISORY · SOURCE-VERIFIED</small>
                  </span>
                  <span className="advisory-document-stamp">TEAM CYPHERS</span>
                </header>
                {activeOutputData.content?.summary && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-600" /> 1. Summary
                    </h4>
                    <p className="leading-relaxed text-slate-700 bg-amber-50/40 p-4 rounded-xl border border-amber-100/70" dir="auto">
                      {activeOutputData.content.summary}
                    </p>
                  </div>
                )}

                {activeOutputData.content?.impact && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-600" /> 2. Strategic Impact
                    </h4>
                    <p className="leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200" dir="auto">
                      {activeOutputData.content.impact}
                    </p>
                  </div>
                )}

                {activeOutputData.content?.recommended_actions && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-600" /> 3. Recommended Action Items
                    </h4>
                    <div className="space-y-2">
                      {activeOutputData.content.recommended_actions.map((act: string, i: number) => (
                        <div key={i} style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }} className="result-reveal flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800">
                          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-relaxed font-medium" dir="auto">{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeOutputData.content?.references && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-600" /> 4. Audit & References
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 font-mono text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200" dir="auto">
                      {activeOutputData.content.references.map((ref: string, i: number) => (
                        <li key={i}>{ref}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <footer className="advisory-document-footer">Prepared from the supplied source · Claims linked to source chunks</footer>
              </article>
            </div>
          )}

          {/* 4. EXECUTIVE SUMMARY */}
          {activeTab === 'executive_summary' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                <span className="flex items-center gap-2 text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
                  <div className="p-1.5 rounded-md bg-emerald-600 text-white">
                    <FileOutput className="h-4 w-4" />
                  </div>
                  <span>Executive Bottom-Line Summary</span>
                </span>
                <div className="flex items-center gap-2">
                  <GroundingBadge claimsUsed={activeOutputData.claims_used} validChunkIds={validChunkIds} />
                  <button
                    onClick={() => copyToClipboard(String(activeOutputData.content), 'exec')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer interactive-hover"
                  >
                    {copiedKey === 'exec' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy Summary</span>
                      </>
                    )}
                  </button>
                  {submissionId && (
                    <MagneticButton
                      id="download-executive-summary-btn"
                      onClick={() => triggerDownload('executive_summary')}
                      disabled={downloadingKey === 'executive_summary'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 interactive-hover"
                    >
                      {downloadingKey === 'executive_summary' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-slate-500" />}
                      <span>{downloadingKey === 'executive_summary' ? '…' : 'Download'}</span>
                    </MagneticButton>
                  )}
                </div>
              </div>

              <article className="executive-memo">
                <header className="executive-memo-header">
                  <span>EXECUTIVE BRIEFING</span>
                  <span>AI CONTENT INTELLIGENCE STUDIO</span>
                </header>
                <div className="executive-memo-body" dir="auto">{activeOutputData.content}</div>
                {executiveSummaryText.trim() && (
                  <aside className="executive-bottom-line" dir="auto">
                    <strong>Bottom line</strong>
                    <span>{executiveSummaryText.split(/[.!?]\s/)[0]}</span>
                  </aside>
                )}
              </article>
            </div>
          )}

          {/* 5. PRESENTATION SLIDES */}
          {activeTab === 'presentation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-purple-50/70 p-3 rounded-xl border border-purple-100">
                <span className="flex items-center gap-2 text-xs font-extrabold text-purple-900 uppercase tracking-wider">
                  <div className="p-1.5 rounded-md bg-purple-600 text-white">
                    <Presentation className="h-4 w-4" />
                  </div>
                  <span>Interactive Presentation Deck</span>
                </span>

                {/* Slide Controls + Download */}
                <div className="flex items-center gap-2">
                  <GroundingBadge claimsUsed={activeOutputData.claims_used} validChunkIds={validChunkIds} />
                  {activeOutputData.content?.slides && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-700 font-bold bg-white px-2.5 py-1 rounded-lg border border-purple-200">
                        Slide {currentSlide + 1} of {activeOutputData.content.slides.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                          disabled={currentSlide === 0}
                          className="p-1.5 rounded-lg bg-white hover:bg-purple-50 disabled:opacity-40 text-slate-700 border border-slate-200 shadow-xs transition cursor-pointer interactive-hover"
                        >
                          <ChevronLeft className="h-4 w-4 text-purple-700" />
                        </button>
                        <button
                          onClick={() => setCurrentSlide(prev => Math.min(activeOutputData.content.slides.length - 1, prev + 1))}
                          disabled={currentSlide === activeOutputData.content.slides.length - 1}
                          className="p-1.5 rounded-lg bg-white hover:bg-purple-50 disabled:opacity-40 text-slate-700 border border-slate-200 shadow-xs transition cursor-pointer interactive-hover"
                        >
                          <ChevronRight className="h-4 w-4 text-purple-700" />
                        </button>
                      </div>
                    </div>
                  )}
                  {submissionId && (
                    <MagneticButton
                      id="download-presentation-btn"
                      onClick={() => triggerDownload('presentation')}
                      disabled={downloadingKey === 'presentation'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-purple-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 interactive-hover"
                    >
                      {downloadingKey === 'presentation' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-slate-500" />}
                      <span>{downloadingKey === 'presentation' ? '…' : 'Download .pptx'}</span>
                    </MagneticButton>
                  )}
                </div>
              </div>

              {/* Slide Card View */}
              {activeOutputData.content?.slides?.[currentSlide] && (
                <div className="presentation-slide-frame bg-white p-6 lg:p-8 rounded-2xl border border-purple-200/90 shadow-md space-y-5">
                  <div className="border-b border-purple-100 pb-4">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                      SLIDE {currentSlide + 1}
                    </span>
                    <h3 className="text-lg lg:text-xl font-bold text-slate-900 mt-2" dir="auto">
                      {activeOutputData.content.slides[currentSlide].title}
                    </h3>
                  </div>

                  <ul className="space-y-3 text-xs lg:text-sm text-slate-700">
                    {activeOutputData.content.slides[currentSlide].bullets?.map((b: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0 mt-2" />
                        <span className="leading-relaxed font-medium" dir="auto">{b}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Speaker Notes */}
                  {activeOutputData.content.slides[currentSlide].speaker_notes && (
                    <div className="mt-5 pt-4 border-t border-slate-100 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                      <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-purple-600" /> Presenter Speaker Notes
                      </p>
                      <p className="text-xs text-slate-700 italic leading-relaxed" dir="auto">
                        &ldquo;{activeOutputData.content.slides[currentSlide].speaker_notes}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}
              {activeOutputData.content?.slides?.length > 0 && (
                <div className="presentation-thumbnails" role="group" aria-label="Presentation slide thumbnails">
                  {activeOutputData.content.slides.map((slide: any, index: number) => (
                    <button
                      type="button"
                      key={index}
                      className={`presentation-thumbnail${currentSlide === index ? ' is-active' : ''}`}
                      onClick={() => setCurrentSlide(index)}
                      aria-label={`Show slide ${index + 1}: ${slide.title}`}
                      aria-current={currentSlide === index ? 'true' : undefined}
                    >
                      <span className="presentation-thumbnail-number">0{index + 1}</span>
                      <strong>{slide.title}</strong>
                      <span className="presentation-thumbnail-lines" aria-hidden="true"><i /><i /><i /></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. INFOGRAPHIC LAYOUT */}
          {activeTab === 'infographic' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-cyan-50/70 p-3 rounded-xl border border-cyan-100">
                <span className="flex items-center gap-2 text-xs font-extrabold text-cyan-900 uppercase tracking-wider">
                  <div className="p-1.5 rounded-md bg-cyan-600 text-white">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <span>Infographic Visual Blueprint</span>
                </span>
                <div className="flex items-center gap-2">
                  <GroundingBadge claimsUsed={activeOutputData.claims_used} validChunkIds={validChunkIds} />
                  {submissionId && (
                    <MagneticButton
                      id="download-infographic-btn"
                      onClick={() => triggerDownload('infographic')}
                      disabled={downloadingKey === 'infographic'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-cyan-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 interactive-hover"
                    >
                      {downloadingKey === 'infographic' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-slate-500" />}
                      <span>{downloadingKey === 'infographic' ? '…' : 'Download'}</span>
                    </MagneticButton>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Headline Banner */}
                {activeOutputData.content?.headline && (
                  <div className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 p-6 rounded-2xl text-white text-center shadow-md">
                    <span className="text-[10px] font-bold text-cyan-200 uppercase tracking-widest">MAIN INFOGRAPHIC HEADLINE</span>
                    <h3 className="text-base lg:text-xl font-extrabold mt-1" dir="auto">
                      {activeOutputData.content.headline}
                    </h3>
                  </div>
                )}

                <div className="infographic-metrics" aria-label="Infographic source metrics">
                  <div><strong>{activeOutputData.claims_used?.length || 0}</strong><span>CLAIMS TRACED</span></div>
                  <div><strong>{chunks?.length || 0}</strong><span>SOURCE CHUNKS</span></div>
                  <div><strong>{activeOutputData.content?.key_messages?.length || 0}</strong><span>KEY MESSAGES</span></div>
                </div>

                {/* Key Messages Grid */}
                {activeOutputData.content?.key_messages && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {activeOutputData.content.key_messages.map((msg: string, i: number) => (
                    <div key={i} style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }} className="result-reveal bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-800 flex items-start gap-3 shadow-xs interactive-hover">
                        <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-cyan-100 text-cyan-900 font-extrabold font-mono shrink-0 border border-cyan-200">
                          0{i + 1}
                        </span>
                        <p className="leading-relaxed font-medium mt-0.5" dir="auto">{msg}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Layout Recommendation */}
                {activeOutputData.content?.layout_recommendation && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-cyan-600" /> Visual Layout & Asset Recommendations
                    </h4>
                    <p className="text-slate-700 leading-relaxed font-sans" dir="auto">{activeOutputData.content.layout_recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. VIDEO PACKAGE */}
          {activeTab === 'video_package' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-rose-50/70 p-3 rounded-xl border border-rose-100">
                <span className="flex items-center gap-2 text-xs font-extrabold text-rose-900 uppercase tracking-wider">
                  <div className="p-1.5 rounded-md bg-rose-600 text-white">
                    <Video className="h-4 w-4" />
                  </div>
                  <span>Complete Video Production Package</span>
                </span>
                <div className="flex items-center gap-2">
                  <GroundingBadge claimsUsed={activeOutputData.claims_used} validChunkIds={validChunkIds} />
                  {submissionId && (
                    <MagneticButton
                      id="download-video-package-btn"
                      onClick={() => triggerDownload('video_package')}
                      disabled={downloadingKey === 'video_package'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 interactive-hover"
                    >
                      {downloadingKey === 'video_package' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-slate-500" />}
                      <span>{downloadingKey === 'video_package' ? '…' : 'Download'}</span>
                    </MagneticButton>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {/* Script */}
                {activeOutputData.content?.script && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-rose-600" /> Narration Voiceover Script
                    </h4>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs lg:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-xs" dir="auto">
                      {activeOutputData.content.script}
                    </div>
                  </div>
                )}

                {/* Storyboard Timeline */}
                {activeOutputData.content?.storyboard && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Video className="h-4 w-4 text-rose-600" /> Scene Storyboard Sequence
                    </h4>
                  <div className="video-filmstrip" aria-hidden="true">
                    {Array.from({ length: 10 }, (_, frame) => <span key={frame} />)}
                  </div>
                  <div className="space-y-3">
                    {activeOutputData.content.storyboard.map((scene: any, i: number) => (
                      <div key={i} data-timecode={`00:${String(i * 8).padStart(2, '0')}`} style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }} className="video-scene-card result-reveal bg-white p-4 rounded-xl border border-slate-200 text-xs grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xs interactive-hover">
                          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
                            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px] block mb-2 w-max">
                              {scene.scene || `Scene ${i+1}`}
                            </span>
                            <p className="text-slate-600 text-[11px] leading-relaxed" dir="auto">
                              <strong>Visual:</strong> {scene.visual_description}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Narration Audio</span>
                            <p className="text-slate-800 leading-relaxed font-semibold italic text-xs lg:text-sm" dir="auto">
                              &ldquo;{scene.narration}&rdquo;
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Traceability Section Under Active Output */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" />
                Source Chunks Used:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeOutputData.claims_used?.map((cid: string) => (
                  <button
                    key={cid}
                    onClick={(event) => onChunkClick?.(cid, event.currentTarget)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-mono font-bold border border-indigo-200 transition shadow-2xs hover:scale-105 cursor-pointer"
                    title="Click to highlight original source chunk in Audit panel"
                  >
                    {cid}
                  </button>
                )) || <span className="text-xs text-slate-400 font-mono">c1</span>}
              </div>
            </div>

            <span className="text-[11px] text-slate-400 italic">
              Click any chunk tag to inspect its source passage in the Evidence Explorer below
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
