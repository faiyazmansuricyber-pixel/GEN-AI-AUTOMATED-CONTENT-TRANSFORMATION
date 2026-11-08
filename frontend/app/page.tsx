"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SectionMotion from '@/components/SectionMotion';
import CursorGlow from '@/components/CursorGlow';
import StatsStrip from '@/components/StatsStrip';
import IngestionPanel, { IngestParameters } from '@/components/IngestionPanel';
import AnalysisView, { AnalysisData } from '@/components/AnalysisView';
import OutputView from '@/components/OutputView';
import SourceTraceability, { SourceChunk } from '@/components/SourceTraceability';
import SubmissionsHistory from '@/components/SubmissionsHistory';
import ErrorBanner from '@/components/ErrorBanner';
import { useReducedMotion } from '@/lib/hooks';

const API_BASE = "http://127.0.0.1:8000/api";

interface SubmissionData {
  id: string;
  raw_text?: string;
  chunks?: SourceChunk[];
  analysis?: AnalysisData | null;
  outputs?: Record<string, unknown>;
}

export default function Home() {
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [chunks, setChunks] = useState<SourceChunk[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [outputs, setOutputs] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [apiError, setApiError] = useState<{ error: string; message: string } | null>(null);
  
  const [backendStatus, setBackendStatus] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>('gemini-3.6-flash');
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [statsTrigger, setStatsTrigger] = useState<number>(0);
  const [beamRequest, setBeamRequest] = useState<{
    id: number;
    chunkId: string;
    sourceElement: HTMLElement;
  } | null>(null);
  const [evidenceBeam, setEvidenceBeam] = useState<{
    path: string;
    width: number;
    height: number;
    targetX: number;
    targetY: number;
  } | null>(null);
  const [glowingChunkId, setGlowingChunkId] = useState<string | null>(null);
  const beamRequestId = useRef(0);
  const reducedMotion = useReducedMotion();

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        setBackendStatus(true);
        const data = await res.json();
        if (data.gemini_model) {
          setModelName(data.gemini_model);
        }
      } else {
        setBackendStatus(false);
      }
    } catch {
      setBackendStatus(false);
    }
  }, []);

  // Check health status on mount
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([]);

  useEffect(() => {
    if (reducedMotion) {
      setEvidenceBeam(null);
      setGlowingChunkId(null);
      return;
    }
    if (!beamRequest) return;

    let frame = 0;
    let removeTimer = 0;
    const showTimer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        const target = Array.from(
          document.querySelectorAll<HTMLElement>('[data-chunk-id]')
        ).find((element) => element.dataset.chunkId === beamRequest.chunkId);
        if (!target) return;

        const sourceBounds = beamRequest.sourceElement.getBoundingClientRect();
        const targetBounds = target.getBoundingClientRect();
        const startX = sourceBounds.left + sourceBounds.width / 2;
        const startY = sourceBounds.top + sourceBounds.height / 2;
        const targetX = targetBounds.left + targetBounds.width / 2;
        const targetY = targetBounds.top + targetBounds.height / 2;
        const controlX = (startX + targetX) / 2;
        const path = `M ${startX} ${startY} C ${controlX} ${startY - 70}, ${controlX} ${targetY - 70}, ${targetX} ${targetY}`;

        setEvidenceBeam({
          path,
          width: window.innerWidth,
          height: window.innerHeight,
          targetX,
          targetY
        });
        setGlowingChunkId(beamRequest.chunkId);
        removeTimer = window.setTimeout(() => {
          setEvidenceBeam(null);
          setGlowingChunkId(null);
        }, 1200);
      });
    }, 320);

    return () => {
      window.clearTimeout(showTimer);
      if (frame) window.cancelAnimationFrame(frame);
      if (removeTimer) window.clearTimeout(removeTimer);
    };
  }, [beamRequest, reducedMotion]);

  const handleChunkClick = (chunkId: string, sourceElement?: HTMLElement) => {
    setHighlightedChunkId(chunkId);
    if (!sourceElement || reducedMotion) return;
    setEvidenceBeam(null);
    setGlowingChunkId(null);
    setBeamRequest({
      id: ++beamRequestId.current,
      chunkId,
      sourceElement
    });
  };

  const applySubmissionData = (data: SubmissionData) => {
    setSubmissionId(data.id);
    setRawText(data.raw_text || '');
    setChunks(data.chunks || []);
    setAnalysis(data.analysis || null);
    setOutputs(data.outputs || {});
    setErrors({});
    setSelectedOutputs([]);
    setStatsTrigger((prev) => prev + 1);
  };

  const handleTransformSubmit = async (
    inputData: { text?: string; file?: File },
    userSelectedOutputs: string[],
    parameters: IngestParameters
  ) => {
    setIsLoading(true);
    setApiError(null);
    setHighlightedChunkId(null);
    setSelectedOutputs(userSelectedOutputs);
    setAnalysis(null);
    setOutputs({});
    setErrors({});

    try {
      // Step 1: Ingestion
      setLoadingStep('Ingesting text / multi-modal file...');
      
      let ingestRes;
      if (inputData.file) {
        const formData = new FormData();
        formData.append('file', inputData.file);
        ingestRes = await fetch(`${API_BASE}/ingest`, {
          method: 'POST',
          body: formData
        });
      } else {
        const formData = new FormData();
        formData.append('text', inputData.text || '');
        ingestRes = await fetch(`${API_BASE}/ingest`, {
          method: 'POST',
          body: formData
        });
      }

      if (!ingestRes.ok) {
        const errJson = await ingestRes.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.detail || `Ingestion failed (HTTP ${ingestRes.status})`);
      }

      const ingestData = await ingestRes.json();
      setSubmissionId(ingestData.submission_id);
      setChunks(ingestData.chunks || []);
      setRawText(ingestData.raw_text || '');

      // Step 2: Gemini Analysis
      setLoadingStep('Extracting structured intelligence with Gemini 3 Flash...');
      const analyzeRes = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: ingestData.submission_id,
          chunks: ingestData.chunks
        })
      });

      if (!analyzeRes.ok) {
        const errJson = await analyzeRes.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.detail || `Analysis failed (HTTP ${analyzeRes.status})`);
      }

      const analyzeData: AnalysisData = await analyzeRes.json();
      setAnalysis(analyzeData);

      // Step 3: Parallel Deliverable Generation
      setLoadingStep(`Concurrently generating ${userSelectedOutputs.length} output deliverables...`);
      const generateRes = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: ingestData.submission_id,
          selected_output_types: userSelectedOutputs,
          parameters: parameters
        })
      });

      if (!generateRes.ok) {
        const errJson = await generateRes.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.detail || `Generation failed (HTTP ${generateRes.status})`);
      }

      const generateData = await generateRes.json();
      setOutputs(generateData.outputs || {});
      setErrors(generateData.errors || {});
      setStatsTrigger((prev) => prev + 1);

    } catch (err: unknown) {
      console.error("Transformation Error:", err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred during content transformation.";
      setApiError({
        error: "Execution Error",
        message
      });
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleSelectSubmission = async (subId: string) => {
    setIsLoading(true);
    setLoadingStep('Loading past submission...');
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/submissions/${subId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to fetch submission ${subId}`);
      }
      const data: SubmissionData = await res.json();
      applySubmissionData(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not retrieve historical submission.";
      setApiError({
        error: "Load Failed",
        message
      });
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleLoadDemo = async () => {
    setIsLoading(true);
    setLoadingStep('Loading demo result...');
    setApiError(null);
    let demoSourceError: string | null = null;

    try {
      let demoData: SubmissionData | null = null;
      try {
        const demoResponse = await fetch('/demo/demo-result.json');
        if (demoResponse.ok) {
          const candidate: SubmissionData = await demoResponse.json();
          if (candidate && typeof candidate.id === 'string') {
            demoData = candidate;
          } else {
            demoSourceError = 'The saved demo result does not contain a submission ID.';
          }
        }
      } catch (err: unknown) {
        demoSourceError = err instanceof Error ? err.message : 'The saved demo result could not be read.';
      }

      if (demoData) {
        applySubmissionData(demoData);
        return;
      }

      const listResponse = await fetch(`${API_BASE}/submissions`);
      if (!listResponse.ok) {
        throw new Error(`Failed to load past submissions (HTTP ${listResponse.status}).`);
      }
      const submissions: Array<{ id: string }> = await listResponse.json();
      if (!Array.isArray(submissions) || submissions.length === 0) {
        throw new Error('No saved demo result or past submissions are available.');
      }

      const latestResponse = await fetch(`${API_BASE}/submissions/${submissions[0].id}`);
      if (!latestResponse.ok) {
        throw new Error(`Failed to load the most recent past submission (HTTP ${latestResponse.status}).`);
      }
      const latestSubmission: SubmissionData = await latestResponse.json();
      if (typeof latestSubmission.id !== 'string') {
        throw new Error('The most recent past submission is missing its ID.');
      }
      applySubmissionData(latestSubmission);
    } catch (err: unknown) {
      const fallbackMessage = err instanceof Error ? err.message : 'Could not load a saved result.';
      setApiError({
        error: 'Load Failed',
        message: demoSourceError
          ? `${fallbackMessage} Saved demo file error: ${demoSourceError}`
          : fallbackMessage
      });
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="editorial-shell relative isolate min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      <CursorGlow />
      {/* Header Navbar */}
      <Header
        onOpenHistory={() => setHistoryOpen(true)}
        onLoadDemo={handleLoadDemo}
        backendStatus={backendStatus}
        modelName={modelName}
      />

      <Hero />
      <SectionMotion />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {/* Error Notification */}
        <ErrorBanner error={apiError} onDismiss={() => setApiError(null)} />

        {/* Stats Strip */}
        <StatsStrip refreshTrigger={statsTrigger} />

        {/* Input & Options Form */}
        <section id="workspace" className="scroll-mt-28">
        <IngestionPanel
          onSubmit={handleTransformSubmit}
          isLoading={isLoading}
          loadingStep={loadingStep}
        />
        </section>

        {/* Analysis Results */}
        <section id="analysis" className="scroll-mt-28">
        <AnalysisView
          analysis={analysis}
          isLoading={isLoading}
          onChunkClick={handleChunkClick}
        />
        </section>

        {/* Deliverables Output Tabs */}
        <section id="outputs" className="scroll-mt-28">
        <OutputView
          outputs={outputs}
          errors={errors}
          selectedOutputs={selectedOutputs}
          isLoading={isLoading}
          onChunkClick={handleChunkClick}
          submissionId={submissionId || undefined}
          chunks={chunks}
        />
        </section>

        {/* Source Traceability & Audit Panel */}
        <section id="sources" className="scroll-mt-28">
        <SourceTraceability
          chunks={chunks}
          highlightedChunkId={highlightedChunkId}
          glowingChunkId={glowingChunkId}
          onClearHighlight={() => setHighlightedChunkId(null)}
          rawText={rawText}
        />
        </section>
      </main>

      {evidenceBeam && (
        <svg
          className="evidence-beam-overlay"
          viewBox={`0 0 ${evidenceBeam.width} ${evidenceBeam.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="evidence-beam-gradient" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <path className="evidence-beam-line" d={evidenceBeam.path} />
          <circle
            className="evidence-beam-pulse"
            cx={evidenceBeam.targetX}
            cy={evidenceBeam.targetY}
            r="12"
          />
        </svg>
      )}

      {/* Historical Submissions Drawer */}
      <SubmissionsHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectSubmission={handleSelectSubmission}
      />

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 bg-white/80 py-6 text-center text-xs text-slate-500 backdrop-blur-xs mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-slate-600">
            SIH 2026 | PS 26154 | Team Cyphers — Content Transformation Platform
          </p>
          <p className="text-[11px] text-slate-400">
            Powered by Google Gemini 3 Flash API & Multimodal AI Architecture
          </p>
        </div>
      </footer>
    </div>
  );
}
