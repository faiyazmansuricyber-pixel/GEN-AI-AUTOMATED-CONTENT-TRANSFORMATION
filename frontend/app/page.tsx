"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SectionMotion from '@/components/SectionMotion';
import CursorGlow from '@/components/CursorGlow';
import StatsStrip from '@/components/StatsStrip';
import IngestionPanel, { type IngestParameters } from '@/components/IngestionPanel';
import AnalysisView, { type AnalysisData } from '@/components/AnalysisView';
import OutputView from '@/components/OutputView';
import SourceTraceability, { type SourceChunk } from '@/components/SourceTraceability';
import SubmissionsHistory from '@/components/SubmissionsHistory';
import ErrorBanner from '@/components/ErrorBanner';
import WorkflowPipeline, { type WorkflowState, type WorkflowStep } from '@/components/WorkflowPipeline';
import { useReducedMotion } from '@/lib/hooks';
import { API_BASE } from '@/lib/api';

interface SubmissionData {
  id: string;
  raw_text?: string;
  chunks?: SourceChunk[];
  analysis?: AnalysisData | null;
  outputs?: Record<string, unknown>;
  parameters?: Partial<IngestParameters> | null;
}

const DEFAULT_GENERATION_PARAMETERS: IngestParameters = {
  tone: 'formal',
  audience: 'general',
  language: 'English',
  detail_level: 'medium',
  objective: 'inform',
  style: 'professional'
};

