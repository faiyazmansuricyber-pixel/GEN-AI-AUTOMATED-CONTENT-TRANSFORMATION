"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import StatsStrip from '@/components/StatsStrip';
import IngestionPanel, { IngestParameters } from '@/components/IngestionPanel';
import AnalysisView, { AnalysisData } from '@/components/AnalysisView';
import OutputView from '@/components/OutputView';
import SourceTraceability, { SourceChunk } from '@/components/SourceTraceability';
import SubmissionsHistory from '@/components/SubmissionsHistory';
import ErrorBanner from '@/components/ErrorBanner';

const API_BASE = "http://127.0.0.1:8000/api";

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
      const data = await res.json();
      setSubmissionId(data.id);
      setRawText(data.raw_text || '');
      setChunks(data.chunks || []);
      setAnalysis(data.analysis || null);
      setOutputs(data.outputs || {});
      setErrors({});
      setSelectedOutputs([]);
      setStatsTrigger((prev) => prev + 1);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header Navbar */}
      <Header
        onOpenHistory={() => setHistoryOpen(true)}
        backendStatus={backendStatus}
        modelName={modelName}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {/* Error Notification */}
        <ErrorBanner error={apiError} onDismiss={() => setApiError(null)} />

        {/* Stats Strip */}
        <StatsStrip refreshTrigger={statsTrigger} />

        {/* Input & Options Form */}
        <IngestionPanel
          onSubmit={handleTransformSubmit}
          isLoading={isLoading}
          loadingStep={loadingStep}
        />

        {/* Analysis Results */}
        <AnalysisView
          analysis={analysis}
          isLoading={isLoading}
          onChunkClick={(cid) => setHighlightedChunkId(cid)}
        />

        {/* Deliverables Output Tabs */}
        <OutputView
          outputs={outputs}
          errors={errors}
          selectedOutputs={selectedOutputs}
          isLoading={isLoading}
          onChunkClick={(cid) => setHighlightedChunkId(cid)}
          submissionId={submissionId || undefined}
          chunks={chunks}
        />

        {/* Source Traceability & Audit Panel */}
        <SourceTraceability
          chunks={chunks}
          highlightedChunkId={highlightedChunkId}
          onClearHighlight={() => setHighlightedChunkId(null)}
          rawText={rawText}
        />
      </main>

      {/* Historical Submissions Drawer */}
      <SubmissionsHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectSubmission={handleSelectSubmission}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/80 py-6 text-center text-xs text-slate-500 backdrop-blur-xs mt-8">
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

