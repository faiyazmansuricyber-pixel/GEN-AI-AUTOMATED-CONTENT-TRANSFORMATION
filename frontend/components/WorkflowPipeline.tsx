import { Check, Circle, Loader2, X } from 'lucide-react';

export type WorkflowStep = 'ingest' | 'analysis' | 'generation';
export type WorkflowState = WorkflowStep | 'idle' | 'ready' | 'complete' | 'failed';

interface WorkflowPipelineProps {
  state: WorkflowState;
  completed: WorkflowStep[];
  failedStep?: WorkflowStep | null;
  detail?: string;
}

const STEPS: Array<{ id: WorkflowStep; label: string; detail: string }> = [
  { id: 'ingest', label: 'Source', detail: 'Ingest and segment' },
  { id: 'analysis', label: 'Intelligence', detail: 'Analyze and map claims' },
  { id: 'generation', label: 'Deliverables', detail: 'Generate selected formats' }
];

export default function WorkflowPipeline({
  state,
  completed,
  failedStep,
  detail
}: WorkflowPipelineProps) {
  return (
    <section
      className="mb-6 rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm sm:px-5"
      aria-label="Transformation workflow status"
      aria-live={state === 'idle' || state === 'ready' ? 'off' : 'polite'}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Processing pipeline</p>
          <p className="mt-1 text-xs font-semibold text-slate-800">
            {detail || (state === 'idle'
              ? 'Add a source to begin a transformation.'
              : state === 'ready'
                ? 'Source and analysis are ready for review.'
                : state === 'complete'
                  ? 'Requested deliverables are ready to review.'
                  : state === 'failed'
                    ? 'A workflow step needs attention.'
                    : `Working on ${STEPS.find((step) => step.id === state)?.label.toLowerCase()}…`)}
          </p>
        </div>
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-label="Workflow steps">
          {STEPS.map((step, index) => {
            const isComplete = completed.includes(step.id) || state === 'complete';
            const isFailed = state === 'failed' && failedStep === step.id;
            const isActive = state === step.id;
            return (
              <li key={step.id} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden="true" className="hidden h-px w-5 bg-slate-200 sm:block" />}
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                  isComplete
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : isFailed
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : isActive
                        ? 'border-violet-300 bg-violet-50 text-violet-700'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}>
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : isFailed ? <X className="h-3.5 w-3.5" /> : isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-3 w-3" />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[11px] font-bold ${isFailed ? 'text-rose-800' : isComplete ? 'text-emerald-800' : isActive ? 'text-violet-800' : 'text-slate-600'}`}>
                    {step.label}
                  </span>
                  <span className="hidden text-[9px] text-slate-500 sm:block">{step.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