export default function Home() {
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [loadedSubmissionVersion, setLoadedSubmissionVersion] = useState(0);
  const [rawText, setRawText] = useState<string>('');
  const [chunks, setChunks] = useState<SourceChunk[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [outputs, setOutputs] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [apiError, setApiError] = useState<{ error: string; message: string } | null>(null);
  
  const [backendStatus, setBackendStatus] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string>('gemini-3.6-flash');
  const [generationParameters, setGenerationParameters] = useState<IngestParameters>(DEFAULT_GENERATION_PARAMETERS);
  const [workflowState, setWorkflowState] = useState<WorkflowState>('idle');
  const [completedWorkflowSteps, setCompletedWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [failedWorkflowStep, setFailedWorkflowStep] = useState<WorkflowStep | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [regeneratingOutput, setRegeneratingOutput] = useState<string | null>(null);
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

  const checkHealth = useCallback(async (controller: AbortController) => {
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 5000);
    try {
      const res = await fetch(`${API_BASE}/health`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Backend health check returned HTTP ${res.status}.`);
      }
      const data: {
        status?: string;
        gemini_model?: string;
        gemini_configured?: boolean;
        message?: string;
      } = await res.json();
      if (controller.signal.aborted) return;
      if (data.status !== 'ok') {
        throw new Error(data.message || 'Backend returned an unhealthy status.');
      }

      setBackendStatus(true);
      if (data.gemini_model) setModelName(data.gemini_model);
      setBackendError(
        data.gemini_configured === false
          ? 'The backend is reachable, but Gemini is not configured. Set GEMINI_API_KEY in backend/.env and restart the backend.'
          : null
      );
    } catch (error: unknown) {
      if (controller.signal.aborted && !timedOut) return;
      setBackendStatus(false);
      setBackendError(
        timedOut
          ? 'The backend health check timed out.'
          : error instanceof TypeError
            ? `Could not reach ${API_BASE}/health. Start the backend with start_all.bat and check its server window.`
            : error instanceof Error
              ? error.message
              : 'The backend health check failed.'
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  // Check health status on mount
  useEffect(() => {
    let disposed = false;
    let retryTimer = 0;
    let activeController: AbortController | null = null;

    const checkAndScheduleRetry = async () => {
      const controller = new AbortController();
      activeController = controller;
      await checkHealth(controller);
      if (activeController === controller) activeController = null;

      if (!disposed) {
        retryTimer = window.setTimeout(checkAndScheduleRetry, 15000);
      }
    };

    void checkAndScheduleRetry();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      activeController?.abort();
    };
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
    setLoadedSubmissionVersion((version) => version + 1);
    setRawText(data.raw_text || '');
    setChunks(data.chunks || []);
    setAnalysis(data.analysis || null);
    setOutputs(data.outputs || {});
    setGenerationParameters({ ...DEFAULT_GENERATION_PARAMETERS, ...data.parameters });
    setErrors({});
    setSelectedOutputs([]);
    setHighlightedChunkId(null);
    setBeamRequest(null);
    setEvidenceBeam(null);
    setGlowingChunkId(null);
    const completed = [
      ...(data.raw_text || data.chunks?.length ? ['ingest' as const] : []),
      ...(data.analysis ? ['analysis' as const] : []),
      ...(Object.keys(data.outputs || {}).length ? ['generation' as const] : [])
    ];
    setCompletedWorkflowSteps(completed);
    setFailedWorkflowStep(null);
    setWorkflowState(Object.keys(data.outputs || {}).length ? 'complete' : data.analysis ? 'ready' : completed.length ? 'ready' : 'idle');
    setSourceName('Saved submission');
    setStatsTrigger((prev) => prev + 1);
  };

  const handleTransformSubmit = async (
    inputData: { text?: string; file?: File },
    userSelectedOutputs: string[],
    parameters: IngestParameters
  ) => {
    setIsLoading(true);
    let activeStage: WorkflowStep = 'ingest';
    setWorkflowState('ingest');
    setCompletedWorkflowSteps([]);
    setFailedWorkflowStep(null);
    setSourceName(inputData.file?.name || (inputData.text ? 'Pasted text' : null));
    setGenerationParameters(parameters);
    setApiError(null);
    setHighlightedChunkId(null);
    setSubmissionId(null);
    setRawText('');
    setChunks([]);
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
      setCompletedWorkflowSteps(['ingest']);

      // Step 2: Gemini Analysis
      activeStage = 'analysis';
      setWorkflowState('analysis');
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
      setCompletedWorkflowSteps(['ingest', 'analysis']);

      // Step 3: Parallel Deliverable Generation
      activeStage = 'generation';
      setWorkflowState('generation');
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
      if (Object.keys(generateData.errors || {}).length) {
        setWorkflowState('failed');
        setFailedWorkflowStep('generation');
      } else {
        setCompletedWorkflowSteps(['ingest', 'analysis', 'generation']);
        setWorkflowState('complete');
      }

    } catch (err: unknown) {
      console.error("Transformation Error:", err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred during content transformation.";
      setWorkflowState('failed');
      setFailedWorkflowStep(activeStage);
      setApiError({
        error: "Execution Error",
        message
      });
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleRegenerateOutput = async (outputType: string) => {
    if (!submissionId || !analysis || regeneratingOutput) return;
    setRegeneratingOutput(outputType);
    setWorkflowState('generation');
    setCompletedWorkflowSteps(['ingest', 'analysis']);
    setFailedWorkflowStep(null);
    setApiError(null);
    setErrors((previous) => {
      const next = { ...previous };
      delete next[outputType];
      return next;
    });

    try {
      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          selected_output_types: [outputType],
          parameters: generationParameters
        })
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || errorBody.detail || `Regeneration failed (HTTP ${response.status}).`);
      }

      const result: { outputs?: Record<string, unknown>; errors?: Record<string, string> } = await response.json();
      if (result.errors?.[outputType]) throw new Error(result.errors[outputType]);
      if (!result.outputs?.[outputType]) throw new Error(`The API did not return a regenerated ${outputType} output.`);
      setOutputs((previous) => ({ ...previous, [outputType]: result.outputs![outputType] }));
      setWorkflowState('complete');
      setCompletedWorkflowSteps(['ingest', 'analysis', 'generation']);
      setStatsTrigger((previous) => previous + 1);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Could not regenerate ${outputType}.`;
      setErrors((previous) => ({ ...previous, [outputType]: message }));
      setWorkflowState('failed');
      setFailedWorkflowStep('generation');
      setApiError({ error: 'Regeneration Failed', message });
    } finally {
      setRegeneratingOutput(null);
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
        backendError={backendError}
        modelName={modelName}
      />
      <Hero />
      <SectionMotion />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {/* Error Notification */}
        <ErrorBanner error={apiError} onDismiss={() => setApiError(null)} />

        <WorkflowPipeline
          state={workflowState}
          completed={completedWorkflowSteps}
          failedStep={failedWorkflowStep}
          detail={isLoading ? loadingStep : regeneratingOutput ? `Regenerating ${regeneratingOutput.replace(/_/g, ' ')}…` : undefined}
        />

        {sourceName && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-xs">
            <span className="text-slate-500">Current source</span>
            <span className="max-w-full truncate font-semibold text-slate-800" title={sourceName}>{sourceName}</span>
            <span className="font-mono text-[10px] text-slate-500">
              {submissionId ? `Session ${submissionId.slice(0, 8)}` : 'Preparing session'}
            </span>
          </div>
        )}

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
            editContextKey={loadedSubmissionVersion}
            chunks={chunks}
            onRegenerate={handleRegenerateOutput}
            regeneratingOutput={regeneratingOutput}
            canRegenerate={Boolean(analysis && submissionId) && !isLoading}
          />
        </section>

        {/* Source Traceability & Audit Panel */}
        <section id="sources" className="scroll-mt-28">
          <SourceTraceability
            chunks={chunks}
            analysis={analysis}
            highlightedChunkId={highlightedChunkId}
            glowingChunkId={glowingChunkId}
            onClearHighlight={() => setHighlightedChunkId(null)}
            onChunkClick={handleChunkClick}
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
